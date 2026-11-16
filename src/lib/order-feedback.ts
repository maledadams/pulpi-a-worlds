import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { enforceAdminAccess } from "@/lib/admin-access";
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";
import {
  type FeedbackDevice,
  type FeedbackQuestionId,
  classifyDevice,
  feedbackTokenSubject,
  orderFeedbackInputSchema,
} from "@/lib/order-feedback-shared";

export { FEEDBACK_QUESTIONS } from "@/lib/order-feedback-shared";
export type { FeedbackDevice, FeedbackQuestionId } from "@/lib/order-feedback-shared";

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

let feedbackStorageReady: Promise<void> | null = null;

async function ensureFeedbackStorageReady(db: D1Database) {
  if (!feedbackStorageReady) {
    feedbackStorageReady = db
      .prepare(
        `CREATE TABLE IF NOT EXISTS order_feedback (
          id TEXT PRIMARY KEY,
          inquiry_id TEXT NOT NULL UNIQUE,
          ratings_json TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          device TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,
      )
      .run()
      .then(() => undefined)
      .catch((error) => {
        feedbackStorageReady = null;
        throw error;
      });
  }
  await feedbackStorageReady;
}

// Called from submitManualOrder. Returns "" (survey hidden) when no secret is configured.
export async function createOrderFeedbackToken(orderId: string) {
  const secret = await getSecret();
  if (!secret) return "";
  return signOrderConfirmToken(feedbackTokenSubject(orderId), secret);
}

export const submitOrderFeedback = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof orderFeedbackInputSchema>) => orderFeedbackInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "private, no-store");

    const hasAnswer = Object.keys(data.ratings).length > 0 || data.note.length > 0;
    if (!hasAnswer) {
      return { ok: false as const, message: "Marca al menos una estrella o escribe un comentario." };
    }

    const secret = await getSecret();
    const valid = secret
      ? await verifyOrderConfirmToken(feedbackTokenSubject(data.orderId), data.token, secret)
      : false;
    if (!valid) {
      return { ok: false as const, message: "No pudimos verificar este pedido." };
    }

    const workerEnv = await getWorkerEnv();
    const db = workerEnv.DB ?? null;
    if (!db) {
      return { ok: false as const, message: "La encuesta no esta disponible ahora mismo." };
    }

    await ensureFeedbackStorageReady(db);
    const result = await db
      .prepare(
        `INSERT INTO order_feedback (id, inquiry_id, ratings_json, note, device, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(inquiry_id) DO NOTHING`,
      )
      .bind(
        crypto.randomUUID(),
        data.orderId,
        JSON.stringify(data.ratings),
        data.note,
        classifyDevice(data.viewportWidth),
        new Date().toISOString(),
      )
      .run();

    if (result.meta?.changes === 0) {
      return { ok: false as const, message: "Ya recibimos tu opinion sobre este pedido. Gracias." };
    }
    return { ok: true as const };
  });

export type AdminOrderFeedbackRow = {
  id: string;
  orderId: string;
  requestNumber: string;
  customerName: string;
  ratings: Partial<Record<FeedbackQuestionId, number>>;
  note: string;
  device: FeedbackDevice;
  createdAt: string;
};

export type AdminUnansweredOrderRow = {
  orderId: string;
  requestNumber: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
};

const UNANSWERED_LIMIT = 30;

export const getAdminOrderFeedback = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");

  const workerEnv = await getWorkerEnv();
  const db = workerEnv.DB ?? null;
  if (!db) return { answers: [] as AdminOrderFeedbackRow[], unanswered: [] as AdminUnansweredOrderRow[] };
  await ensureFeedbackStorageReady(db);

  const answers = await db
    .prepare(
      `SELECT f.id, f.inquiry_id, f.ratings_json, f.note, f.device, f.created_at,
              i.request_number, i.customer_name
       FROM order_feedback f
       LEFT JOIN inquiries i ON i.id = f.inquiry_id
       ORDER BY f.created_at DESC`,
    )
    .all<{
      id: string;
      inquiry_id: string;
      ratings_json: string;
      note: string;
      device: string;
      created_at: string;
      request_number: string | null;
      customer_name: string | null;
    }>();

  const unanswered = await db
    .prepare(
      `SELECT i.id, i.request_number, i.customer_name, i.customer_phone, i.created_at
       FROM inquiries i
       LEFT JOIN order_feedback f ON f.inquiry_id = i.id
       WHERE f.id IS NULL AND i.channel = 'formulario'
       ORDER BY i.created_at DESC
       LIMIT ?`,
    )
    .bind(UNANSWERED_LIMIT)
    .all<{
      id: string;
      request_number: string;
      customer_name: string | null;
      customer_phone: string | null;
      created_at: string;
    }>();

  return {
    answers: (answers.results ?? []).map((row): AdminOrderFeedbackRow => {
      let ratings: AdminOrderFeedbackRow["ratings"] = {};
      try {
        ratings = JSON.parse(row.ratings_json);
      } catch {
        ratings = {};
      }
      const device: FeedbackDevice =
        row.device === "phone" || row.device === "tablet" ? row.device : "desktop";
      return {
        id: row.id,
        orderId: row.inquiry_id,
        requestNumber: row.request_number ?? "(pedido eliminado)",
        customerName: row.customer_name ?? "",
        ratings,
        note: row.note,
        device,
        createdAt: row.created_at,
      };
    }),
    unanswered: (unanswered.results ?? []).map((row) => ({
      orderId: row.id,
      requestNumber: row.request_number,
      customerName: row.customer_name ?? "",
      customerPhone: row.customer_phone ?? "",
      createdAt: row.created_at,
    })),
  };
});
