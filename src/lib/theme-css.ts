import { isAdminRoutePath } from "@/lib/admin-access";
import { isThemeColor, type StickerArea, type Theme } from "@/lib/theme-schema";
import { THEME_TOKENS, resolveTokenValues } from "@/lib/theme-tokens";

// The color lock (spec §4.5), enforced here by construction:
// - General colors are set only on html[data-theme-scope="general"], which the root
//   shell puts on general pages and checkout (never on Moon/Sunshine/Men pages,
//   their collections, any product page or the admin).
// - Sub-brand pieces that show up on general pages (their product cards, the
//   header and dropdown while hovering a sub-store) are reset to the defaults
//   by a zero-specificity rule, so their own [data-vibe] palettes still win and
//   everything else they read looks exactly like today.
// - Announcement bar colors (the approved exception) go on html:root, as --t-ann-* only.

export type ThemeScope = "general";

const GENERAL = 'html[data-theme-scope="general"]';
const LOCK = ':where(html[data-theme-scope="general"] :is([data-vibe], .theme-lock))';

/** Which pages a theme's general colors reach. Collections need their vibe; unknown means locked. */
export function themeScopeForPath(
  pathname: string,
  collectionVibe?: string | null,
): ThemeScope | null {
  if (isAdminRoutePath(pathname) || pathname.startsWith("/acceso-admin")) return null;
  if (pathname.startsWith("/producto/")) return null;
  const section = pathname.split("/")[1] ?? "";
  if (section === "moon" || section === "sunshine" || section === "men") return null;
  if (section === "coleccion") return collectionVibe === "store" ? "general" : null;
  return "general";
}

/** The theme's color CSS, or "" when it changes no color (Sin tema costs nothing). */
export function buildThemeCss(theme: Theme | null): string {
  if (!theme) return "";
  const values = resolveTokenValues(theme.colors);
  let general = "";
  let lock = "";
  let announcements = "";
  for (const token of THEME_TOKENS) {
    const value = values[token.id];
    // Defense in depth: values were validated on save and on read; check once more before they become CSS.
    if (!value || !isThemeColor(value)) continue;
    const css = token.rgbTriplet ? cssColorToRgbTriplet(value) : value;
    if (!css) continue;
    if (token.scope === "general") {
      general += `${token.cssVar}:${css};`;
      lock += `${token.cssVar}:${token.rootless ? "initial" : token.default};`;
    } else {
      announcements += `${token.cssVar}:${value};`;
    }
  }
  let css = "";
  if (general) css += `${GENERAL}{${general}}${LOCK}{${lock}}`;
  // html:root, not html: it has to outweigh the :root defaults in styles.css.
  if (announcements) css += `html:root{${announcements}}`;
  return css;
}

/** "r, g, b" from a theme color (hex or rgb/rgba), for code that adds its own alpha; null if unreadable. */
export function cssColorToRgbTriplet(value: string): string | null {
  const color = value.trim();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(color);
  if (hex)
    return hex
      .slice(1, 4)
      .map((part) => parseInt(part, 16))
      .join(", ");
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(color);
  if (rgb && [rgb[1], rgb[2], rgb[3]].every((channel) => Number(channel) <= 255)) {
    return `${Number(rgb[1])}, ${Number(rgb[2])}, ${Number(rgb[3])}`;
  }
  return null;
}

/**
 * Sticker areas shown on a page (spec §2, §5.2). The cream/general dropdown panel can
 * open on any storefront page; the footer takes stickers only on general pages.
 */
export function stickerAreasForPath(
  pathname: string,
  collectionVibe?: string | null,
): StickerArea[] {
  if (isAdminRoutePath(pathname) || pathname.startsWith("/acceso-admin")) return [];
  const section = pathname.split("/")[1] ?? "";
  if (section === "producto") return ["product", "dropdown"];
  if (section === "moon" || section === "sunshine" || section === "men")
    return [section, "dropdown"];
  if (section === "carrito" || section === "solicitud") return ["checkout", "dropdown"];
  if (section === "coleccion" && collectionVibe !== "store") return ["collection", "dropdown"];
  return [...(pathname === "/" ? (["home"] as const) : []), "general", "footer", "dropdown"];
}
