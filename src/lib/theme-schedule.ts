// Theme schedule (spec §4.4): which theme a date range turns on, in Santo Domingo
// time, minute-precise (start inclusive, end exclusive). Pure functions.
//
// Ranges may overlap (Lucia, 2026-11-20: a short holiday inside a longer theme). Where
// they do, the one that started most recently shows; on a tie, the shorter one; then the
// one listed first. So a holiday inside a month-long theme takes over for its days and
// the long one comes back after it.

export type ScheduleEntry = {
  id: string;
  themeId: string;
  /** UTC ISO instants. */
  startsAt: string;
  endsAt: string;
  /** Same dates every year from the first year on (Navidad, San Valentín). */
  repeatYearly: boolean;
};

// The Dominican Republic is UTC-4 all year (no daylight saving).
const OFFSET_MS = 4 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type Local = { year: number; month: number; day: number; hour: number; minute: number };

function toLocal(ms: number): Local {
  const local = new Date(ms - OFFSET_MS);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth(),
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
  };
}

function fromLocal(year: number, { month, day, hour, minute }: Omit<Local, "year">) {
  // Feb 29 in a non-leap year rolls over to Mar 1, which never creates a false overlap.
  return Date.UTC(year, month, day, hour, minute) + OFFSET_MS;
}

/** "YYYY-MM-DDTHH:mm" typed in Santo Domingo -> UTC ISO; null when it isn't a real date. */
export function fromSantoDomingoInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const ms = fromLocal(year, { month: month - 1, day, hour, minute });
  const back = toLocal(ms);
  if (
    back.year !== year ||
    back.month !== month - 1 ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    return null;
  }
  return new Date(ms).toISOString();
}

/** UTC ISO -> "YYYY-MM-DDTHH:mm" in Santo Domingo, for <input type="datetime-local">. */
export function toSantoDomingoInput(iso: string): string {
  const { year, month, day, hour, minute } = toLocal(Date.parse(iso));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/** Message for an invalid entry, or null. */
export function validateEntry(entry: ScheduleEntry): string | null {
  const start = Date.parse(entry.startsAt);
  const end = Date.parse(entry.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Fecha inválida.";
  if (end <= start) return "El final tiene que ser después del inicio.";
  if (entry.repeatYearly && end - start >= 365 * DAY_MS)
    return "Un rango que se repite cada año tiene que durar menos de un año.";
  return null;
}

/** [start, end) of each occurrence whose year (of its start, local) is within [fromYear, toYear]. */
function occurrences(
  entry: ScheduleEntry,
  fromYear: number,
  toYear: number,
): Array<[number, number]> {
  const start = Date.parse(entry.startsAt);
  const end = Date.parse(entry.endsAt);
  if (!entry.repeatYearly) return [[start, end]];
  const localStart = toLocal(start);
  const localEnd = toLocal(end);
  const yearSpan = localEnd.year - localStart.year;
  const list: Array<[number, number]> = [];
  for (let year = Math.max(fromYear, localStart.year); year <= toYear; year++) {
    const occurrenceStart = fromLocal(year, localStart);
    const occurrenceEnd = fromLocal(year + yearSpan, localEnd);
    if (occurrenceEnd > occurrenceStart) list.push([occurrenceStart, occurrenceEnd]);
  }
  return list;
}

/**
 * Every entry touching [fromMs, toMs), with the occurrence that does, highest priority
 * first (latest start, then shortest, then list order).
 */
export function entriesInRange<T extends ScheduleEntry>(
  entries: T[],
  fromMs: number,
  toMs: number,
): Array<{ entry: T; start: number; end: number }> {
  const fromYear = toLocal(fromMs).year - 1; // a yearly range can start the year before
  const toYear = toLocal(toMs).year;
  const hits: Array<{ entry: T; start: number; end: number; order: number }> = [];
  entries.forEach((entry, order) => {
    const hit = occurrences(entry, fromYear, toYear).find(
      ([start, end]) => start < toMs && fromMs < end,
    );
    if (hit) hits.push({ entry, start: hit[0], end: hit[1], order });
  });
  hits.sort(
    (a, b) => b.start - a.start || a.end - a.start - (b.end - b.start) || a.order - b.order,
  );
  return hits.map(({ entry, start, end }) => ({ entry, start, end }));
}

/** The entry that shows at this instant (see the overlap rule above), or null. */
export function activeEntryAt<T extends ScheduleEntry>(
  entries: T[],
  instant: string | number,
): T | null {
  const now = typeof instant === "number" ? instant : Date.parse(instant);
  return entriesInRange(entries, now, now + 1)[0]?.entry ?? null;
}

/** The first existing entry the candidate overlaps (the candidate's own id ignored), or null. */
export function findOverlap(
  entries: ScheduleEntry[],
  candidate: ScheduleEntry,
): ScheduleEntry | null {
  const candidateYears = [
    toLocal(Date.parse(candidate.startsAt)).year,
    toLocal(Date.parse(candidate.endsAt)).year,
  ];
  for (const other of entries) {
    if (other.id === candidate.id) continue;
    const otherYears = [
      toLocal(Date.parse(other.startsAt)).year,
      toLocal(Date.parse(other.endsAt)).year,
    ];
    let fromYear: number;
    let toYear: number;
    if (!candidate.repeatYearly || !other.repeatYearly) {
      // One fixed range bounds the window.
      const fixed = !candidate.repeatYearly ? candidateYears : otherYears;
      fromYear = fixed[0]! - 1;
      toYear = fixed[1]!;
    } else {
      // Both repeat: the pattern repeats every year (every 4 for Feb 29) once both have started.
      fromYear = Math.max(candidateYears[0]!, otherYears[0]!) - 1;
      toYear = fromYear + 9;
    }
    const mine = occurrences(candidate, fromYear, toYear);
    const theirs = occurrences(other, fromYear, toYear);
    if (
      mine.some(([aStart, aEnd]) => theirs.some(([bStart, bEnd]) => aStart < bEnd && bStart < aEnd))
    )
      return other;
  }
  return null;
}

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * "19 nov, 5:58 p. m." in Santo Domingo time. Built by hand, not with toLocaleString, so the
 * server and the browser produce the same text (their ICU data differ: "p. m." vs "p. m."),
 * which avoids a hydration mismatch in the admin.
 */
export function formatSantoDomingoShort(iso: string) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const { month, day, hour, minute } = toLocal(ms);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${day} ${SHORT_MONTHS[month]}, ${hour12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "a. m." : "p. m."}`;
}
