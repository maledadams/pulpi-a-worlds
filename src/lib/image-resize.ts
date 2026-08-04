const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.85;
const SKIP_BELOW_BYTES = 600 * 1024;

/**
 * Downscales and re-encodes an uploaded image to WebP in the browser before
 * it ever reaches R2, so every product/category photo served to customers
 * is already sized for how it's actually displayed (nothing here shows an
 * image wider than ~800px) instead of shipping whatever multi-MB original a
 * phone camera produced. 1600px longest edge and 0.85 quality are well
 * above anything visibly needed at display size - this is not a quality
 * trade-off in practice, just removing bytes nothing renders.
 *
 * Falls back to the original file untouched if anything about the input or
 * the browser's capabilities makes resizing unsafe (SVG/GIF, decode failure,
 * missing canvas support, or a "resized" result that isn't actually smaller).
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const newName = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
    return new File([blob], newName, { type: "image/webp", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
