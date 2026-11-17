import { z } from "zod";

// Encuestas (spec 2026-11-16-survey-builder-design). Pure module: safe to
// import from tests, the customer form, the admin page and the server.

export type SurveyDevice = "all" | "phone" | "desktop";
export type AnswerDevice = "phone" | "desktop";
export type SurveyStatus = "draft" | "open" | "closed";
export type SurveyQuestionKind = "rating" | "text";
export type SurveyQuestion = { id: string; kind: SurveyQuestionKind; label: string };
export type SurveyAnswers = Record<string, number | string>;

export type SurveySummary = {
  id: string;
  title: string;
  device: SurveyDevice;
  status: SurveyStatus;
  openedAt: string | null;
  closedAt: string | null;
  endsAt: string | null;
  createdAt: string;
  answerCount: number;
};

export type AdminSurveyAnswer = {
  id: string;
  orderId: string;
  requestNumber: string;
  customerName: string;
  orderExists: boolean;
  device: AnswerDevice;
  createdAt: string;
  answers: SurveyAnswers;
};

export const SURVEY_TEXT_MAX = 500;
export const SURVEY_MAX_QUESTIONS = 15;
export const SURVEY_DEVICE_LABEL: Record<SurveyDevice, string> = {
  all: "Ambos",
  phone: "Teléfono",
  desktop: "Computadora",
};

// The original, hard-coded survey becomes "Encuesta 1" on first run so the
// answers collected before the builder existed keep their meaning.
export const LEGACY_SURVEY_ID = "encuesta-1";
export const LEGACY_SURVEY_QUESTIONS: ReadonlyArray<SurveyQuestion> = [
  { id: "legacy-navigation", kind: "rating", label: "Facilidad de navegación" },
  { id: "legacy-findability", kind: "rating", label: "Facilidad para encontrar lo que buscabas" },
  { id: "legacy-speed", kind: "rating", label: "Rapidez de la página" },
  { id: "legacy-checkout", kind: "rating", label: "Facilidad del proceso de pedido" },
  { id: "legacy-overall", kind: "rating", label: "Experiencia general" },
  { id: "legacy-note", kind: "text", label: "¿Algo más que quieras contarnos?" },
];

export function legacyAnswersFromRow(ratingsJson: string, note: string): SurveyAnswers {
  const answers: SurveyAnswers = {};
  try {
    const ratings = JSON.parse(ratingsJson) as Record<string, unknown>;
    for (const [key, value] of Object.entries(ratings ?? {})) {
      if (typeof value === "number") answers[`legacy-${key}`] = value;
    }
  } catch {
    // Unreadable old row: keep whatever text it has.
  }
  if (note.trim()) answers["legacy-note"] = note.trim();
  return answers;
}

// Phones are under the site's md breakpoint; tablets count as computers,
// matching the admin's "Teléfono / Computadora" split.
export function classifyDevice(viewportWidth: number): AnswerDevice {
  return viewportWidth < 768 ? "phone" : "desktop";
}

export function surveyMatchesDevice(surveyDevice: SurveyDevice, device: AnswerDevice) {
  return surveyDevice === "all" || surveyDevice === device;
}

export function devicesOverlap(a: SurveyDevice, b: SurveyDevice) {
  return a === "all" || b === "all" || a === b;
}

// At most one open encuesta per device: returns the open one that blocks
// `target` from opening, or null.
export function findOpenConflict<T extends { id: string; device: SurveyDevice; status: SurveyStatus }>(
  target: { id: string; device: SurveyDevice },
  surveys: T[],
): T | null {
  return (
    surveys.find(
      (survey) => survey.id !== target.id && survey.status === "open" && devicesOverlap(survey.device, target.device),
    ) ?? null
  );
}

// Distinct HMAC subject so a survey token can never be replayed as the
// WhatsApp order-confirm token, which signs the bare order id.
export function feedbackTokenSubject(orderId: string) {
  return `order-feedback:${orderId}`;
}

