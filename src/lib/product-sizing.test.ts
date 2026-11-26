import { describe, expect, it } from "vitest";
import {
  getSizeFormatRecord,
  newSizeFormatId,
  normalizeSizeLabel,
  normalizeSizeList,
  productSizeFormatId,
} from "./product-sizing";

describe("sizes", () => {
  it("keeps clothing letters in capitals, numbers and Unica as before", () => {
    expect(
      ["xs", "m", "xl", "3xl", "xxs", "34", "única", "one size"].map(normalizeSizeLabel),
    ).toEqual(["XS", "M", "XL", "3XL", "XXS", "34", "Unica", "Unica"]);
  });
  it("keeps any other size as typed", () => {
    expect(normalizeSizeLabel("  Virgo ")).toBe("Virgo");
    expect(normalizeSizeLabel("TALLA 2")).toBe("TALLA 2");
  });
  it("lists each size once, ignoring capitals", () => {
    expect(normalizeSizeList(["Virgo", "virgo", "Leo", "", "m", "M"])).toEqual([
      "Virgo",
      "Leo",
      "M",
    ]);
  });
});

describe("size formats", () => {
  const categories = [
    { id: "collares", sizeFormat: "onesize" },
    { id: "tops", sizeFormat: "standard" },
  ];
  it("a product uses its own format, else its main category's", () => {
    expect(productSizeFormatId({ primaryCategory: "collares", sizeFormat: null }, categories)).toBe(
      "onesize",
    );
    expect(
      productSizeFormatId(
        { primaryCategory: "collares", sizeFormat: "formato-signos" },
        categories,
      ),
    ).toBe("formato-signos");
  });
  it("a missing format falls back to the normal sizes instead of breaking", () => {
    expect(getSizeFormatRecord("formato-borrado", []).id).toBe("standard");
  });
  it("new format ids come from the name and never repeat", () => {
    expect(newSizeFormatId("Signos Zodiacales", [])).toBe("formato-signos-zodiacales");
    expect(newSizeFormatId("Signos", ["formato-signos"])).toBe("formato-signos-2");
    expect(newSizeFormatId("¡¡!!", [])).toBe("formato-nuevo");
  });
});
