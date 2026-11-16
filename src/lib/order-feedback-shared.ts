import { z } from "zod";

// Post-order survey (spec 2026-11-16-mobile-findability, Part B).
// Pure module: safe to import from tests, the client form and the server.

export const FEEDBACK_QUESTIONS = [
  { id: "navigation", label: "Facilidad de navegación" },
  { id: "findability", label: "Facilidad para encontrar lo que buscabas" },
  { id: "speed", label: "Rapidez de la página" },
  { id: "checkout", label: "Facilidad del proceso de pedido" },
  { id: "overall", label: "Experiencia general" },
] as const;

export type FeedbackQuestionId = (typeof FEEDBACK_QUESTIONS)[number]["id"];
export type FeedbackDevice = "phone" | "tablet" | "desktop";

const NOTE_MAX = 500;

// Same breakpoints the site uses for its layouts (md = 768, lg = 1024).
export function classifyDevice(viewportWidth: number): FeedbackDevice {
  if (viewportWidth < 768) return "phone";
  if (viewportWidth < 1024) return "tablet";
  return "desktop";
}

// Distinct HMAC subject so a survey token can never be replayed as the
// WhatsApp order-confirm token, which signs the bare order id.
export function feedbackTokenSubject(orderId: string) {
  return `order-feedback:${orderId}`;
}

const rating = z.number().int().min(1).max(5);

export const orderFeedbackInputSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  token: z.string().trim().min(1).max(200),
  ratings: z
    .object({
      navigation: rating.optional(),
      findability: rating.optional(),
      speed: rating.optional(),
      checkout: rating.optional(),
      overall: rating.optional(),
    })
    .strict(),
  note: z.string().trim().max(NOTE_MAX).default(""),
  viewportWidth: z.number().int().min(0).max(10000),
});

export type OrderFeedbackInput = z.infer<typeof orderFeedbackInputSchema>;
