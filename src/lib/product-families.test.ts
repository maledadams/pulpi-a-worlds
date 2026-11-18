import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { collapseFamilies, familyMembers, familyRank } from "./product-families";

function product(overrides: Partial<Product> & { id: string }): Product {
  return {
    slug: overrides.id,
    name: overrides.id,
    vibe: "moon",
    category: "tops",
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
    swatch: ["#000", "#111"],
    images: [],
    featuredImage: null,
    options: [],
    variants: [],
    createdAt: "2026-11-01T00:00:00.000Z",
    salePrice: null,
    motherId: null,
    ...overrides,
  };
}

const onSale = { compareAtPrice: 1500, salePrice: 1000 };

describe("familyRank", () => {
  it("orders oferta over nuevo, both over either, mother over sub", () => {
    const ranks = [
      product({ id: "m", ...onSale, newArrival: true }),
      product({ id: "s", motherId: "m", ...onSale, newArrival: true }),
      product({ id: "m2", ...onSale }),
      product({ id: "s2", motherId: "m", ...onSale }),
      product({ id: "m3", newArrival: true }),
      product({ id: "s3", motherId: "m", newArrival: true }),
      product({ id: "m4" }),
      product({ id: "s4", motherId: "m" }),
    ].map(familyRank);
    expect(ranks).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
  });
});

describe("collapseFamilies", () => {
  const mother = product({ id: "falda", name: "Falda Negra" });
  const red = product({ id: "falda-roja", name: "Falda Roja", motherId: "falda", ...onSale });
  const blue = product({ id: "falda-azul", name: "Falda Azul", motherId: "falda", newArrival: true });
  const other = product({ id: "top" });
  const all = [mother, red, blue, other];

  it("shows each family once, keeping first-appearance order", () => {
    const shown = collapseFamilies(all, all);
    expect(shown.map((p) => p.id)).toEqual(["falda-roja", "top"]);
  });

  it("an exact name or id search shows that member", () => {
    expect(collapseFamilies(all, all, "falda azul")[0]!.id).toBe("falda-azul");
    expect(collapseFamilies(all, all, "FALDA-AZUL")[0]!.id).toBe("falda-azul");
    expect(collapseFamilies(all, all, "falda")[0]!.id).toBe("falda"); // the mother's exact id
    expect(collapseFamilies(all, all, "fald")[0]!.id).toBe("falda-roja"); // not exact: ranking
  });

  it("skips hidden members, and a hidden mother hides the whole family", () => {
    const hiddenRed = { ...red, hidden: true };
    expect(collapseFamilies([mother, hiddenRed, blue], [mother, hiddenRed, blue])[0]!.id).toBe("falda-azul");
    const hiddenMother = { ...mother, hidden: true };
    expect(collapseFamilies([hiddenMother, red, blue], [hiddenMother, red, blue])).toEqual([]);
  });

  it("prefers available members over a higher-ranked sold-out one", () => {
    const soldOutRed = { ...red, available: false };
    expect(collapseFamilies([mother, soldOutRed, blue], [mother, soldOutRed, blue])[0]!.id).toBe("falda-azul");
  });

  it("the shown sub carries the mother's destacado", () => {
    const featuredMother = { ...mother, featured: true };
    const shown = collapseFamilies([featuredMother, red], [featuredMother, red])[0]!;
    expect(shown.id).toBe("falda-roja");
    expect(shown.featured).toBe(true);
  });

  it("only the matching members compete (e.g. a color filter)", () => {
    expect(collapseFamilies([blue], all)[0]!.id).toBe("falda-azul");
  });
});

describe("familyMembers", () => {
  it("lists the mother first, then subs oldest first, without hidden ones", () => {
    const mother = product({ id: "m" });
    const b = product({ id: "b", motherId: "m", createdAt: "2026-11-03T00:00:00.000Z" });
    const a = product({ id: "a", motherId: "m", createdAt: "2026-11-02T00:00:00.000Z" });
    const hidden = product({ id: "h", motherId: "m", hidden: true });
    expect(familyMembers(b, [b, hidden, a, mother]).map((p) => p.id)).toEqual(["m", "a", "b"]);
  });
});
