import { describe, expect, it } from "vitest";
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";
import {
  LEGACY_SURVEY_QUESTIONS,
  type AdminSurveyAnswer,
  averageRating,
  classifyDevice,
  devicesOverlap,
  endOfDayInSantoDomingo,
  feedbackTokenSubject,
  filterAnswersByDate,
  findOpenConflict,
  formatShortDate,
  legacyAnswersFromRow,
  paginate,
  surveyDateLabel,
  surveyEditSchema,
  toIsoUtc,
  validateSurveyAnswers,
} from "@/lib/order-feedback-shared";

describe("toIsoUtc", () => {
  it("reads SQLite CURRENT_TIMESTAMP values (what new orders store) as UTC", () => {
    expect(toIsoUtc("2026-11-16 20:47:28")).toBe("2026-11-16T20:47:28.000Z");
  });
  it("keeps ISO timestamps as the same instant", () => {
    expect(toIsoUtc("2026-06-10T18:10:00.000Z")).toBe("2026-06-10T18:10:00.000Z");
  });
  it("returns the input unchanged when it isn't a date", () => {
    expect(toIsoUtc("not a date")).toBe("not a date");
  });
});

describe("classifyDevice", () => {
  it("phones are under 768px; tablets count as computers", () => {
    expect(classifyDevice(375)).toBe("phone");
    expect(classifyDevice(767)).toBe("phone");
    expect(classifyDevice(768)).toBe("desktop");
    expect(classifyDevice(1440)).toBe("desktop");
  });
});

describe("feedbackTokenSubject", () => {
  it("never equals the raw order id (so it can't double as the WhatsApp confirm token)", () => {
    expect(feedbackTokenSubject("abc")).toBe("order-feedback:abc");
  });
});

describe("survey token", () => {
  const secret = "test-secret";
  it("verifies for the same order and rejects another order", async () => {
    const token = await signOrderConfirmToken(feedbackTokenSubject("order-1"), secret);
    expect(await verifyOrderConfirmToken(feedbackTokenSubject("order-1"), token, secret)).toBe(true);
    expect(await verifyOrderConfirmToken(feedbackTokenSubject("order-2"), token, secret)).toBe(false);
  });
  it("is not interchangeable with the WhatsApp confirm token", async () => {
    const confirmToken = await signOrderConfirmToken("order-1", secret);
    expect(await verifyOrderConfirmToken(feedbackTokenSubject("order-1"), confirmToken, secret)).toBe(false);
  });
});

describe("one open encuesta per device", () => {
  it("'all' overlaps everything; phone and desktop don't overlap each other", () => {
    expect(devicesOverlap("all", "phone")).toBe(true);
    expect(devicesOverlap("desktop", "all")).toBe(true);
    expect(devicesOverlap("phone", "phone")).toBe(true);
    expect(devicesOverlap("phone", "desktop")).toBe(false);
  });

  const surveys = [
    { id: "a", title: "Móvil", device: "phone" as const, status: "open" as const },
    { id: "b", title: "Vieja", device: "all" as const, status: "closed" as const },
    { id: "c", title: "Borrador", device: "all" as const, status: "draft" as const },
  ];

  it("blocks a second phone encuesta and an 'all' encuesta while a phone one is open", () => {
    expect(findOpenConflict({ id: "x", device: "phone" }, surveys)?.id).toBe("a");
    expect(findOpenConflict({ id: "x", device: "all" }, surveys)?.id).toBe("a");
  });

  it("allows a computer encuesta next to an open phone one, and ignores closed and draft ones", () => {
    expect(findOpenConflict({ id: "x", device: "desktop" }, surveys)).toBeNull();
  });

  it("never conflicts with itself", () => {
    expect(findOpenConflict({ id: "a", device: "phone" }, surveys)).toBeNull();
  });
});

describe("dates", () => {
  it("an end date closes at the last moment of that day in Santo Domingo (UTC-4)", () => {
    expect(endOfDayInSantoDomingo("2026-11-14")).toBe("2026-11-15T03:59:59.999Z");
  });

  it("short dates are in Santo Domingo time", () => {
    // 02:00 UTC on Nov 15 is still Nov 14 in Santo Domingo.
    expect(formatShortDate("2026-11-15T02:00:00.000Z")).toBe("14 nov");
    expect(formatShortDate("2026-01-01T12:00:00.000Z")).toBe("1 ene");
  });

  it("labels each status for the eyebrow", () => {
    expect(surveyDateLabel({ status: "draft", openedAt: null, closedAt: null, endsAt: null })).toBe("Borrador");
    expect(
      surveyDateLabel({ status: "open", openedAt: "2026-11-01T15:00:00.000Z", closedAt: null, endsAt: null }),
    ).toBe("Abierta desde 1 nov");
    expect(
      surveyDateLabel({
        status: "open",
        openedAt: "2026-11-01T15:00:00.000Z",
        closedAt: null,
        endsAt: "2026-11-15T03:59:59.999Z",
      }),
    ).toBe("Abierta desde 1 nov · cierra 14 nov");
    expect(
      surveyDateLabel({
        status: "closed",
        openedAt: "2026-11-01T15:00:00.000Z",
        closedAt: "2026-11-14T20:00:00.000Z",
        endsAt: null,
      }),
    ).toBe("1 nov – 14 nov");
  });
});

