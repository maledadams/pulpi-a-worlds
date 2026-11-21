import { describe, expect, it } from "vitest";
import { pickPageStickers, stickerStyle } from "@/lib/theme-stickers";
import type { ThemeSticker } from "@/lib/theme-schema";

const fit = { x: 50, y: 50, w: 10, rot: 0 };
const sticker = (asset: string, extra: Partial<ThemeSticker> = {}): ThemeSticker => ({
  asset,
  anchor: "page",
  motion: "none",
  layer: "front",
  hideOnPhone: false,
  desktop: fit,
  mobile: fit,
  ...extra,
});

describe("pickPageStickers", () => {
  it("takes the page's areas in order and skips the others", () => {
    const picked = pickPageStickers(
      {
        home: [sticker("h1")],
        general: [sticker("g1")],
        moon: [sticker("m1")],
        footer: [sticker("f1")],
      },
      ["home", "general"],
    );
    expect(picked.map((entry) => entry.sticker.asset)).toEqual(["h1", "g1"]);
  });

  it("caps a page at 8 stickers on desktop, counting every area shown on it", () => {
    const many = (prefix: string, count: number) =>
      Array.from({ length: count }, (_, index) =>
        sticker(`${prefix}${index}`, { hideOnPhone: true }),
      );
    const picked = pickPageStickers({ home: many("h", 6), general: many("g", 6) }, [
      "home",
      "general",
    ]);
    expect(picked).toHaveLength(8);
    expect(picked.map((entry) => entry.sticker.asset).slice(-2)).toEqual(["g0", "g1"]);
  });

  it("shows at most 5 on phones; the rest stay desktop-only", () => {
    const picked = pickPageStickers(
      { home: Array.from({ length: 7 }, (_, index) => sticker(`s${index}`)) },
      ["home"],
    );
    expect(picked).toHaveLength(7);
    expect(picked.filter((entry) => entry.onPhone)).toHaveLength(5);
    expect(picked.slice(5).every((entry) => !entry.onPhone)).toBe(true);
  });

  it("respects a sticker's own hide-on-phone", () => {
    const [entry] = pickPageStickers({ general: [sticker("a", { hideOnPhone: true })] }, [
      "general",
    ]);
    expect(entry!.onPhone).toBe(false);
  });

  it("caps product pages at 3", () => {
    const picked = pickPageStickers(
      { product: Array.from({ length: 5 }, (_, index) => sticker(`p${index}`)) },
      ["product"],
    );
    expect(picked).toHaveLength(3);
  });

  it("returns nothing without stickers", () => {
    expect(pickPageStickers({}, ["home"])).toEqual([]);
  });
});

describe("stickerStyle", () => {
  it("places the sticker's center at x/y with its width, separately for phone and desktop", () => {
    const style = stickerStyle(
      sticker("a", {
        desktop: { x: 92, y: 4, w: 8, rot: 10 },
        mobile: { x: 85, y: 2, w: 16, rot: -5 },
      }),
    );
    expect(style).toEqual({
      "--st-x": "85%",
      "--st-y": "2%",
      "--st-w": "16%",
      "--st-rot": "-5deg",
      "--st-dx": "92%",
      "--st-dy": "4%",
      "--st-dw": "8%",
      "--st-drot": "10deg",
    });
  });
});
