import { useEffect, useRef, useState } from "react";

export type AdminAutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced auto-save for admin editors. Saves `value` automatically a short
 * while after it stops changing - no explicit "save" click required.
 *
 * `resetKey` should identify the underlying record (e.g. selected row id).
 * When it changes, the hook resyncs its baseline to the freshly-loaded value
 * without treating that load as a user edit (so switching rows never fires
 * a spurious save of unchanged data).
 */
export function useAdminAutosave<T>(
  value: T | null,
  save: (value: T) => Promise<void>,
  options: { resetKey?: string | number | null; debounceMs?: number; enabled?: boolean } = {},
) {
  const { resetKey = null, debounceMs = 900, enabled = true } = options;
  const [status, setStatus] = useState<AdminAutosaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef<{ value: T; snapshot: string } | null>(null);
  const baselineRef = useRef<string | null>(null);
  const lastResetKeyRef = useRef(resetKey);
  const latestValueRef = useRef(value);
  latestValueRef.current = value;

  const run = (nextValue: T, snapshot: string) => {
    if (savingRef.current) {
      queuedRef.current = { value: nextValue, snapshot };
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    setErrorMessage("");
    void save(nextValue)
      .then(() => {
        baselineRef.current = snapshot;
        setStatus("saved");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar.");
      })
      .finally(() => {
        savingRef.current = false;
        if (queuedRef.current) {
          const next = queuedRef.current;
          queuedRef.current = null;
          run(next.value, next.snapshot);
        }
      });
  };

  // Resync baseline when the underlying record identity changes (e.g. the
  // admin selected a different row) - this is a fresh load, not an edit.
  useEffect(() => {
    if (resetKey !== lastResetKeyRef.current) {
      lastResetKeyRef.current = resetKey;
      baselineRef.current = value == null ? null : JSON.stringify(value);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!enabled || value == null) return;
    const snapshot = JSON.stringify(value);
    if (snapshot === baselineRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      run(value, snapshot);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, debounceMs]);

  const flush = () => {
    const current = latestValueRef.current;
    if (!timerRef.current || current == null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    run(current, JSON.stringify(current));
  };

  return { status, errorMessage, flush };
}
