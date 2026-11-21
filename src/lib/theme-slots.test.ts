import { describe, expect, it } from "vitest";
import { resolveSlot, slotClassName } from "@/lib/theme-slots";
import type { ThemeSlice } from "@/lib/themes";

const slice = (slots: ThemeSlice["slots"], assets: ThemeSlice["assets"] = {}): ThemeSlice => ({
  themeId: "t",
  name: "T",
  source: "override",
  css: "",
  slots,
  stickers: {},
  heroEffect: null,
  heroWave: null,
  homeBanners: [],
  keepStorePicker: false,
  tiendaBanners: [],
  favicon: null,
  shareImage: null,
  assets,
});

const asset = { url: "https://media.example/themes/a.webp", width: 800, height: 600, variants: [] };

describe("resolveSlot", () => {
  it("keeps the original with no theme, or when the theme leaves the slot alone", () => {
    expect(resolveSlot(null, "logo.moon", "/logo-moon.png")).toEqual({
      kind: "keep",
      src: "/logo-moon.png",
    });
    expect(resolveSlot(slice({}), "logo.moon", "/logo-moon.png")).toEqual({
      kind: "keep",
      src: "/logo-moon.png",
    });
    expect(resolveSlot(slice({ "logo.moon": { mode: "keep" } }), "logo.moon", "/x.png").kind).toBe(
      "keep",
    );
  });

  it("hides", () => {
    expect(
      resolveSlot(slice({ "contact.phoneLeft": { mode: "hide" } }), "contact.phoneLeft", "/p.png"),
    ).toEqual({
      kind: "hide",
    });
  });

  it("replaces with the asset url and its size", () => {
    const result = resolveSlot(
      slice({ "logo.men": { mode: "replace", asset: "a1" } }, { a1: asset }),
      "logo.men",
      "/m.png",
    );
    expect(result).toMatchObject({ kind: "replace", src: asset.url, width: 800, height: 600 });
  });

  it("keeps the original when the replacement image is missing (deleted or not loaded)", () => {
    const result = resolveSlot(
      slice({ "logo.men": { mode: "replace", asset: "gone" } }),
      "logo.men",
      "/m.png",
    );
    expect(result).toEqual({ kind: "keep", src: "/m.png" });
  });

  it("turns desktop and phone fits into CSS variables, phone falling back to desktop", () => {
    const result = resolveSlot(
      slice(
        {
          "logo.men": { mode: "replace", asset: "a1", desktop: { x: 20, y: 80, w: 150, rot: -12 } },
        },
        { a1: asset },
      ),
      "logo.men",
      "/m.png",
    );
    expect(result.kind === "replace" && result.style).toEqual({
      "--fit-x": "20%",
      "--fit-y": "80%",
      "--fit-scale": "1.5",
      "--fit-rot": "-12deg",
      "--fit-dx": "20%",
      "--fit-dy": "80%",
      "--fit-dscale": "1.5",
      "--fit-drot": "-12deg",
    });
    const plain = resolveSlot(
      slice({ "logo.men": { mode: "replace", asset: "a1" } }, { a1: asset }),
      "logo.men",
      "/m.png",
    );
    expect(plain.kind === "replace" && plain.style).toMatchObject({
      "--fit-scale": "1",
      "--fit-x": "50%",
    });
  });
});

describe("slotClassName", () => {
  it("leaves the original classes untouched unless the image was replaced", () => {
    expect(slotClassName({ kind: "keep", src: "/a" }, "h-8 w-8")).toBe("h-8 w-8");
    expect(slotClassName({ kind: "keep", src: "/a" }, undefined)).toBeUndefined();
    expect(
      slotClassName({ kind: "replace", src: "/b", width: 1, height: 1, style: {} }, "h-8 w-8"),
    ).toBe("h-8 w-8 theme-fit");
  });
});
