import { describe, expect, it } from "vitest";
import {
  activeEntryAt,
  entriesInRange,
  findOverlap,
  fromSantoDomingoInput,
  toSantoDomingoInput,
  validateEntry,
  type ScheduleEntry,
} from "@/lib/theme-schedule";

// Santo Domingo local "YYYY-MM-DDTHH:mm" -> stored UTC ISO.
const at = (local: string) => fromSantoDomingoInput(local)!;
const entry = (id: string, start: string, end: string, repeatYearly = false): ScheduleEntry => ({
  id,
  themeId: `theme-${id}`,
  startsAt: at(start),
  endsAt: at(end),
  repeatYearly,
});

describe("Santo Domingo input conversion", () => {
  it("is UTC-4 all year, both ways", () => {
    expect(fromSantoDomingoInput("2026-11-27T00:00")).toBe("2026-11-27T04:00:00.000Z");
    expect(fromSantoDomingoInput("2026-07-01T20:30")).toBe("2026-07-02T00:30:00.000Z");
    expect(toSantoDomingoInput("2026-11-27T04:00:00.000Z")).toBe("2026-11-27T00:00");
    expect(fromSantoDomingoInput("2026-13-01T00:00")).toBeNull();
    expect(fromSantoDomingoInput("nope")).toBeNull();
  });
});

describe("validateEntry", () => {
  it("needs the end after the start", () => {
    expect(validateEntry(entry("a", "2026-11-27T00:00", "2026-11-27T00:00"))).toMatch(/después/);
    expect(validateEntry(entry("a", "2026-11-27T00:00", "2026-11-28T00:00"))).toBeNull();
  });

  it("refuses a yearly entry that lasts a year or more", () => {
    expect(validateEntry(entry("a", "2026-01-01T00:00", "2027-01-01T00:00", true))).toMatch(/año/);
  });
});

describe("activeEntryAt", () => {
  const blackFriday = entry("bf", "2026-11-27T00:00", "2026-11-28T00:00");
  const navidad = entry("nav", "2026-12-20T00:00", "2026-12-26T00:00", true);
  const newYear = entry("ny", "2026-12-31T18:00", "2027-01-02T00:00", true);
  const entries = [blackFriday, navidad, newYear];

  it("is minute-exact: start inclusive, end exclusive", () => {
    expect(activeEntryAt(entries, at("2026-11-26T23:59"))).toBeNull();
    expect(activeEntryAt(entries, at("2026-11-27T00:00"))?.id).toBe("bf");
    expect(activeEntryAt(entries, at("2026-11-27T23:59"))?.id).toBe("bf");
    expect(activeEntryAt(entries, at("2026-11-28T00:00"))).toBeNull();
  });

  it("does not repeat one-off entries", () => {
    expect(activeEntryAt(entries, at("2027-11-27T12:00"))).toBeNull();
  });

  it("repeats yearly entries every year from their first year, never before", () => {
    expect(activeEntryAt(entries, at("2026-12-24T12:00"))?.id).toBe("nav");
    expect(activeEntryAt(entries, at("2029-12-24T12:00"))?.id).toBe("nav");
    expect(activeEntryAt(entries, at("2025-12-24T12:00"))).toBeNull();
  });

  it("handles a yearly range across Dec 31 -> Jan 1", () => {
    expect(activeEntryAt(entries, at("2027-12-31T20:00"))?.id).toBe("ny");
    expect(activeEntryAt(entries, at("2028-01-01T10:00"))?.id).toBe("ny");
    expect(activeEntryAt(entries, at("2028-01-02T00:00"))).toBeNull();
    expect(activeEntryAt(entries, at("2027-01-01T10:00"))?.id).toBe("ny");
  });
});

