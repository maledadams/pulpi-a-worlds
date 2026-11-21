import type { ThemeHeroEffect } from "@/lib/theme-schema";

// How much a hero effect may draw (spec §5.4, §8: old phones first). Pure, so the
// limits are tested; the canvas engine only follows them.

export type HeroId = "home" | "moon" | "sunshine" | "men";
export type DeviceProfile = { cores: number; memoryGb: number; isPhone: boolean };

const BASE_COUNT = { low: 22, medium: 48, high: 85 } as const;
/** The hero size the base counts are tuned for. */
const REFERENCE_AREA = 1440 * 720;

export function isWeakDevice(device: DeviceProfile) {
  return device.cores <= 4 || device.memoryGb <= 4;
}

export function particleBudget(input: {
  width: number;
  height: number;
  density: ThemeHeroEffect["density"];
  preset: ThemeHeroEffect["preset"];
  device: DeviceProfile;
}) {
  if (input.preset === "pride") return 0;
  const areaScale = Math.sqrt(Math.max(1, input.width * input.height) / REFERENCE_AREA);
  let count = BASE_COUNT[input.density] * areaScale;
  if (isWeakDevice(input.device)) count *= 0.5;
  if (input.device.isPhone) count *= 0.6;
  // Fireworks burst many sparks per rocket: the count is rockets × sparks, kept the lowest.
  if (input.preset === "fireworks") count *= 0.5;
  return Math.round(Math.min(120, Math.max(6, count)));
}

/** Canvas pixel density: never above 2, and 1.5 on weak devices. */
export function pixelRatioCap(devicePixelRatio: number, device: DeviceProfile) {
  return Math.min(devicePixelRatio, isWeakDevice(device) ? 1.5 : 2);
}

export function effectAllowed(
  effect: Pick<ThemeHeroEffect, "phone" | "heroes"> | null | undefined,
  hero: HeroId,
  environment: { reducedMotion: boolean; saveData: boolean; isPhone: boolean },
) {
  if (!effect || !effect.heroes[hero]) return false;
  if (environment.reducedMotion || environment.saveData) return false;
  if (environment.isPhone && !effect.phone) return false;
  return true;
}
