import type { ThemeHeroEffect } from "@/lib/theme-schema";

// The built-in effects' own colors (Lucia, 2026-11-20: each one can be changed in the
// editor). Shared by the canvas engine and the Efecto tab so both always agree. A theme
// stores only the colors it changed (presetColors, by position); the rest stay these.
export const PRESET_COLORS: Partial<Record<ThemeHeroEffect["preset"], string[]>> = {
  snow: ["#ffffff", "#ffffff"],
  hearts: ["#ff4e8a", "#e0245e", "#ff9ec4"],
  clovers: ["#2f9e44", "#51cf66"],
  confetti: ["#ff4ea3", "#ffd43b", "#4dabf7", "#69db7c", "#ff922b", "#ffffff"],
  sparkles: ["#fff6d6", "#ffe066"],
  leaves: ["#d9480f", "#f08c00", "#a0522d"],
  petals: ["#ffc9de", "#ffa8c5", "#fff0f6"],
  fireworks: ["#ffd43b", "#ff6b6b", "#74c0fc", "#b2f2bb", "#ffffff"],
  pride: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#004dff", "#750787"],
};

/** The colors an effect draws with: the theme's changes over the preset's defaults. */
export function effectColors(
  preset: ThemeHeroEffect["preset"],
  changed: ReadonlyArray<string | null> | null | undefined,
): string[] {
  return (PRESET_COLORS[preset] ?? []).map((color, index) => changed?.[index] ?? color);
}