// Orders get `created_at` from SQLite's CURRENT_TIMESTAMP ("YYYY-MM-DD HH:MM:SS",
// UTC, no zone marker). Browsers read that shape as local time (or reject it,
// Safari), so convert to a real ISO UTC string before it reaches the page.
export function toIsoUtc(value: string) {
  const sqliteUtc = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(" ", "T")}Z` : value;
  const time = Date.parse(sqliteUtc);
  return Number.isNaN(time) ? value : new Date(time).toISOString();
}

// The Dominican Republic is UTC-4 all year (no daylight saving).
const SANTO_DOMINGO_OFFSET = "-04:00";
const SANTO_DOMINGO_OFFSET_MS = 4 * 60 * 60 * 1000;
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function startOfDayInSantoDomingo(day: string) {
  return new Date(`${day}T00:00:00.000${SANTO_DOMINGO_OFFSET}`).toISOString();
}

export function endOfDayInSantoDomingo(day: string) {
  return new Date(`${day}T23:59:59.999${SANTO_DOMINGO_OFFSET}`).toISOString();
}

export function formatShortDate(iso: string) {
  const local = new Date(Date.parse(iso) - SANTO_DOMINGO_OFFSET_MS);
  return `${local.getUTCDate()} ${SHORT_MONTHS[local.getUTCMonth()]}`;
}

export function surveyDateLabel(survey: Pick<SurveySummary, "status" | "openedAt" | "closedAt" | "endsAt">) {
  if (survey.status === "draft" || !survey.openedAt) return "Borrador";
  if (survey.status === "open") {
    const closing = survey.endsAt ? ` · cierra ${formatShortDate(survey.endsAt)}` : "";
    return `Abierta desde ${formatShortDate(survey.openedAt)}${closing}`;
  }
  return `${formatShortDate(survey.openedAt)} – ${formatShortDate(survey.closedAt ?? survey.openedAt)}`;
}

const surveyQuestionInputSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  kind: z.enum(["rating", "text"]),
  label: z.string().trim().min(1).max(120),
});

export const surveyEditSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().min(1).max(80),
  device: z.enum(["all", "phone", "desktop"]),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  questions: z.array(surveyQuestionInputSchema).min(1).max(SURVEY_MAX_QUESTIONS),
});

export type SurveyEditInput = z.infer<typeof surveyEditSchema>;

export const submitSurveyInputSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  token: z.string().trim().min(1).max(200),
  surveyId: z.string().trim().min(1).max(64),
  answers: z.record(z.union([z.number(), z.string().max(SURVEY_TEXT_MAX * 2)])),
  viewportWidth: z.number().int().min(0).max(10000),
});

// Checks a customer's answers against the questions of the encuesta they were
// shown. Unknown questions or wrong value types reject the whole submit.
export function validateSurveyAnswers(
  questions: ReadonlyArray<SurveyQuestion>,
  raw: Record<string, unknown>,
): { ok: true; answers: SurveyAnswers } | { ok: false; message: string } {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answers: SurveyAnswers = {};
  for (const [id, value] of Object.entries(raw)) {
    const question = byId.get(id);
    if (!question) return { ok: false, message: "La encuesta cambió. Recarga la página." };
    if (question.kind === "rating") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
        return { ok: false, message: "Las estrellas van de 1 a 5." };
      }
      answers[id] = value;
    } else {
      if (typeof value !== "string") return { ok: false, message: "Respuesta no válida." };
      const text = value.trim();
      if (text.length > SURVEY_TEXT_MAX) {
        return { ok: false, message: `Máximo ${SURVEY_TEXT_MAX} caracteres por respuesta.` };
      }
      if (text) answers[id] = text;
    }
  }
  if (Object.keys(answers).length === 0) {
    return { ok: false, message: "Marca al menos una estrella o escribe una respuesta." };
  }
  return { ok: true, answers };
}

export function averageRating(answers: ReadonlyArray<AdminSurveyAnswer>, questionId: string, device?: AnswerDevice) {
  const values = answers
    .filter((answer) => !device || answer.device === device)
    .map((answer) => answer.answers[questionId])
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return { value: values.reduce((sum, value) => sum + value, 0) / values.length, count: values.length };
}

// `from` / `to` are YYYY-MM-DD calendar days in Santo Domingo, both inclusive.
// An empty string leaves that side open.
export function filterAnswersByDate<T extends { createdAt: string }>(answers: ReadonlyArray<T>, from: string, to: string) {
  const start = from ? Date.parse(startOfDayInSantoDomingo(from)) : Number.NEGATIVE_INFINITY;
  const end = to ? Date.parse(endOfDayInSantoDomingo(to)) : Number.POSITIVE_INFINITY;
  return answers.filter((answer) => {
    const time = Date.parse(answer.createdAt);
    return time >= start && time <= end;
  });
}

export function paginate<T>(items: ReadonlyArray<T>, page: number, perPage: number) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(Math.max(0, page), pages - 1);
  return { items: items.slice(safePage * perPage, safePage * perPage + perPage), page: safePage, pages };
}
