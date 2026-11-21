import type { ThemeHomeBanner } from "@/lib/theme-schema";

// Home banner (spec §5.3): a theme's promo image in place of the "Elige tu Tienda" card.

/**
 * Narrowest images that stay crisp. The card is the page width minus 2rem (no max
 * width), so desktop ≈ 1280 CSS px on a large monitor × 2 (retina) and phone ≈ 430
 * CSS px × 3; the editor states and enforces these.
 */
export const BANNER_MIN_WIDTH = { desktop: 2560, phone: 1290 } as const;
/** Tienda's long banner sits between the page margins (≈1300 CSS px wide at most) × retina. */
export const TIENDA_BANNER_MIN_WIDTH = { desktop: 2000, phone: 1080 } as const;

/**
 * Where the banner goes; null for a banner that links nowhere. A collection or product
 * that no longer exists sends people to /tienda.
 */
export function bannerPath(link: ThemeHomeBanner["link"], targetExists: boolean): string | null {
  switch (link.kind) {
    case "none":
      return null;
    case "tienda":
      return "/tienda";
    case "moon":
    case "sunshine":
    case "men":
      return `/${link.kind}`;
    case "collection":
      return targetExists ? `/coleccion/${encodeURIComponent(link.slug)}` : "/tienda";
    case "product":
      return targetExists ? `/producto/${encodeURIComponent(link.slug)}` : "/tienda";
  }
}

/** Why an image is too narrow for its slot, or null when it is fine. */
export function bannerImageProblem(
  width: number,
  device: "desktop" | "phone",
  page: "home" | "tienda" = "home",
) {
  const min = (page === "tienda" ? TIENDA_BANNER_MIN_WIDTH : BANNER_MIN_WIDTH)[device];
  if (width >= min) return null;
  const label = device === "desktop" ? "computadora" : "teléfono";
  const screens = device === "desktop" ? "pantallas grandes" : "teléfonos";
  return `La imagen de ${label} mide ${width} px de ancho; necesita al menos ${min} px para verse nítida en ${screens}.`;
}
