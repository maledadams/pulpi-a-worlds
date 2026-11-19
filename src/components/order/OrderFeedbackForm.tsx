import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getActiveSurvey, submitOrderFeedback } from "@/lib/order-feedback";
import { SURVEY_TEXT_MAX, type SurveyQuestion } from "@/lib/order-feedback-shared";

type ActiveSurvey = { id: string; title: string; questions: SurveyQuestion[] };

// Shows the encuesta that is open for this screen size (phone or computer), if
// any. The encuesta's title is for the admin; customers see a fixed heading.
export function OrderFeedbackForm({ orderId, token }: { orderId: string; token: string }) {
  const [survey, setSurvey] = useState<ActiveSurvey | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [state, setState] = useState<"open" | "sending" | "sent" | "dismissed">("open");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void getActiveSurvey({ data: { viewportWidth: window.innerWidth } })
      .then((active) => {
        if (!cancelled) setSurvey(active);
      })
      .catch(() => {
        // No survey is better than a broken confirmation screen.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token || !survey || state === "dismissed") return null;

  if (state === "sent") {
    return (
      <p className="mt-6 rounded-2xl border border-foreground/10 bg-background p-4 text-center text-sm">
        Gracias por tu opinión. Nos ayuda a mejorar la página.
      </p>
    );
  }

  const setAnswer = (id: string, value: number | string) => setAnswers((current) => ({ ...current, [id]: value }));

  const send = () => {
    setError("");
    setState("sending");
    void submitOrderFeedback({
      data: { orderId, token, surveyId: survey.id, answers, viewportWidth: window.innerWidth },
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
      {/* Headings on general pages get a global scaleX(1.12) from the left edge;
          centering the stretch and narrowing the box by the same 12% keeps the
          brand stretch without the text spilling past the card. */}
      <h2
        id="order-feedback-title"
        className="mx-auto max-w-[89%] text-center text-lg font-bold sm:text-xl"
        style={{ transformOrigin: "center" }}
      >
        ¿Cómo fue tu experiencia en la página? (opcional)
      </h2>
      <div className="mt-5 grid gap-4 text-center">
        {survey.questions.map((question) =>
          question.kind === "rating" ? (
            <fieldset key={question.id} className="grid justify-items-center gap-2">
              <legend className="w-full text-center text-sm">{question.label}</legend>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => {
                  const current = answers[question.id];
                  const selected = typeof current === "number" && current >= value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value} de 5`}
                      aria-pressed={current === value}
                      onClick={() => setAnswer(question.id, value)}
                      className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
                    >
                      <Star
                        className={`h-6 w-6 ${selected ? "fill-[#121212] text-[#121212]" : "text-foreground/30"}`}
                        strokeWidth={1.75}
                      />
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <label key={question.id} className="mx-auto grid w-full max-w-xl gap-2 text-sm">
              <span>{question.label}</span>
              <textarea
                value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                onChange={(event) => setAnswer(question.id, event.target.value.slice(0, SURVEY_TEXT_MAX))}
                maxLength={SURVEY_TEXT_MAX}
                rows={3}
                className="rounded-xl border border-foreground/20 bg-card p-3 text-left text-base"
              />
              <span className="text-xs text-muted-foreground">
                {typeof answers[question.id] === "string" ? (answers[question.id] as string).length : 0}/{SURVEY_TEXT_MAX}
              </span>
            </label>
          ),
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-[#121212]">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={send}
          disabled={state === "sending"}
          className="flex-1 rounded-full bg-foreground px-5 py-3 text-sm font-bold uppercase tracking-wider text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {state === "sending" ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={() => setState("dismissed")}
          className="flex-1 rounded-full bg-white px-5 py-3 text-sm font-bold uppercase tracking-wider transition-transform active:scale-[0.98]"
        >
          No, gracias
        </button>
      </div>
    </section>
  );
}
