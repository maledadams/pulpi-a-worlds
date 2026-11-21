import type { ImgHTMLAttributes } from "react";
import { useActiveTheme } from "@/context/theme";
import type { ThemeSlotId } from "@/lib/theme-schema";
import { resolveSlot, slotClassName, type SlotRender } from "@/lib/theme-slots";

// A transparent 1×1 GIF: a hidden slot keeps its place without loading anything.
const HIDDEN_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** How the active theme renders this existing image (keep / hide / replace). */
export function useThemeSlot(slot: ThemeSlotId, original: string): SlotRender {
  return resolveSlot(useActiveTheme(), slot, original);
}

/**
 * An existing site image a theme may keep, hide or replace (spec §3). With no theme
 * it renders the same <img> as before; a replacement keeps the original's classes
 * (box, object-fit) and adds the theme's position, size and rotation.
 */
export function ThemeImage({
  slot,
  src,
  className,
  style,
  ...rest
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { slot: ThemeSlotId; src: string }) {
  const render = useThemeSlot(slot, src);
  if (render.kind === "hide") {
    // Hidden, not removed: the image keeps its box so the layout around it doesn't
    // move (a title between two phones stays centered).
    return (
      <img
        {...rest}
        src={HIDDEN_PIXEL}
        alt=""
        aria-hidden="true"
        className={className}
        style={{ ...style, visibility: "hidden" }}
      />
    );
  }
  return (
    <img
      {...rest}
      src={render.src}
      className={slotClassName(render, className)}
      style={render.kind === "replace" ? { ...style, ...render.style } : style}
    />
  );
}
