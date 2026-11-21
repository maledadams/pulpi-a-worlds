import type { ThemeAssetRef } from "@/lib/themes";

// What the theme editor shows where a theme points at an image that was deleted from the
// library (Lucia, 2026-11-20): a green-screen cube, impossible to mistake for real art, so
// the spot to fix is obvious. Admin only; the live store never shows it (it falls back to
// the original image, or shows nothing for a sticker or banner).

const CUBE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<polygon points="256,64 448,160 256,256 64,160" fill="#3dff7a"/>
<polygon points="64,160 256,256 256,464 64,368" fill="#00b140"/>
<polygon points="448,160 256,256 256,464 448,368" fill="#00872f"/>
<g fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="6">
<polygon points="256,64 448,160 256,256 64,160"/>
<polyline points="64,160 64,368 256,464 448,368 448,160"/>
<line x1="256" y1="256" x2="256" y2="464"/>
</g>
<g fill="#ffffff" fill-opacity="0.9" font-family="Arial, sans-serif" font-weight="700" text-anchor="middle">
<text x="160" y="352" font-size="34" transform="skewY(26.6) translate(0,-80)">BORRADA</text>
</g>
</svg>`;

export const DELETED_IMAGE_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(CUBE_SVG)}`;

/** A stand-in library entry for a deleted image, square so it fits any slot. */
export const DELETED_IMAGE_REF: ThemeAssetRef = {
  url: DELETED_IMAGE_URL,
  width: 512,
  height: 512,
  variants: [],
};
