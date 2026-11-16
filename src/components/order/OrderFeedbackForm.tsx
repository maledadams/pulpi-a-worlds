import { Star } from "lucide-react";
import { useState } from "react";
import { submitOrderFeedback } from "@/lib/order-feedback";
import { FEEDBACK_QUESTIONS, type FeedbackQuestionId } from "@/lib/order-feedback-shared";

type Ratings = Partial<Record<FeedbackQuestionId, number>>;

export function OrderFeedbackForm({ orderId, token }: { orderId: string; token: string }) {
  const [ratings, setRatings] = useState<Ratings>({});
  const [note, setNote] = useState("");
  const [state, setState] = useState<"open" | "sending" | "sent" | "dismissed">("open");
  const [error, setError] = useState("");

  if (!token || state === "dismissed") return null;

  if (state === "sent") {
    return (
      <p className="mt-6 rounded-2xl border border-foreground/10 bg-background p-4 text-center text-sm">
        Gracias por tu opinión. Nos ayuda a mejorar la página.
      </p>
    );
  }

  const send = () => {
    setError("");
    setState("sending");
    void submitOrderFeedback({
      data: { orderId, token, ratings, note, viewportWidth: window.innerWidth },
    })
      .then((result) => {
        if (result.ok) {
          setState("sent");
          return;
        }
        setError(result.message);
        setState("open");
      })
      .catch(() => {
        setError("No se pudo enviar ahora mismo. Inténtalo otra vez.");
        setState("open");
      });
  };

  return (
    <section
      aria-labelledby="order-feedback-title"
      className="mt-6 rounded-2xl border border-foreground/10 bg-background p-4 sm:p-5"
    >
      <h2 id="order-feedback-title" className="text-sm font-bold">
        ¿Cómo fue tu experiencia en la página? (opcional)
      </h2>
      <div className="mt-4 grid gap-4">
        {FEEDBACK_QUESTIONS.map((question) => (
          <fieldset key={question.id} className="grid gap-2">
            <legend className="text-sm">{question.label}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = (ratings[question.id] ?? 0) >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} de 5`}
                    aria-pressed={ratings[question.id] === value}
                    onClick={() => setRatings((current) => ({ ...current, [question.id]: value }))}
                    className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
                  >
                    <Star
                      className={`h-6 w-6 ${selected ? "fill-[#c5475f] text-[#c5475f]" : "text-foreground/30"}`}
                      strokeWidth={1.75}
                    />
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
        <label className="grid gap-2 text-sm">
          <span>¿Algo más que quieras contarnos?</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            className="rounded-xl border border-foreground/20 bg-card p-3 text-base"
          />
          <span className="text-xs text-muted-foreground">{note.length}/500</span>
        </label>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#c5475f]">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={send}
          disabled={state === "sending"}
          className="flex-1 rounded-full bg-foreground px-5 py-3 text-sm font-bold uppercase tracking-wider text-background disabled:opacity-50"
        >
          {state === "sending" ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={() => setState("dismissed")}
          className="flex-1 rounded-full border border-foreground/20 px-5 py-3 text-sm font-bold uppercase tracking-wider"
        >
          No, gracias
        </button>
      </div>
    </section>
  );
}