describe("validateSurveyAnswers", () => {
  const questions = [
    { id: "q1", kind: "rating" as const, label: "Rapidez" },
    { id: "q2", kind: "text" as const, label: "¿Algo más?" },
  ];

  it("accepts ratings 1-5 and trimmed text", () => {
    expect(validateSurveyAnswers(questions, { q1: 4, q2: "  hola  " })).toEqual({
      ok: true,
      answers: { q1: 4, q2: "hola" },
    });
  });

  it("drops empty text and requires at least one real answer", () => {
    expect(validateSurveyAnswers(questions, { q2: "   " }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, {}).ok).toBe(false);
  });

  it("rejects unknown questions, out-of-range or fractional ratings, text in a rating, long text", () => {
    expect(validateSurveyAnswers(questions, { q9: 3 }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q1: 0 }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q1: 6 }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q1: 2.5 }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q1: "5" }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q2: 3 }).ok).toBe(false);
    expect(validateSurveyAnswers(questions, { q2: "x".repeat(501) }).ok).toBe(false);
  });
});

describe("surveyEditSchema", () => {
  const base = { title: "Navidad", device: "all", endsOn: null, questions: [{ kind: "rating", label: "Rapidez" }] };

  it("accepts a valid encuesta", () => {
    expect(surveyEditSchema.safeParse(base).success).toBe(true);
  });

  it("needs a title and at least one question, and caps questions at 15", () => {
    expect(surveyEditSchema.safeParse({ ...base, title: " " }).success).toBe(false);
    expect(surveyEditSchema.safeParse({ ...base, questions: [] }).success).toBe(false);
    const many = Array.from({ length: 16 }, (_, index) => ({ kind: "rating", label: `P${index}` }));
    expect(surveyEditSchema.safeParse({ ...base, questions: many }).success).toBe(false);
  });

  it("only accepts YYYY-MM-DD end dates", () => {
    expect(surveyEditSchema.safeParse({ ...base, endsOn: "2026-11-30" }).success).toBe(true);
    expect(surveyEditSchema.safeParse({ ...base, endsOn: "30/11/2026" }).success).toBe(false);
  });
});

describe("legacy answers (the first, hard-coded survey) become Encuesta 1", () => {
  it("has the five original categories plus the note question", () => {
    expect(LEGACY_SURVEY_QUESTIONS.map((question) => question.kind)).toEqual([
      "rating",
      "rating",
      "rating",
      "rating",
      "rating",
      "text",
    ]);
    expect(LEGACY_SURVEY_QUESTIONS[0]?.label).toBe("Facilidad de navegación");
  });

  it("maps old ratings_json + note onto the new question ids", () => {
    expect(legacyAnswersFromRow('{"navigation":5,"speed":3}', "Me costó")).toEqual({
      "legacy-navigation": 5,
      "legacy-speed": 3,
      "legacy-note": "Me costó",
    });
    expect(legacyAnswersFromRow("not json", "")).toEqual({});
  });
});

describe("results", () => {
  const answer = (id: string, device: "phone" | "desktop", createdAt: string, rating?: number): AdminSurveyAnswer => ({
    id,
    orderId: `o-${id}`,
    requestNumber: `PUL-${id}`,
    customerName: "",
    orderExists: true,
    device,
    createdAt,
    answers: rating === undefined ? { q2: "texto" } : { q1: rating },
  });
  const answers = [
    answer("1", "phone", "2026-11-02T15:00:00.000Z", 5),
    answer("2", "phone", "2026-11-05T15:00:00.000Z", 2),
    answer("3", "desktop", "2026-11-10T15:00:00.000Z", 4),
    answer("4", "desktop", "2026-11-12T15:00:00.000Z"),
  ];

  it("averages a category per device and overall, skipping answers that left it blank", () => {
    expect(averageRating(answers, "q1", "phone")).toEqual({ value: 3.5, count: 2 });
    expect(averageRating(answers, "q1", "desktop")).toEqual({ value: 4, count: 1 });
    expect(averageRating(answers, "q1")).toEqual({ value: 11 / 3, count: 3 });
    expect(averageRating([], "q1")).toBeNull();
  });

  it("filters by Santo Domingo calendar days, both ends inclusive", () => {
    expect(filterAnswersByDate(answers, "2026-11-05", "2026-11-10").map((entry) => entry.id)).toEqual(["2", "3"]);
    expect(filterAnswersByDate(answers, "", "2026-11-04").map((entry) => entry.id)).toEqual(["1"]);
    expect(filterAnswersByDate(answers, "", "")).toHaveLength(4);
  });

  it("paginates 5 per page and clamps the page number", () => {
    const items = Array.from({ length: 12 }, (_, index) => index);
    expect(paginate(items, 0, 5)).toEqual({ items: [0, 1, 2, 3, 4], page: 0, pages: 3 });
    expect(paginate(items, 2, 5).items).toEqual([10, 11]);
    expect(paginate(items, 9, 5).page).toBe(2);
    expect(paginate([], 0, 5)).toEqual({ items: [], page: 0, pages: 1 });
  });
});
