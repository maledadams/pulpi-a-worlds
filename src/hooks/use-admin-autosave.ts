import { useEffect, useRef, useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-errors";

export type AdminAutosaveStatus = "idle" | "saving" | "saved" | "error";

const UNSET = Symbol("admin-autosave-unset");

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
  // A sentinel (never equal to any real resetKey) so the resync effect below
  // always runs on the very first render too - otherwise the initial render's
  // ref starts out equal to the initial resetKey, the "did it change" check is
  // trivially false, the baseline never gets seeded, and every fresh page
  // load/row selection schedules a save of data nobody touched.
  const lastResetKeyRef = useRef<string | number | null | typeof UNSET>(UNSET);
  const latestValueRef = useRef(value);
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());
  latestValueRef.current = value;

  const run = (nextValue: T, snapshot: string): Promise<void> => {
    if (savingRef.current) {
      queuedRef.current = { value: nextValue, snapshot };
      return inFlightRef.current;
    }
    savingRef.current = true;
    setStatus("saving");
    setErrorMessage("");
    const promise = save(nextValue)
      .then(() => {
        baselineRef.current = snapshot;
        setStatus("saved");
      })
      .catch((error: unknown) => {
        setStatus("error");
        setErrorMessage(getAdminErrorMessage(error));
      })
      .finally(() => {
        savingRef.current = false;
        if (queuedRef.current) {
          const next = queuedRef.current;
          queuedRef.current = null;
          inFlightRef.current = run(next.value, next.snapshot);
        }
      });
    inFlightRef.current = promise;
    return promise;
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

  // Returns a promise that resolves once any pending/in-flight save settles -
  // callers that need to know the record is durably persisted before doing
  // something else (e.g. a stock adjustment that will overwrite the local
  // draft with the server's response) should await this first.
  const flush = (): Promise<void> => {
    const current = latestValueRef.current;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (current == null) return inFlightRef.current;
    const snapshot = JSON.stringify(current);
    if (snapshot === baselineRef.current && !savingRef.current) return inFlightRef.current;
    return run(current, snapshot);
  };

  return { status, errorMessage, flush };
}
