import { describe, expect, it } from "vitest";
import { readImageInfo } from "@/lib/theme-image-info";

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
const u32be = (value: number) => [
  (value >>> 24) & 255,
  (value >>> 16) & 255,
  (value >>> 8) & 255,
  value & 255,
];
const u16le = (value: number) => [value & 255, (value >>> 8) & 255];
const u24le = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255];

function png(width: number, height: number) {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
    0,
    0,
    0,
    13,
    ...ascii("IHDR"),
    ...u32be(width),
    ...u32be(height),
    8,
    6,
    0,
    0,
    0,
  ]);
}

function webp(chunk: "VP8 " | "VP8L" | "VP8X", body: number[]) {
  return new Uint8Array([
    ...ascii("RIFF"),
    0,
    0,
    0,
    0,
    ...ascii("WEBP"),
    ...ascii(chunk),
    0,
    0,
    0,
    0,
    ...body,
  ]);
}

describe("readImageInfo", () => {
  it("reads PNG dimensions from IHDR", () => {
    expect(readImageInfo(png(2560, 1440))).toEqual({
      type: "image/png",
      width: 2560,
      height: 1440,
    });
  });

  it("reads lossy WebP (VP8) dimensions", () => {
    const body = [0, 0, 0, 0x9d, 0x01, 0x2a, ...u16le(1290), ...u16le(800)];
    expect(readImageInfo(webp("VP8 ", body))).toEqual({
      type: "image/webp",
      width: 1290,
      height: 800,
    });
  });

  it("reads lossless WebP (VP8L) dimensions", () => {
    const width = 512;
    const height = 300;
    const packed = (width - 1) | ((height - 1) << 14);
    const body = [
      0x2f,
      packed & 255,
      (packed >>> 8) & 255,
      (packed >>> 16) & 255,
      (packed >>> 24) & 255,
    ];
    expect(readImageInfo(webp("VP8L", body))).toEqual({ type: "image/webp", width, height });
  });

  it("reads extended WebP (VP8X, transparent) dimensions", () => {
    const body = [0x10, 0, 0, 0, ...u24le(1999), ...u24le(999)];
    expect(readImageInfo(webp("VP8X", body))).toEqual({
      type: "image/webp",
      width: 2000,
      height: 1000,
    });
  });

  it("refuses SVG, GIF, JPEG, truncated or empty files", () => {
    expect(
      readImageInfo(new Uint8Array(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))),
    ).toBeNull();
    expect(readImageInfo(new Uint8Array(ascii("GIF89a\u0001\u0000\u0001\u0000")))).toBeNull();
    expect(readImageInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16]))).toBeNull();
    expect(readImageInfo(png(10, 10).slice(0, 18))).toBeNull();
    expect(readImageInfo(new Uint8Array())).toBeNull();
  });

  it("refuses zero or absurd dimensions", () => {
    expect(readImageInfo(png(0, 10))).toBeNull();
    expect(readImageInfo(png(20000, 10))).toBeNull();
  });
});
