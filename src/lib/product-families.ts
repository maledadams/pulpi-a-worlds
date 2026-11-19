import type { Product } from "@/data/products";
import { normalizeProductColorName } from "@/lib/product-colors";

// Sub-products: one product per color, linked to a "mother" product through
// `motherId` (spec: docs/superpowers/specs/2026-11-18-sub-products-design.md).
// The store shows each family once, choosing which member to show here.

export function familyIdOf(product: Pick<Product, "id" | "motherId">) {
  return product.motherId || product.id;
}

export function isSubProduct(product: Pick<Product, "motherId">) {
  return Boolean(product.motherId);
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Hidden members are skipped, and a hidden mother hides her whole family. */
export function isFamilyVisible(product: Product, mothersById: Map<string, Product>) {
  if (product.hidden) return false;
  if (!product.motherId) return true;
  // Missing from this list is not the same as hidden (a collection may list
  // only the sub); callers pass the full catalog as the mother lookup.
  return !mothersById.get(product.motherId)?.hidden;
}

export function mothersById(products: Product[]) {
  return new Map(products.filter((product) => !product.motherId).map((product) => [product.id, product]));
}

/** Searching a member's exact name or its product id shows that member. */
export function isExactSearchMatch(product: Product, query: string) {
  const wanted = normalizeSearchText(query);
  if (!wanted) return false;
  return normalizeSearchText(product.name) === wanted || product.id.toLowerCase() === wanted;
}

// Owner's ranking: oferta beats nuevo, both together beat either alone, and
// the mother beats a sub with the same flags.
// mother+sale+new 7 > sub+sale+new 6 > mother+sale 5 > sub+sale 4 >
// mother+new 3 > sub+new 2 > mother 1 > sub 0.
export function familyRank(product: Product) {
  return (product.salePrice ? 4 : 0) + (product.newArrival ? 2 : 0) + (product.motherId ? 0 : 1);
}

function compareForDisplay(a: Product, b: Product) {
  return (
    Number(b.available) - Number(a.available) ||
    familyRank(b) - familyRank(a) ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

/**
 * One product per family, in the order the families first appear in `list`.
 * `list` holds the members that matched the current search/filters; `all` is
 * the full catalog the list came from (used to find each family's mother).
 */
export function collapseFamilies(list: Product[], all: Product[] = list, query = "") {
  const mothers = mothersById(all);
  const groups = new Map<string, Product[]>();
  for (const product of list) {
    if (!isFamilyVisible(product, mothers)) continue;
    const key = familyIdOf(product);
    const group = groups.get(key);
    if (group) group.push(product);
    else groups.set(key, [product]);
  }

  return Array.from(groups.values()).map((members) => {
    const shown =
      members.find((member) => isExactSearchMatch(member, query)) ??
      [...members].sort(compareForDisplay)[0]!;
    if (!shown.motherId) return shown;
    // Destacado lives on the mother; the member shown for the family carries it.
    const mother = mothers.get(shown.motherId);
    return mother && mother.featured !== shown.featured ? { ...shown, featured: mother.featured } : shown;
  });
}

/** Mother first, then subs oldest to newest; hidden members left out. */
export function familyMembers(product: Product, all: Product[]) {
  const familyId = familyIdOf(product);
  const mothers = mothersById(all);
  return all
    .filter((member) => familyIdOf(member) === familyId && isFamilyVisible(member, mothers))
    .sort(
      (a, b) => Number(Boolean(a.motherId)) - Number(Boolean(b.motherId)) || a.createdAt.localeCompare(b.createdAt),
    );
}

/** A product's one color, as a comparable key ("" when it has none). */
export function familyColorKey(product: Pick<Product, "colors">) {
  const name = product.colors?.[0]?.name;
  return name ? normalizeProductColorName(name).toLowerCase() : "";
}

type ConvertMember = Pick<Product, "id" | "motherId" | "colors">;

// Convertir (admin): makes existing products sub-products of a mother. These
// are the family rules, shared by the admin pop-up and the server (which
// re-checks everything). null = allowed.

/** Why `product` can't be the mother of a conversion. */
export function convertMotherBlock(product: ConvertMember): string | null {
  return product.motherId ? "Un sub-producto no puede ser madre (no hay nietos)." : null;
}

/**
 * Why `candidate` can't become a sub of `mother`. `all` is the full catalog;
 * `pickedColors` holds the colors of the products already chosen in this
 * same conversion.
 */
export function convertChildBlock(
  candidate: ConvertMember,
  mother: ConvertMember,
  all: ConvertMember[],
  pickedColors: Set<string>,
): string | null {
  if (candidate.id === mother.id) return "Es el producto madre.";
  if (candidate.motherId) {
    return candidate.motherId === mother.id
      ? "Ya es sub-producto de esta madre."
      : "Ya es sub-producto de otro producto.";
  }
  if (all.some((product) => product.motherId === candidate.id)) {
    return "Ya es madre de otros productos (serían nietos).";
  }
  const color = familyColorKey(candidate);
  if (!color) return "No tiene color.";
  if (color === familyColorKey(mother)) return "La madre ya tiene ese color.";
  if (all.some((product) => product.motherId === mother.id && familyColorKey(product) === color)) {
    return "Un sub-producto de esta madre ya tiene ese color.";
  }
  if (pickedColors.has(color)) return "Ya elegiste otro producto con ese color.";
  return null;
}
