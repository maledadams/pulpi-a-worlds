import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { familyColorsOf } from "@/lib/product-families";

const product = (id: string, color: string, extra: Partial<Product> = {}) =>
  ({
    id,
    motherId: null,
    hidden: false,
    colors: [{ name: color, hex: "#000000" }],
    options: [],
    swatch: ["#000000", "#111111"],
    ...extra,
  }) as unknown as Product;

describe("familyColorsOf", () => {
  it("shows every visible member's color, its own first, once each", () => {
    const mother = product("vest", "Rosado");
    const brown = product("vest-brown", "Marrón", { motherId: "vest" });
    const black = product("vest-black", "Negro", { motherId: "vest" });
    const hidden = product("vest-red", "Rojo", { motherId: "vest", hidden: true });
    const twin = product("vest-pink-2", "rosado", { motherId: "vest" });
    const other = product("skirt", "Azul");
    const catalog = [mother, brown, black, hidden, twin, other];
    expect(familyColorsOf(brown, catalog).map((color) => color.name)).toEqual([
      "Marrón",
      "Rosado",
      "Negro",
    ]);
    expect(familyColorsOf(other, catalog).map((color) => color.name)).toEqual(["Azul"]);
  });
});
