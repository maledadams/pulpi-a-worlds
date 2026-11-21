// Announcement dates (spec §5.6b): each announcement can have an optional start and end
// (UTC ISO, entered in Santo Domingo time). Without dates it behaves as before: shown
// while switched on. Start inclusive, end exclusive, like the theme schedule.

export type DatedAnnouncement = {
  text: string;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  /** A countdown announcement also ends when its countdown reaches zero. */
  countdownTo?: string | null;
};

function instant(value: string | null | undefined) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function isAnnouncementLive(announcement: DatedAnnouncement, now: number) {
  if (!announcement.active || announcement.text.trim().length === 0) return false;
  const start = instant(announcement.startsAt);
  const end = instant(announcement.endsAt);
  if (start !== null && now < start) return false;
  if (end !== null && now >= end) return false;
  const target = instant(announcement.countdownTo);
  if (target !== null && now >= target) return false;
  return true;
}

/** Where the clock goes in the text; without it, the clock goes at the end. */
export const COUNTDOWN_TOKEN = "{cuenta}";

/** Time left as "2d 14:03:09", or "14:03:09" under a day; "00:00:00" once it's over. */
export function formatCountdown(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(total / 86400);
  const pad = (value: number) => String(value).padStart(2, "0");
  const clock = `${pad(Math.floor((total % 86400) / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
  return days > 0 ? `${days}d ${clock}` : clock;
}

/** The text around the clock: [before, after]. */
export function splitCountdownText(text: string): [string, string] {
  const at = text.indexOf(COUNTDOWN_TOKEN);
  if (at === -1) return [`${text.trimEnd()} `, ""];
  return [text.slice(0, at), text.slice(at + COUNTDOWN_TOKEN.length)];
}

/** Message when the dates can't work, or null. */
export function announcementDateProblem(dates: {
  startsAt?: string | null;
  endsAt?: string | null;
}) {
  const start = instant(dates.startsAt);
  const end = instant(dates.endsAt);
  if (start !== null && end !== null && end <= start)
    return "El final del anuncio tiene que ser después del inicio.";
  return null;
}
