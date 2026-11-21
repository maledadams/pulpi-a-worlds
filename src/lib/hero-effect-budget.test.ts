import { describe, expect, it } from "vitest";
import { effectAllowed, particleBudget, pixelRatioCap } from "@/lib/hero-effect-budget";

const strong = { cores: 8, memoryGb: 8, isPhone: false };
const weak = { cores: 2, memoryGb: 2, isPhone: true };
const desktopHero = { width: 1440, height: 720 };

describe("particleBudget", () => {
  it("grows with density", () => {
    const low = particleBudget({ ...desktopHero, density: "low", preset: "snow", device: strong });
    const medium = particleBudget({
      ...desktopHero,
      density: "medium",
      preset: "snow",
      device: strong,
    });
    const high = particleBudget({
      ...desktopHero,
      density: "high",
      preset: "snow",
      device: strong,
    });
    expect(low).toBeLessThan(medium);
    expect(medium).toBeLessThan(high);
  });

  it("scales with the hero's size", () => {
    const big = particleBudget({
      ...desktopHero,
      density: "medium",
      preset: "snow",
      device: strong,
    });
    const small = particleBudget({
      width: 390,
      height: 420,
      density: "medium",
      preset: "snow",
      device: strong,
    });
    expect(small).toBeLessThan(big);
  });

  it("cuts the count on weak devices and phones", () => {
    const onStrong = particleBudget({
      ...desktopHero,
      density: "high",
      preset: "snow",
      device: strong,
    });
    const onWeak = particleBudget({
      ...desktopHero,
      density: "high",
      preset: "snow",
      device: weak,
    });
    expect(onWeak).toBeLessThanOrEqual(onStrong / 3);
  });

  it("keeps fireworks the strictest and everything within 6..120", () => {
    const fireworks = particleBudget({
      ...desktopHero,
      density: "high",
      preset: "fireworks",
      device: strong,
    });
    const snow = particleBudget({
      ...desktopHero,
      density: "high",
      preset: "snow",
      device: strong,
    });
    expect(fireworks).toBeLessThan(snow);
    expect(
      particleBudget({ width: 10, height: 10, density: "low", preset: "snow", device: weak }),
    ).toBe(6);
    expect(
      particleBudget({
        width: 9000,
        height: 9000,
        density: "high",
        preset: "snow",
        device: strong,
      }),
    ).toBe(120);
  });

  it("uses no particles for the pride wash", () => {
    expect(
      particleBudget({ ...desktopHero, density: "high", preset: "pride", device: strong }),
    ).toBe(0);
  });
});

describe("pixelRatioCap", () => {
  it("caps sharpness at 1.5 on weak devices and 2 otherwise", () => {
    expect(pixelRatioCap(3, weak)).toBe(1.5);
    expect(pixelRatioCap(3, strong)).toBe(2);
    expect(pixelRatioCap(1, strong)).toBe(1);
  });
});

describe("effectAllowed", () => {
  const effect = { phone: true, heroes: { home: true, moon: false, sunshine: false, men: false } };
  const ok = { reducedMotion: false, saveData: false, isPhone: false };

  it("runs only on the heroes it was turned on for", () => {
    expect(effectAllowed(effect, "home", ok)).toBe(true);
    expect(effectAllowed(effect, "moon", ok)).toBe(false);
  });

  it("never runs with reduced motion or data saver", () => {
    expect(effectAllowed(effect, "home", { ...ok, reducedMotion: true })).toBe(false);
    expect(effectAllowed(effect, "home", { ...ok, saveData: true })).toBe(false);
  });

  it("respects the phone switch", () => {
    expect(effectAllowed({ ...effect, phone: false }, "home", { ...ok, isPhone: true })).toBe(
      false,
    );
    expect(effectAllowed(effect, "home", { ...ok, isPhone: true })).toBe(true);
  });

  it("does nothing without an effect", () => {
    expect(effectAllowed(null, "home", ok)).toBe(false);
  });
});
