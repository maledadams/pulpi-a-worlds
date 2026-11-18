import { useEffect, useRef, useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-errors";

export type AdminAutosaveStatus = "idle" | "saving" | "saved" | "error";

const UNSET = Symbol("admin-autosave-unset");

// Plain JSON.stringify is sensitive to object key order. A save round-trip
// through the server often comes back with keys in a different order than
// the locally-built draft (different construction path, spread order,
// column order, etc.) even when every value is identical - with a naive
// stringify that reads as "changed" and re-triggers "Guardando..." on the
// very next tick, over and over. Sorting keys recursively before comparing
// makes the snapshot depend only on content, not incidental ordering.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

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
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const queuedRef = useRef<{ value: T; snapshot: string } | null>(null);
  const baselineRef = useRef<string | null>(null);
  // The snapshot whose save just failed. Callers pass a fresh `value` object on
  // every render, so without this a rejected save (e.g. a server validation
  // error) re-scheduled itself every debounce tick forever - hundreds of
  // identical failing requests. Only a real change, or flush(), retries it.
  const failedSnapshotRef = useRef<string | null>(null);
  // A sentinel (never equal to any real resetKey) so the resync effect below
  // always runs on the very first render too - otherwise the initial render's
  // ref starts out equal to the initial resetKey, the "did it change" check is
  // trivially false, the baseline never gets seeded, and every fresh page
  // load/row selection schedules a save of data nobody touched.
  const lastResetKeyRef = useRef<string | number | null | typeof UNSET>(UNSET);
  const latestValueRef = useRef(value);
  const inFlightRef = useRef<Promise<void>>(Promise.resolve());
  latestValueRef.current = value;
  // An edit waiting out its debounce. Switching records or leaving the page
  // used to just cancel the timer, silently dropping whatever was typed in
  // the last second; now that edit is saved right away instead.
  const pendingRef = useRef<{ value: T; snapshot: string } | null>(null);

  const run = (nextValue: T, snapshot: string): Promise<void> => {
    if (savingRef.current) {
      queuedRef.current = { value: nextValue, snapshot };
      return inFlightRef.current;
    }
    savingRef.current = true;
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setStatus("saving");
    setErrorMessage("");
    const promise = save(nextValue)
      .then(() => {
        baselineRef.current = snapshot;
        failedSnapshotRef.current = null;
        setStatus("saved");
        // A permanent "Guardado" pill just sits there taking up space long
        // after it stopped being useful information - fade it back to idle
        // shortly after, like the rest of the admin's toasts already do.
        hideTimerRef.current = setTimeout(() => {
          hideTimerRef.current = null;
          setStatus((current) => (current === "saved" ? "idle" : current));
        }, 1800);
      })
      .catch((error: unknown) => {
        failedSnapshotRef.current = snapshot;
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
  const runRef = useRef(run);
  runRef.current = run;

  const savePending = () => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) void runRef.current(pending.value, pending.snapshot);
  };

  // Leaving the page: save the edit still waiting on its debounce.
  useEffect(() => savePending, []);

  // Resync baseline when the underlying record identity changes (e.g. the
  // admin selected a different row) - this is a fresh load, not an edit.
  useEffect(() => {
    if (resetKey !== lastResetKeyRef.current) {
      // The previous record's not-yet-saved edit is saved, not dropped.
      savePending();
      lastResetKeyRef.current = resetKey;
      baselineRef.current = value == null ? null : stableStringify(value);
      failedSnapshotRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setStatus("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (!enabled || value == null) {
      pendingRef.current = null;
      return;
    }
    const snapshot = stableStringify(value);
    if (snapshot === baselineRef.current || snapshot === failedSnapshotRef.current) {
      pendingRef.current = null;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    pendingRef.current = { value, snapshot };
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      pendingRef.current = null;
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
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (current == null) return inFlightRef.current;
    const snapshot = stableStringify(current);
    if (snapshot === baselineRef.current && !savingRef.current) return inFlightRef.current;
    return run(current, snapshot);
  };

  return { status, errorMessage, flush };
}
