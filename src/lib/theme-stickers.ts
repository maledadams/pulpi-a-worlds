import {
  STICKER_LIMITS,
  type StickerArea,
  type ThemeFit,
  type ThemeSticker,
} from "@/lib/theme-schema";

// Which stickers a page draws (spec §5.2, §8): its areas in order, at most 8 on
// desktop and 5 visible on phones for the whole page (home + general + footer +
// dropdown count together), 3 on product pages.

export type PickedSticker = {
  area: StickerArea;
  index: number;
  sticker: ThemeSticker;
  onPhone: boolean;
};

export function pickPageStickers(
  stickers: Partial<Record<StickerArea, ThemeSticker[]>>,
  areas: StickerArea[],
): PickedSticker[] {
  const max = areas.includes("product") ? STICKER_LIMITS.product : STICKER_LIMITS.desktop;
  const picked: PickedSticker[] = [];
  let onPhoneCount = 0;
  for (const area of areas) {
    for (const [index, sticker] of (stickers[area] ?? []).entries()) {
      if (picked.length >= max) return picked;
      const onPhone = !sticker.hideOnPhone && onPhoneCount < STICKER_LIMITS.phone;
      if (onPhone) onPhoneCount++;
      picked.push({ area, index, sticker, onPhone });
    }
  }
  return picked;
}

function fitVars(fit: ThemeFit, prefix: "" | "d") {
  const p = prefix ? `-${prefix}` : "-";
  return {
    [`--st${p}x`]: `${fit.x}%`,
    [`--st${p}y`]: `${fit.y}%`,
    [`--st${p}w`]: `${fit.w}%`,
    [`--st${p}rot`]: `${fit.rot}deg`,
    // The same height as a plain number, for page stickers (measured in screens).
    [`--st${p}yn`]: String(fit.y),
  };
}

/** CSS variables for .theme-sticker: phone values, then desktop (from the md breakpoint). */
export function stickerStyle(sticker: ThemeSticker): Record<string, string> {
  return {
    ...fitVars(sticker.mobile, ""),
    ...fitVars(sticker.desktop, "d"),
    ...(sticker.flip ? { "--st-flip": "-1" } : {}),
  };
}
