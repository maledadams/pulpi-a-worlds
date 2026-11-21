import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  categoryKey,
  discountForBundle,
  matchCategories,
  rewriteThemeRefs,
  themeBundleSchema,
} from "@/lib/theme-bundle";

describe("theme files", () => {
  it("matches categories by name across sites, ignoring accents and case", () => {
    const live = [
      { id: "cat_91", label: "Lencería" },
      { id: "cat_12", label: "Zapatos" },
      { id: "tshirts", label: "T-Shirts" },
    ];
    expect(categoryKey("Lencería")).toBe(categoryKey("lenceria"));
    expect(matchCategories(["lenceria", "ZAPATOS", "t shirts", "Faldas"], live)).toEqual({
      ids: ["cat_91", "cat_12", "tshirts"],
      missing: ["Faldas"],
    });
  });

  it("writes discounts by category name, never their switch or id", () => {
    const bundled = discountForBundle(
      {
        id: "bf-30",
        kind: "promotion",
        code: "PROMO-BF-30",
        label: "Black Friday 30%",
        type: "percentage",
        value: 30,
        active: true,
        scope: "store",
        categoryIds: ["shoes"],
        maxRedemptions: null,
        onePerCustomer: false,
        webOnly: true,
      },
      (id) => (id === "shoes" ? "Zapatos" : undefined),
    );
    expect(bundled).toMatchObject({ ref: "bf-30", code: "", categories: ["Zapatos"], webOnly: true });
    expect(bundled).not.toHaveProperty("active");
  });

  it("re-points images and discounts to the new ids, dropping discounts that weren't created", () => {
    const doc = {
      name: "BF",
      favicon: "img_aaa",
      stickers: { home: [{ asset: "img_bbb", motion: "none" }] },
      discountIds: ["bf-30", "bf-20"],
    };
    const next = rewriteThemeRefs(
      doc,
      new Map([
        ["img_aaa", "img_new1"],
        ["img_bbb", "img_new2"],
      ]),
      new Map([["bf-30", "black-friday-30"]]),
    );
    expect(next).toEqual({
      name: "BF",
      favicon: "img_new1",
      stickers: { home: [{ asset: "img_new2", motion: "none" }] },
      discountIds: ["black-friday-30"],
    });
  });

  it("round-trips image bytes through base64 and refuses a damaged file", () => {
    const bytes = new Uint8Array(70_000).map((_, index) => index % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    const bad = themeBundleSchema.safeParse({
      format: "pulpina-theme",
      version: 2,
      theme: {},
      images: [{ ref: "img_a", kind: "image", data: "<script>" }],
    });
    expect(bad.success).toBe(false);
  });
});
