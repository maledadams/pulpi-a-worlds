import type { ThemeFit, ThemeSlotId } from "@/lib/theme-schema";
import type { ThemeSlice } from "@/lib/themes";

// Existing images a theme may keep, hide or replace (spec §3). With no theme, or a
// slot the theme leaves alone, the original image renders exactly as today.

export type SlotRender =
  | { kind: "keep"; src: string }
  | { kind: "hide" }
  | { kind: "replace"; src: string; width: number; height: number; style: Record<string, string> };

const DEFAULT_FIT: ThemeFit = { x: 50, y: 50, w: 100, rot: 0 };

function fitVars(fit: ThemeFit, prefix: "" | "d") {
  const p = prefix ? `-${prefix}` : "-";
  return {
    [`--fit${p}x`]: `${fit.x}%`,
    [`--fit${p}y`]: `${fit.y}%`,
    [`--fit${p}scale`]: `${fit.w / 100}`,
    [`--fit${p}rot`]: `${fit.rot}deg`,
  };
}

export function resolveSlot(
  slice: ThemeSlice | null,
  slotId: ThemeSlotId,
  original: string,
): SlotRender {
  const slot = slice?.slots[slotId];
  if (!slot || slot.mode === "keep") return { kind: "keep", src: original };
  if (slot.mode === "hide") return { kind: "hide" };
  const asset = slice?.assets[slot.asset];
  // A replacement whose image is gone falls back to the original instead of a broken image.
  if (!asset) return { kind: "keep", src: original };
  const desktop = slot.desktop ?? DEFAULT_FIT;
  const mobile = slot.mobile ?? desktop;
  return {
    kind: "replace",
    src: asset.url,
    width: asset.width,
    height: asset.height,
    style: { ...fitVars(mobile, ""), ...fitVars(desktop, "d") },
  };
}

/** The image's own classes, plus the fit class only when a theme replaced it. */
export function slotClassName(render: SlotRender, className: string | undefined) {
  if (render.kind !== "replace") return className;
  return className ? `${className} theme-fit` : "theme-fit";
}
