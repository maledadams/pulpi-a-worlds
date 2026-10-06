import { useEffect, useState } from "react";

const STORAGE_KEY = "pulpina-age-ok-until";
const REMEMBER_MS = 3 * 24 * 60 * 60 * 1000;

function hasValidConfirmation() {
  try {
    const until = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

// The store shows adult categories openly, so every visitor confirms they are
// 18+ once. The answer is remembered on this browser for 3 days.
export function AgeGate() {
  const [open, setOpen] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (!hasValidConfirmation()) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  const confirm = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now() + REMEMBER_MS));
    } catch {
      // Storage blocked (private mode): let them in for this page view anyway.
    }
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl bg-background p-6 text-center text-foreground shadow-2xl">
        {declined ? (
          <>
            <h2 id="age-gate-title" className="font-display text-2xl">
              Lo sentimos
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta tienda es solo para mayores de 18 años.
            </p>
            <button
              type="button"
              onClick={() => setDeclined(false)}
              className="mt-5 text-sm font-semibold underline underline-offset-4"
            >
              Volver
            </button>
          </>
        ) : (
          <>
            <h2 id="age-gate-title" className="font-display text-2xl">
              ¿Tienes 18 años o más?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta tienda incluye artículos para adultos.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="flex-1 rounded-full border border-foreground/20 py-2.5 text-sm font-bold hover:bg-muted"
              >
                No
              </button>
              <button
                type="button"
                autoFocus
                onClick={confirm}
                className="flex-1 rounded-full bg-foreground py-2.5 text-sm font-bold text-background"
              >
                Sí, entrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
