import { useEffect, useState } from "react";
import { setAgeAnswer, useAgeAnswer } from "@/lib/age-verification";

// Headings get a global left-anchored scaleX stretch, which shifts centered
// text to the right; keep the stretch but grow it from the middle.
const CENTERED_TITLE = { transform: "scaleX(1.12)", transformOrigin: "center" } as const;

// Every visitor answers once; the answer is remembered on this browser for 3
// days. Minors can still shop, they just never see the adult categories.
export function AgeGate() {
  const answer = useAgeAnswer();
  const [mounted, setMounted] = useState(false);
  const open = mounted && answer === null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 text-center text-foreground shadow-2xl">
        <h2 id="age-gate-title" className="font-display text-2xl" style={CENTERED_TITLE}>
          ¿Tienes 18 años o más?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta tienda incluye artículos para adultos.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setAgeAnswer("minor")}
            className="flex-1 rounded-full border border-foreground/20 py-2.5 text-sm font-bold hover:bg-muted"
          >
            No
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => setAgeAnswer("adult")}
            className="flex-1 rounded-full border border-foreground bg-foreground py-2.5 text-sm font-bold text-background"
          >
            Sí, entrar
          </button>
        </div>
      </div>
    </div>
  );
}
