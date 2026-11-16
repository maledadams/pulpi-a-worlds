import { describe, expect, it } from "vitest";
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";
import {
  FEEDBACK_QUESTIONS,
  classifyDevice,
  feedbackTokenSubject,
  orderFeedbackInputSchema,
} from "@/lib/order-feedback-shared";

describe("FEEDBACK_QUESTIONS", () => {
  it("has the five approved questions, verbatim", () => {
    expect(FEEDBACK_QUESTIONS.map((q) => q.label)).toEqual([
      "Facilidad de navegación",
      "Facilidad para encontrar lo que buscabas",
      "Rapidez de la página",
      "Facilidad del proceso de pedido",
      "Experiencia general",
    ]);
  });
});

describe("classifyDevice", () => {
  it("classifies by viewport width", () => {
    expect(classifyDevice(375)).toBe("phone");
    expect(classifyDevice(767)).toBe("phone");
    expect(classifyDevice(768)).toBe("tablet");
    expect(classifyDevice(1023)).toBe("tablet");
    expect(classifyDevice(1024)).toBe("desktop");
  });
});

describe("feedbackTokenSubject", () => {
  it("never equals the raw order id (so it can't double as the WhatsApp confirm token)", () => {
    expect(feedbackTokenSubject("abc")).not.toBe("abc");
    expect(feedbackTokenSubject("abc")).toBe("order-feedback:abc");
  });
});

describe("orderFeedbackInputSchema", () => {
  const base = { orderId: "o1", token: "t", ratings: {}, note: "", viewportWidth: 390 };

  it("accepts an all-empty survey shape (validated as 'nothing to send' by the server fn)", () => {
    expect(orderFeedbackInputSchema.safeParse(base).success).toBe(true);
  });

  it("accepts integer ratings 1-5 on known questions", () => {
    expect(orderFeedbackInputSchema.safeParse({ ...base, ratings: { navigation: 5, overall: 1 } }).success).toBe(true);
  });

  it("rejects out-of-range, fractional and unknown ratings", () => {
    expect(orderFeedbackInputSchema.safeParse({ ...base, ratings: { navigation: 0 } }).success).toBe(false);
    expect(orderFeedbackInputSchema.safeParse({ ...base, ratings: { navigation: 6 } }).success).toBe(false);
    expect(orderFeedbackInputSchema.safeParse({ ...base, ratings: { navigation: 2.5 } }).success).toBe(false);
    expect(orderFeedbackInputSchema.safeParse({ ...base, ratings: { hacker: 3 } }).success).toBe(false);
  });

  it("trims the note and caps it at 500 characters", () => {
    const parsed = orderFeedbackInputSchema.parse({ ...base, note: "  hola  " });
    expect(parsed.note).toBe("hola");
    expect(orderFeedbackInputSchema.safeParse({ ...base, note: "x".repeat(501) }).success).toBe(false);
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
