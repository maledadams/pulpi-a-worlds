import { createServerFn } from "@tanstack/react-start";
import { onceReady } from "@/lib/once-ready";
import { z } from "zod";
import { enforceAdminAccess } from "@/lib/admin-access";
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";
import {
  LEGACY_SURVEY_ID,
  LEGACY_SURVEY_QUESTIONS,
  type AdminSurveyAnswer,
  type AnswerDevice,
  type SurveyAnswers,
  type SurveyDevice,
  type SurveyQuestion,
  type SurveyStatus,
  type SurveySummary,
  SURVEY_DEVICE_LABEL,
  classifyDevice,
  endOfDayInSantoDomingo,
  feedbackTokenSubject,
  findOpenConflict,
  legacyAnswersFromRow,
  submitSurveyInputSchema,
  surveyEditSchema,
  surveyMatchesDevice,
  toIsoUtc,
  validateSurveyAnswers,
} from "@/lib/order-feedback-shared";

// Encuestas: storage and server functions (spec 2026-11-16-survey-builder-design).

type WorkerEnv = { DB?: D1Database; ORDER_CONFIRM_SECRET?: string };

async function getWorkerEnv() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return ((workerModule as { env?: WorkerEnv }).env ?? {}) as WorkerEnv;
  } catch {
    return {} as WorkerEnv;
  }
}

async function getSecret() {
  const workerEnv = await getWorkerEnv();
  return workerEnv.ORDER_CONFIRM_SECRET ?? process.env.ORDER_CONFIRM_SECRET ?? "";
}

async function getDb() {
  return (await getWorkerEnv()).DB ?? null;
}

async function noStore() {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "private, no-store");
}


const ensureSurveyStorageReady = onceReady(async (db: D1Database) => {
      await db.batch([
        db.prepare(
          `CREATE TABLE IF NOT EXISTS order_feedback (
            id TEXT PRIMARY KEY,
            inquiry_id TEXT NOT NULL UNIQUE,
            ratings_json TEXT NOT NULL,
            note TEXT NOT NULL DEFAULT '',
            device TEXT NOT NULL,
            created_at TEXT NOT NULL
          )`,
        ),
        db.prepare(
          `CREATE TABLE IF NOT EXISTS surveys (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            device TEXT NOT NULL,
            status TEXT NOT NULL,
            opened_at TEXT,
            closed_at TEXT,
            ends_at TEXT,
            created_at TEXT NOT NULL
          )`,
        ),
        db.prepare(
          `CREATE TABLE IF NOT EXISTS survey_questions (
            id TEXT PRIMARY KEY,
            survey_id TEXT NOT NULL,
            kind TEXT NOT NULL,
            label TEXT NOT NULL,
            position INTEGER NOT NULL
          )`,
        ),
        db.prepare(
          "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
        ),
        // Survey start marker: orders created before this never saw a survey (see unanswered query).
        db
          .prepare(
            "INSERT INTO app_settings (key, value_json) VALUES ('order_feedback_started_at', ?) ON CONFLICT(key) DO NOTHING",
          )
          .bind(JSON.stringify(new Date().toISOString())),
      ]);
      // Columns added when the survey builder replaced the fixed questions.
      for (const statement of [
        "ALTER TABLE order_feedback ADD COLUMN survey_id TEXT",
        "ALTER TABLE order_feedback ADD COLUMN answers_json TEXT",
      ]) {
        try {
          await db.exec(statement);
        } catch {
          // Column already exists.
        }
      }
      await migrateLegacySurvey(db);
});

