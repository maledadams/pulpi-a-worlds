// Theme uploads are PNG or WebP only (spec §5.2: no SVG). The server reads the
// file's own header instead of trusting its name or declared type, and takes the
// real width and height from it (they're stored so images never shift layout).

export type ImageInfo = { type: "image/png" | "image/webp"; width: number; height: number };

const MAX_SIDE = 10_000;

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function valid(info: ImageInfo): ImageInfo | null {
  const ok = [info.width, info.height].every(
    (side) => Number.isInteger(side) && side > 0 && side <= MAX_SIDE,
  );
  return ok ? info : null;
}

export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    ascii(bytes, 1, 3) === "PNG" &&
    ascii(bytes, 12, 4) === "IHDR"
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return valid({ type: "image/png", width: view.getUint32(16), height: view.getUint32(20) });
  }

  if (bytes.length >= 16 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    const chunk = ascii(bytes, 12, 4);
    const at = (index: number) => bytes[index]!;
    if (
      chunk === "VP8 " &&
      bytes.length >= 30 &&
      at(23) === 0x9d &&
      at(24) === 0x01 &&
      at(25) === 0x2a
    ) {
      return valid({
        type: "image/webp",
        width: (at(26) | (at(27) << 8)) & 0x3fff,
        height: (at(28) | (at(29) << 8)) & 0x3fff,
      });
    }
    if (chunk === "VP8L" && bytes.length >= 25 && at(20) === 0x2f) {
      const bits = at(21) | (at(22) << 8) | (at(23) << 16) | (at(24) << 24);
      return valid({
        type: "image/webp",
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      });
    }
    if (chunk === "VP8X" && bytes.length >= 30) {
      return valid({
        type: "image/webp",
        width: (at(24) | (at(25) << 8) | (at(26) << 16)) + 1,
        height: (at(27) | (at(28) << 8) | (at(29) << 16)) + 1,
      });
    }
  }

  return null;
}
