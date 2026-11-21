import { describe, expect, it } from "vitest";
import { discountIsOn, type ThemeDiscountControl } from "@/lib/theme-discounts";

const control = (linked: Record<string, string[]>, active: string[]): ThemeDiscountControl => ({
  linked: new Map(Object.entries(linked)),
  activeIds: new Set(active),
});

describe("discountIsOn", () => {
  it("follows the manual switch when no theme controls the discount", () => {
    const none = control({}, []);
    expect(discountIsOn({ id: "d1", active: true }, none)).toBe(true);
    expect(discountIsOn({ id: "d1", active: false }, none)).toBe(false);
  });

  it("is on only while a theme that lists it is active, whatever the manual switch says", () => {
    const linkedIdle = control({ bf20: ["Black Friday"] }, []);
    expect(discountIsOn({ id: "bf20", active: true }, linkedIdle)).toBe(false);
    const linkedLive = control({ bf20: ["Black Friday"] }, ["bf20"]);
    expect(discountIsOn({ id: "bf20", active: false }, linkedLive)).toBe(true);
  });

  it("leaves other discounts alone while a theme is active", () => {
    const live = control({ bf20: ["Black Friday"] }, ["bf20"]);
    expect(discountIsOn({ id: "regular", active: true }, live)).toBe(true);
    expect(discountIsOn({ id: "regular", active: false }, live)).toBe(false);
  });
});