// The first, hard-coded survey becomes "Encuesta 1" (open, for every device)
// and its answers are moved onto it. Idempotent and safe to run twice at once
// (dev loads this module twice): fixed ids + ON CONFLICT DO NOTHING, and old
// rows are only touched while survey_id is still NULL.
async function migrateLegacySurvey(db: D1Database) {
  const surveyCount = await db.prepare("SELECT COUNT(*) AS count FROM surveys").first<{ count: number }>();
  const legacyRows = await db
    .prepare("SELECT id, ratings_json, note FROM order_feedback WHERE survey_id IS NULL")
    .all<{ id: string; ratings_json: string; note: string }>();
  const rows = legacyRows.results ?? [];
  if ((surveyCount?.count ?? 0) > 0 && rows.length === 0) return;

  const marker = await db
    .prepare("SELECT value_json FROM app_settings WHERE key = 'order_feedback_started_at'")
    .first<{ value_json: string }>();
  let openedAt = new Date().toISOString();
  try {
    const parsed = marker ? JSON.parse(marker.value_json) : null;
    if (typeof parsed === "string" && !Number.isNaN(Date.parse(parsed))) openedAt = parsed;
  } catch {
    // Keep "now".
  }

  const statements: D1PreparedStatement[] = [];
  if ((surveyCount?.count ?? 0) === 0) {
    statements.push(
      db
        .prepare(
          `INSERT INTO surveys (id, title, device, status, opened_at, closed_at, ends_at, created_at)
           VALUES (?, 'Encuesta 1', 'all', 'open', ?, NULL, NULL, ?) ON CONFLICT(id) DO NOTHING`,
        )
        .bind(LEGACY_SURVEY_ID, openedAt, openedAt),
      ...LEGACY_SURVEY_QUESTIONS.map((question, index) =>
        db
          .prepare(
            "INSERT INTO survey_questions (id, survey_id, kind, label, position) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING",
          )
          .bind(question.id, LEGACY_SURVEY_ID, question.kind, question.label, index),
      ),
    );
  }
  for (const row of rows) {
    statements.push(
      db
        .prepare("UPDATE order_feedback SET survey_id = ?, answers_json = ? WHERE id = ? AND survey_id IS NULL")
        .bind(LEGACY_SURVEY_ID, JSON.stringify(legacyAnswersFromRow(row.ratings_json, row.note)), row.id),
    );
  }
  if (statements.length > 0) await db.batch(statements);
}

// An open encuesta whose end date has passed is closed the next time anything
// reads encuestas - no cron needed.
async function closeExpiredSurveys(db: D1Database) {
  await db
    .prepare(
      `UPDATE surveys SET status = 'closed', closed_at = ends_at
       WHERE status = 'open' AND ends_at IS NOT NULL AND julianday(ends_at) <= julianday('now')`,
    )
    .run();
}

type SurveyRow = {
  id: string;
  title: string;
  device: string;
  status: string;
  opened_at: string | null;
  closed_at: string | null;
  ends_at: string | null;
  created_at: string;
  answer_count?: number;
};

function toSurveySummary(row: SurveyRow): SurveySummary {
  const device: SurveyDevice = row.device === "phone" || row.device === "desktop" ? row.device : "all";
  const status: SurveyStatus = row.status === "open" || row.status === "closed" ? row.status : "draft";
  return {
    id: row.id,
    title: row.title,
    device,
    status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    answerCount: row.answer_count ?? 0,
  };
}

