import { describe, expect, it } from "vitest";
import {
  announcementDateProblem,
  formatCountdown,
  isAnnouncementLive,
  splitCountdownText,
} from "@/lib/announcement-schedule";
import { fromSantoDomingoInput } from "@/lib/theme-schedule";

const at = (local: string) => fromSantoDomingoInput(local)!;
const now = (local: string) => Date.parse(at(local));
const base = { id: "a", text: "Black Friday", active: true };

describe("isAnnouncementLive", () => {
  it("behaves as today without dates: on/off and non-empty text", () => {
    expect(isAnnouncementLive(base, now("2026-11-20T10:00"))).toBe(true);
    expect(isAnnouncementLive({ ...base, active: false }, now("2026-11-20T10:00"))).toBe(false);
    expect(isAnnouncementLive({ ...base, text: "   " }, now("2026-11-20T10:00"))).toBe(false);
  });

  it("shows only inside its dates, start inclusive and end exclusive (Santo Domingo)", () => {
    const dated = { ...base, startsAt: at("2026-11-27T00:00"), endsAt: at("2026-11-28T00:00") };
    expect(isAnnouncementLive(dated, now("2026-11-26T23:59"))).toBe(false);
    expect(isAnnouncementLive(dated, now("2026-11-27T00:00"))).toBe(true);
    expect(isAnnouncementLive(dated, now("2026-11-27T23:59"))).toBe(true);
    expect(isAnnouncementLive(dated, now("2026-11-28T00:00"))).toBe(false);
  });

  it("supports only a start or only an end", () => {
    expect(
      isAnnouncementLive({ ...base, startsAt: at("2026-11-27T00:00") }, now("2027-01-01T00:00")),
    ).toBe(true);
    expect(
      isAnnouncementLive({ ...base, endsAt: at("2026-11-27T00:00") }, now("2026-11-27T00:01")),
    ).toBe(false);
  });

  it("is never shown while switched off, dates or not", () => {
    const dated = {
      ...base,
      active: false,
      startsAt: at("2026-11-27T00:00"),
      endsAt: at("2026-11-28T00:00"),
    };
    expect(isAnnouncementLive(dated, now("2026-11-27T12:00"))).toBe(false);
  });

  it("ignores unreadable stored dates instead of hiding the announcement forever", () => {
    expect(
      isAnnouncementLive({ ...base, startsAt: "nope", endsAt: null }, now("2026-11-27T12:00")),
    ).toBe(true);
  });
});

describe("announcementDateProblem", () => {
  it("needs the end after the start", () => {
    expect(
      announcementDateProblem({ startsAt: at("2026-11-28T00:00"), endsAt: at("2026-11-27T00:00") }),
    ).toMatch(/después/);
    expect(
      announcementDateProblem({ startsAt: at("2026-11-27T00:00"), endsAt: at("2026-11-28T00:00") }),
    ).toBeNull();
    expect(announcementDateProblem({ startsAt: null, endsAt: null })).toBeNull();
  });
});

describe("countdowns", () => {
  it("formats the time left, with days only when there are any, never negative", () => {
    expect(formatCountdown(((2 * 24 + 14) * 3600 + 3 * 60 + 9) * 1000)).toBe("2d 14:03:09");
    expect(formatCountdown(59_999)).toBe("00:00:59");
    expect(formatCountdown(-5000)).toBe("00:00:00");
  });

  it("puts the clock where {cuenta} is, or at the end", () => {
    expect(splitCountdownText("Termina en {cuenta} ¡corre!")).toEqual(["Termina en ", " ¡corre!"]);
    expect(splitCountdownText("Black Friday termina en")).toEqual(["Black Friday termina en ", ""]);
  });

  it("hides the announcement once its countdown reaches zero", () => {
    const counting = { ...base, countdownTo: at("2026-11-28T00:00") };
    expect(isAnnouncementLive(counting, now("2026-11-27T23:59"))).toBe(true);
    expect(isAnnouncementLive(counting, now("2026-11-28T00:00"))).toBe(false);
  });
});
