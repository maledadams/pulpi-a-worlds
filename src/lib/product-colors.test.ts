import { describe, expect, it } from "vitest";
import {
  PRODUCT_COLOR_PRESETS,
  getProductColorHex,
  normalizeProductColorId,
  normalizeProductColorName,
} from "@/lib/product-colors";

describe("product colors", () => {
  it("reads accented names: Marrón is brown, not the light-gray fallback", () => {
    expect(normalizeProductColorId("Marrón")).toBe("brown");
    expect(getProductColorHex("Marrón")).toBe("#6f4a2f");
    expect(normalizeProductColorId("Café")).toBe("brown");
    expect(normalizeProductColorId("Metálico")).toBe("chrome");
    expect(normalizeProductColorId("marron")).toBe("brown");
    // Shown without an accent (Lucia), whatever was typed when it was saved.
    expect(normalizeProductColorName("Marrón")).toBe("Marron");
  });

  it("knows Turquesa and Fucsia, with their own color (Lucia, 2026-11-24)", () => {
    expect(normalizeProductColorId("Turquesa")).toBe("turquoise");
    expect(normalizeProductColorId("turquoise")).toBe("turquoise");
    expect(getProductColorHex("Turquesa")).toBe("#1ec9be");
    expect(normalizeProductColorId("Fucsia")).toBe("fuchsia");
    expect(normalizeProductColorId("Fuchsia")).toBe("fuchsia");
    expect(normalizeProductColorId("fuschia")).toBe("fuchsia");
    expect(getProductColorHex("Fucsia")).toBe("#e3197f");
  });

  it("every preset's own label maps back to itself", () => {
    for (const preset of PRODUCT_COLOR_PRESETS) {
      expect(normalizeProductColorId(preset.label), preset.label).toBe(preset.id);
      expect(normalizeProductColorName(preset.label)).toBe(preset.label);
    }
  });
});
