import type { StickerArea } from "@/lib/theme-schema";
import type { ThemeAssetRef } from "@/lib/themes";

// Messages between the admin theme editor and its storefront preview frame
// (?themePreview=<id>), same origin only. See src/context/theme.tsx.
export const THEME_PREVIEW_READY = "pulpina:theme-preview-ready";
export const THEME_PREVIEW_DRAFT = "pulpina:theme-preview-draft";
/** The editor's iframe name: survives a full reload inside the frame, unlike ?themePreview. */
export const THEME_PREVIEW_FRAME_NAME = "pulpina-theme-preview";

export type ThemePreviewDraftMessage = {
  type: typeof THEME_PREVIEW_DRAFT;
  doc: unknown;
  assets: Record<string, ThemeAssetRef>;
};

/** The preview tells the editor a sticker was dragged to a new center (percent of its area). */
export const THEME_PREVIEW_STICKER_MOVED = "pulpina:theme-preview-sticker-moved";

export type ThemePreviewStickerMoved = {
  type: typeof THEME_PREVIEW_STICKER_MOVED;
  area: StickerArea;
  index: number;
  device: "desktop" | "mobile";
  x: number;
  y: number;
  /** New width (percent of its area) when the sticker was resized instead of moved. */
  w?: number;
  /** New rotation (degrees) when the sticker was turned with its handle. */
  rot?: number;
  /** New mirror state when its flip button was pressed. */
  flip?: boolean;
};
