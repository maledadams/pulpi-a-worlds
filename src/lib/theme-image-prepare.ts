// Browser-side preparation of theme images before upload (spec §5.2, §7, §8):
// - images: longest side at most 3200 px, WebP (keeps transparency), plus 640 /
//   1280 / 1920 px copies for srcset, so phones never download the full size;
// - the tab icon: a square PNG resized to 512 px, plus 48 / 96 / 192 px copies.
// The server re-checks every file's real header, so this is about weight, not trust.

const MAX_SIDE = 3200;
const IMAGE_VARIANT_WIDTHS = [640, 1280, 1920];
const ICON_SIZE = 512;
const ICON_VARIANT_SIZES = [48, 96, 192];
const WEBP_QUALITY = 0.9;
const ACCEPTED = ["image/png", "image/webp", "image/jpeg"];

export type PreparedThemeImage = { main: File; variants: File[]; width: number; height: number };

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  type: "image/webp" | "image/png",
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no puede preparar la imagen.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === "image/webp" ? WEBP_QUALITY : undefined),
  );
  if (!blob) throw new Error("No se pudo preparar la imagen.");
  // A browser without WebP encoding hands back PNG, which the server also accepts.
  const extension = blob.type === "image/png" ? "png" : "webp";
  return new File([blob], `${width}.${extension}`, { type: blob.type });
}

export async function prepareThemeImage(
  file: File,
  kind: "image" | "icon",
): Promise<PreparedThemeImage> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Sube una imagen PNG o WebP (no SVG ni GIF).");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer esa imagen.");
  }
  try {
    if (kind === "icon") {
      if (bitmap.width !== bitmap.height) throw new Error("El ícono tiene que ser cuadrado.");
      if (bitmap.width < ICON_SIZE)
        throw new Error(`El ícono tiene que medir al menos ${ICON_SIZE} × ${ICON_SIZE} px.`);
      const main = await encode(bitmap, ICON_SIZE, ICON_SIZE, "image/png");
      const variants = await Promise.all(
        ICON_VARIANT_SIZES.map((size) => encode(bitmap, size, size, "image/png")),
      );
      return { main, variants, width: ICON_SIZE, height: ICON_SIZE };
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const main = await encode(bitmap, width, height, "image/webp");
    const variants = await Promise.all(
      IMAGE_VARIANT_WIDTHS.filter((variantWidth) => variantWidth < width).map((variantWidth) =>
        encode(
          bitmap,
          variantWidth,
          Math.max(1, Math.round((height * variantWidth) / width)),
          "image/webp",
        ),
      ),
    );
    return { main, variants, width, height };
  } finally {
    bitmap.close();
  }
}

/** The form the upload server function expects. */
export function themeImageFormData(prepared: PreparedThemeImage, kind: "image" | "icon") {
  const form = new FormData();
  form.set("kind", kind);
  form.set("file", prepared.main);
  for (const variant of prepared.variants) form.append("variant", variant);
  return form;
}
