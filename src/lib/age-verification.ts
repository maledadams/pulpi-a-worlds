import { useSyncExternalStore } from "react";

export type AgeAnswer = "adult" | "minor";

const STORAGE_KEY = "pulpina-age-answer";
const LEGACY_KEY = "pulpina-age-ok-until";
const REMEMBER_MS = 3 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();
let cached: AgeAnswer | null | undefined;

function read(): AgeAnswer | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { answer?: AgeAnswer; until?: number };
      if ((parsed.answer === "adult" || parsed.answer === "minor") && (parsed.until ?? 0) > Date.now()) {
        return parsed.answer;
      }
      return null;
    }
    // Visitors who confirmed before minors were allowed in.
    const legacyUntil = Number(window.localStorage.getItem(LEGACY_KEY));
    return Number.isFinite(legacyUntil) && legacyUntil > Date.now() ? "adult" : null;
  } catch {
    return null;
  }
}

function getSnapshot() {
  if (cached === undefined) cached = read();
  return cached;
}

export function setAgeAnswer(answer: AgeAnswer) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ answer, until: Date.now() + REMEMBER_MS }));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Storage blocked (private mode): the answer still holds for this page view.
  }
  cached = answer;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// null until the visitor answers (and always on the server), which callers
// treat the same as "minor" so adult items never flash before the answer.
export function useAgeAnswer() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function useIsVerifiedAdult() {
  return useAgeAnswer() === "adult";
}