async function listSurveys(db: D1Database) {
  const rows = await db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM order_feedback f WHERE f.survey_id = s.id) AS answer_count
       FROM surveys s
       ORDER BY CASE s.status WHEN 'open' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
                julianday(COALESCE(s.opened_at, s.created_at)) DESC`,
    )
    .all<SurveyRow>();
  return (rows.results ?? []).map(toSurveySummary);
}

async function loadSurvey(db: D1Database, id: string) {
  const row = await db
    .prepare(
      `SELECT s.*, (SELECT COUNT(*) FROM order_feedback f WHERE f.survey_id = s.id) AS answer_count
       FROM surveys s WHERE s.id = ?`,
    )
    .bind(id)
    .first<SurveyRow>();
  if (!row) return null;
  const questions = await db
    .prepare("SELECT id, kind, label FROM survey_questions WHERE survey_id = ? ORDER BY position")
    .bind(id)
    .all<{ id: string; kind: string; label: string }>();
  return {
    survey: toSurveySummary(row),
    questions: (questions.results ?? []).map(
      (question): SurveyQuestion => ({
        id: question.id,
        kind: question.kind === "text" ? "text" : "rating",
        label: question.label,
      }),
    ),
  };
}

// Called from submitManualOrder. Returns "" (survey hidden) when no secret is configured.
export async function createOrderFeedbackToken(orderId: string) {
  const secret = await getSecret();
  if (!secret) return "";
  try {
    const db = await getDb();
    if (db) await ensureSurveyStorageReady(db);
  } catch {
    // Never let the survey storage block order creation.
  }
  return signOrderConfirmToken(feedbackTokenSubject(orderId), secret);
}

// Deleting an order deletes its survey answer too. Returned as a statement so
// deleteOrderInternal can run it in the same batch as the order delete.
export async function prepareOrderFeedbackDelete(db: D1Database, orderId: string) {
  await ensureSurveyStorageReady(db);
  return db.prepare("DELETE FROM order_feedback WHERE inquiry_id = ?").bind(orderId);
}

// ---------------------------------------------------------------- customer

export const getActiveSurvey = createServerFn({ method: "GET" })
  .inputValidator((data: { viewportWidth: number }) =>
    z.object({ viewportWidth: z.number().int().min(0).max(10000) }).parse(data),
  )
  .handler(async ({ data }) => {
    await noStore();
    const db = await getDb();
    if (!db) return null;
    await ensureSurveyStorageReady(db);
    await closeExpiredSurveys(db);
    const device = classifyDevice(data.viewportWidth);
    const open = (await listSurveys(db)).find(
      (survey) => survey.status === "open" && surveyMatchesDevice(survey.device, device),
    );
    if (!open) return null;
    const loaded = await loadSurvey(db, open.id);
    if (!loaded || loaded.questions.length === 0) return null;
    return { id: loaded.survey.id, title: loaded.survey.title, questions: loaded.questions };
  });

export const submitOrderFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof submitSurveyInputSchema>) => submitSurveyInputSchema.parse(data))
  .handler(async ({ data }) => {
    await noStore();

    const secret = await getSecret();
    const valid = secret
      ? await verifyOrderConfirmToken(feedbackTokenSubject(data.orderId), data.token, secret)
      : false;
    if (!valid) return { ok: false as const, message: "No pudimos verificar este pedido." };

    const db = await getDb();
    if (!db) return { ok: false as const, message: "La encuesta no está disponible ahora mismo." };
    await ensureSurveyStorageReady(db);

    const loaded = await loadSurvey(db, data.surveyId);
    // A survey closed between showing and sending still accepts the answer;
    // only drafts (never shown) and deleted surveys refuse.
    if (!loaded || loaded.survey.status === "draft") {
      return { ok: false as const, message: "Esta encuesta ya no está disponible." };
    }
    const checked = validateSurveyAnswers(loaded.questions, data.answers);
    if (!checked.ok) return { ok: false as const, message: checked.message };

    const result = await db
      .prepare(
        `INSERT INTO order_feedback (id, inquiry_id, ratings_json, note, device, created_at, survey_id, answers_json)
         VALUES (?, ?, '{}', '', ?, ?, ?, ?)
         ON CONFLICT(inquiry_id) DO NOTHING`,
      )
      .bind(
        crypto.randomUUID(),
        data.orderId,
        classifyDevice(data.viewportWidth),
        new Date().toISOString(),
        data.surveyId,
        JSON.stringify(checked.answers),
      )
      .run();

    if (result.meta?.changes === 0) {
      return { ok: false as const, message: "Ya recibimos tu opinión sobre este pedido. Gracias." };
    }
    return { ok: true as const };
  });

// ---------------------------------------------------------------- admin

export type AdminUnansweredOrderRow = {
  orderId: string;
  requestNumber: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
};

const UNANSWERED_LIMIT = 30;

async function adminDb() {
  await enforceAdminAccess();
  await noStore();
  const db = await getDb();
  if (!db) throw new Error("La base de datos no está conectada.");
  await ensureSurveyStorageReady(db);
  await closeExpiredSurveys(db);
  return db;
}

async function ordersTableExists(db: D1Database) {
  // The orders table is created by the orders code on first use. Before any
  // order exists there is nothing to join against, and querying it would throw.
  return Boolean(await db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'inquiries'").first());
}

export const listAdminSurveys = createServerFn({ method: "GET" }).handler(async () => {
  const db = await adminDb();
  return listSurveys(db);
});

export const getAdminSurveyDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().trim().min(1).max(64) }).parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const loaded = await loadSurvey(db, data.id);
    if (!loaded) return null;
    if (!(await ordersTableExists(db))) return { ...loaded, answers: [] as AdminSurveyAnswer[], unanswered: [] as AdminUnansweredOrderRow[] };

    const answerRows = await db
      .prepare(
        `SELECT f.id, f.inquiry_id, f.answers_json, f.device, f.created_at, i.request_number, i.customer_name
         FROM order_feedback f
         LEFT JOIN inquiries i ON i.id = f.inquiry_id
         WHERE f.survey_id = ?
         ORDER BY julianday(f.created_at) DESC`,
      )
      .bind(data.id)
      .all<{
        id: string;
        inquiry_id: string;
        answers_json: string | null;
        device: string;
        created_at: string;
        request_number: string | null;
        customer_name: string | null;
      }>();

    const answers = (answerRows.results ?? []).map((row): AdminSurveyAnswer => {
      let parsed: SurveyAnswers = {};
      try {
        parsed = JSON.parse(row.answers_json ?? "{}") as SurveyAnswers;
      } catch {
        parsed = {};
      }
      const device: AnswerDevice = row.device === "phone" ? "phone" : "desktop";
      return {
        id: row.id,
        orderId: row.inquiry_id,
        requestNumber: row.request_number ?? "(pedido eliminado)",
        customerName: row.customer_name ?? "",
        orderExists: row.request_number !== null,
        device,
        createdAt: toIsoUtc(row.created_at),
        answers: parsed,
      };
    });

    let unanswered: AdminUnansweredOrderRow[] = [];
    if (loaded.survey.status === "open" && loaded.survey.openedAt) {
      const rows = await db
        .prepare(
          `SELECT i.id, i.request_number, i.customer_name, i.customer_phone, i.created_at
           FROM inquiries i
           LEFT JOIN order_feedback f ON f.inquiry_id = i.id
           WHERE f.id IS NULL AND i.channel = 'formulario'
             -- julianday() so SQLite "YYYY-MM-DD HH:MM:SS" and ISO dates compare as times, not text.
             -- One minute of slack: the first survey's start is recorded just after its first order.
             AND julianday(i.created_at) >= julianday(?, '-1 minute')
           ORDER BY julianday(i.created_at) DESC
           LIMIT ?`,
        )
        .bind(loaded.survey.openedAt, UNANSWERED_LIMIT)
        .all<{
          id: string;
          request_number: string;
          customer_name: string | null;
          customer_phone: string | null;
          created_at: string;
        }>();
      unanswered = (rows.results ?? []).map((row) => ({
        orderId: row.id,
        requestNumber: row.request_number,
        customerName: row.customer_name ?? "",
        customerPhone: row.customer_phone ?? "",
        createdAt: toIsoUtc(row.created_at),
      }));
    }

    return { ...loaded, answers, unanswered };
  });

function sameQuestions(a: ReadonlyArray<SurveyQuestion>, b: ReadonlyArray<{ id?: string; kind: string; label: string }>) {
  return (
    a.length === b.length &&
    a.every((question, index) => question.id === b[index]?.id && question.kind === b[index]?.kind && question.label === b[index]?.label)
  );
}

export const saveAdminSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof surveyEditSchema>) => surveyEditSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const endsAt = data.endsOn ? endOfDayInSantoDomingo(data.endsOn) : null;
    if (endsAt && Date.parse(endsAt) <= Date.now()) throw new Error("La fecha de cierre ya pasó.");

    const existing = data.id ? await loadSurvey(db, data.id) : null;
    if (data.id && !existing) throw new Error("Esa encuesta ya no existe.");

    if (existing) {
      const locked = existing.survey.answerCount > 0 || existing.survey.status !== "draft";
      if (locked && !sameQuestions(existing.questions, data.questions)) {
        throw new Error("Esta encuesta ya está abierta o tiene respuestas. Duplícala para cambiar las preguntas.");
      }
      if (existing.survey.status === "open" && data.device !== existing.survey.device) {
        const conflict = findOpenConflict({ id: existing.survey.id, device: data.device }, await listSurveys(db));
        if (conflict) throw new Error(`"${conflict.title}" ya está abierta para ese dispositivo.`);
      }
    }

    const id = existing?.survey.id ?? crypto.randomUUID();
    const statements: D1PreparedStatement[] = [];
    if (existing) {
      statements.push(
        db.prepare("UPDATE surveys SET title = ?, device = ?, ends_at = ? WHERE id = ?").bind(data.title, data.device, endsAt, id),
      );
    } else {
      statements.push(
        db
          .prepare(
            "INSERT INTO surveys (id, title, device, status, opened_at, closed_at, ends_at, created_at) VALUES (?, ?, ?, 'draft', NULL, NULL, ?, ?)",
          )
          .bind(id, data.title, data.device, endsAt, new Date().toISOString()),
      );
    }
    const questionsChanged = !existing || !sameQuestions(existing.questions, data.questions);
    if (questionsChanged) {
      statements.push(db.prepare("DELETE FROM survey_questions WHERE survey_id = ?").bind(id));
      data.questions.forEach((question, index) => {
        statements.push(
          db
            .prepare("INSERT INTO survey_questions (id, survey_id, kind, label, position) VALUES (?, ?, ?, ?, ?)")
            .bind(crypto.randomUUID(), id, question.kind, question.label, index),
        );
      });
    }
    await db.batch(statements);
    return { id };
  });

const surveyIdSchema = z.object({ id: z.string().trim().min(1).max(64) });

export const openAdminSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => surveyIdSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const loaded = await loadSurvey(db, data.id);
    if (!loaded) throw new Error("Esa encuesta ya no existe.");
    if (loaded.survey.status !== "draft") throw new Error("Solo un borrador se puede abrir.");
    if (loaded.questions.length === 0) throw new Error("Agrega al menos una pregunta antes de abrirla.");
    if (loaded.survey.endsAt && Date.parse(loaded.survey.endsAt) <= Date.now()) {
      throw new Error("La fecha de cierre ya pasó. Cámbiala antes de abrirla.");
    }
    const conflict = findOpenConflict(loaded.survey, await listSurveys(db));
    if (conflict) {
      const where =
        conflict.device === "all" ? "en todos los dispositivos" : `para ${SURVEY_DEVICE_LABEL[conflict.device].toLowerCase()}`;
      throw new Error(`"${conflict.title}" ya está abierta ${where}. Ciérrala primero.`);
    }
    await db
      .prepare("UPDATE surveys SET status = 'open', opened_at = ?, closed_at = NULL WHERE id = ? AND status = 'draft'")
      .bind(new Date().toISOString(), data.id)
      .run();
    return { ok: true };
  });

export const closeAdminSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => surveyIdSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    await db
      .prepare("UPDATE surveys SET status = 'closed', closed_at = ? WHERE id = ? AND status = 'open'")
      .bind(new Date().toISOString(), data.id)
      .run();
    return { ok: true };
  });

export const duplicateAdminSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => surveyIdSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    const loaded = await loadSurvey(db, data.id);
    if (!loaded) throw new Error("Esa encuesta ya no existe.");
    const id = crypto.randomUUID();
    const title = `${loaded.survey.title} (copia)`.slice(0, 80);
    await db.batch([
      db
        .prepare(
          "INSERT INTO surveys (id, title, device, status, opened_at, closed_at, ends_at, created_at) VALUES (?, ?, ?, 'draft', NULL, NULL, NULL, ?)",
        )
        .bind(id, title, loaded.survey.device, new Date().toISOString()),
      ...loaded.questions.map((question, index) =>
        db
          .prepare("INSERT INTO survey_questions (id, survey_id, kind, label, position) VALUES (?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), id, question.kind, question.label, index),
      ),
    ]);
    return { id };
  });

// Permanently deletes the encuesta and its answers. Orders are never touched.
export const deleteAdminSurvey = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => surveyIdSchema.parse(data))
  .handler(async ({ data }) => {
    const db = await adminDb();
    await db.batch([
      db.prepare("DELETE FROM order_feedback WHERE survey_id = ?").bind(data.id),
      db.prepare("DELETE FROM survey_questions WHERE survey_id = ?").bind(data.id),
      db.prepare("DELETE FROM surveys WHERE id = ?").bind(data.id),
    ]);
    return { ok: true };
  });
