import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { filterCatalogProducts, orderForSubstore, parseCatalogSearch } from "@/lib/store-filters";

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    slug: id,
    name: id,
    vibe: "moon",
    secondaryVibe: null,
    category: "corsets",
    categories: ["corsets"],
    description: "",
    descriptionHtml: "",
    price: 1000,
    compareAtPrice: null,
    currencyCode: "DOP",
    available: true,
    hidden: false,
    stock: 1,
    featured: false,
    newArrival: false,
    tags: [],
    swatch: ["#000000", "#ffffff"],
    images: [],
    featuredImage: null,
    options: [],
    variants: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const catalog: Product[] = [
  product("moon-corset", { vibe: "moon" }),
  product("moon-skirt", { vibe: "moon", category: "skirts", categories: ["skirts"] }),
  product("sun-corset", { vibe: "sunshine" }),
  product("sun-corset-soldout", { vibe: "sunshine", available: false }),
  product("men-corset", { vibe: "men" }),
  product("general-corset", { vibe: "pulpina" }),
  product("hidden-corset", { vibe: "sunshine", hidden: true }),
  product("dual-corset", { vibe: "sunshine", secondaryVibe: "moon" }),
  product("moon-corset-soldout", { vibe: "moon", available: false }),
];

const own = (vibe: "moon" | "sunshine" | "men") =>
  catalog.filter((p) => p.vibe === vibe || p.secondaryVibe === vibe);
const ids = (list: Product[]) => list.map((p) => p.id);

describe("orderForSubstore", () => {
  it("without category or search, equals today's own-store list exactly", () => {
    const filters = parseCatalogSearch({});
    expect(ids(orderForSubstore(catalog, filters, "moon"))).toEqual(
      ids(filterCatalogProducts(own("moon"), filters)),
    );
  });

  it("with a category filter, lists own store first, then other stores' in-stock matches", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ category: "corsets" }), "moon"));
    expect(result).toEqual([
      "moon-corset",
      "dual-corset",
      "moon-corset-soldout",
      "sun-corset",
      "men-corset",
      "general-corset",
    ]);
  });

  it("never shows sold-out or hidden products from other stores", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ category: "corsets" }), "moon"));
    expect(result).not.toContain("sun-corset-soldout");
    expect(result).not.toContain("hidden-corset");
  });

  it("keeps own-store sold-out items exactly as today", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ category: "corsets" }), "moon"));
    expect(result).toContain("moon-corset-soldout");
  });

  it("puts a secondaryVibe product in group 1 only, once", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ category: "corsets" }), "moon"));
    expect(result.filter((id) => id === "dual-corset")).toHaveLength(1);
    expect(result.indexOf("dual-corset")).toBeLessThan(result.indexOf("sun-corset"));
  });

  it("search text triggers the same two-group order", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ q: "corset" }), "sunshine"));
    // Own group keeps its own sold-out item (today's behavior); hidden is excluded.
    expect(result.slice(0, 3)).toEqual(["sun-corset", "sun-corset-soldout", "dual-corset"]);
    expect(result).toContain("moon-corset");
    expect(result).toContain("men-corset");
    expect(result).toContain("general-corset");
    expect(result).not.toContain("hidden-corset");
  });

  it("blank search text does not trigger", () => {
    const filters = parseCatalogSearch({ q: "   " });
    expect(ids(orderForSubstore(catalog, filters, "men"))).toEqual(
      ids(filterCatalogProducts(own("men"), filters)),
    );
  });

  it("works the same on /men", () => {
    const result = ids(orderForSubstore(catalog, parseCatalogSearch({ category: "corsets" }), "men"));
    expect(result[0]).toBe("men-corset");
    expect(result).toContain("moon-corset");
  });

  it("keeps own store first under every sort", () => {
    for (const sort of ["featured", "new", "asc", "desc"] as const) {
      const sorted = [
        product("moon-cheap", { vibe: "moon", price: 100 }),
        product("sun-cheapest", { vibe: "sunshine", price: 1 }),
        product("moon-pricey", { vibe: "moon", price: 9000 }),
      ];
      const result = ids(orderForSubstore(sorted, parseCatalogSearch({ category: "corsets", sort }), "moon"));
      expect(result[result.length - 1]).toBe("sun-cheapest");
    }
  });

  it("ignores the department (shop) filter for other stores", () => {
    const result = ids(
      orderForSubstore(catalog, parseCatalogSearch({ category: "corsets", shop: "moon" }), "moon"),
    );
    expect(result).toContain("sun-corset");
  });
});