describe("overlapping ranges", () => {
  const month = entry("nov", "2026-11-01T00:00", "2026-12-01T00:00");
  const bf = entry("bf", "2026-11-27T00:00", "2026-11-28T00:00");
  const cm = entry("cm", "2026-11-27T12:00", "2026-12-01T00:00");

  it("shows the one that started most recently, and the long one again after it", () => {
    expect(activeEntryAt([month, bf], at("2026-11-20T10:00"))?.id).toBe("nov");
    expect(activeEntryAt([month, bf], at("2026-11-27T10:00"))?.id).toBe("bf");
    expect(activeEntryAt([bf, month], at("2026-11-27T10:00"))?.id).toBe("bf");
    expect(activeEntryAt([month, bf], at("2026-11-28T10:00"))?.id).toBe("nov");
    expect(activeEntryAt([month, bf, cm], at("2026-11-27T13:00"))?.id).toBe("cm");
  });

  it("on the same start, the shorter range shows", () => {
    const week = entry("week", "2026-11-27T00:00", "2026-12-04T00:00");
    expect(activeEntryAt([week, bf], at("2026-11-27T10:00"))?.id).toBe("bf");
  });

  it("lists every theme on a day, the one that shows first", () => {
    const day = entriesInRange([month, bf, cm], Date.parse(at("2026-11-27T00:00")), Date.parse(at("2026-11-28T00:00")));
    expect(day.map((hit) => hit.entry.id)).toEqual(["cm", "bf", "nov"]);
    expect(entriesInRange([bf], Date.parse(at("2026-11-28T00:00")), Date.parse(at("2026-11-29T00:00")))).toEqual([]);
  });
});

describe("findOverlap", () => {
  it("allows back-to-back entries and refuses overlapping ones", () => {
    const bf = entry("bf", "2026-11-27T00:00", "2026-11-28T00:00");
    expect(findOverlap([bf], entry("cm", "2026-11-28T00:00", "2026-12-01T00:00"))).toBeNull();
    expect(findOverlap([bf], entry("cm", "2026-11-27T23:00", "2026-12-01T00:00"))?.id).toBe("bf");
  });

  it("ignores the entry being edited", () => {
    const bf = entry("bf", "2026-11-27T00:00", "2026-11-28T00:00");
    expect(findOverlap([bf], { ...bf, endsAt: at("2026-11-29T00:00") })).toBeNull();
  });

  it("catches a one-off falling in a later year of a yearly entry", () => {
    const navidad = entry("nav", "2026-12-20T00:00", "2026-12-26T00:00", true);
    expect(findOverlap([navidad], entry("x", "2028-12-25T10:00", "2028-12-27T00:00"))?.id).toBe(
      "nav",
    );
    expect(findOverlap([navidad], entry("x", "2028-12-26T00:00", "2028-12-27T00:00"))).toBeNull();
    // Before the yearly entry's first year it is free.
    expect(findOverlap([navidad], entry("x", "2025-12-21T00:00", "2025-12-22T00:00"))).toBeNull();
  });

  it("compares two yearly entries on the calendar, including across New Year", () => {
    const newYear = entry("ny", "2026-12-31T18:00", "2027-01-02T00:00", true);
    expect(
      findOverlap([newYear], entry("reyes", "2027-01-01T12:00", "2027-01-07T00:00", true))?.id,
    ).toBe("ny");
    expect(
      findOverlap([newYear], entry("reyes", "2030-01-06T00:00", "2030-01-07T00:00", true)),
    ).toBeNull();
    // A yearly entry that starts years later still meets the other one's recurrence.
    expect(
      findOverlap([newYear], entry("late", "2031-01-01T00:00", "2031-01-01T06:00", true))?.id,
    ).toBe("ny");
  });

  it("handles Feb 29 yearly entries without crashing or false hits", () => {
    const leap = entry("leap", "2028-02-29T00:00", "2028-03-01T00:00", true);
    expect(findOverlap([leap], entry("x", "2029-03-02T00:00", "2029-03-03T00:00"))).toBeNull();
    expect(activeEntryAt([leap], at("2032-02-29T12:00"))?.id).toBe("leap");
  });
});

describe("formatSantoDomingoShort", () => {
  it("formats in Santo Domingo time with plain spaces, the same everywhere", async () => {
    const { formatSantoDomingoShort } = await import("@/lib/theme-schedule");
    expect(formatSantoDomingoShort(at("2026-11-19T17:58"))).toBe("19 nov, 5:58 p. m.");
    expect(formatSantoDomingoShort(at("2026-01-02T00:05"))).toBe("2 ene, 12:05 a. m.");
    expect(formatSantoDomingoShort(at("2026-07-04T12:00"))).toBe("4 jul, 12:00 p. m.");
    expect(formatSantoDomingoShort("nope")).toBe("");
  });
});
