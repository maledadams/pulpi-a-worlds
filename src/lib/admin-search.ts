/**
 * Shared search matching for admin list pages (Productos, Stock, Categorias,
 * Colecciones, Promociones, Pedidos). A plain `haystack.includes(query)`
 * only matches when the query is an exact substring in the exact field
 * order it was typed, so "negro chaleco" never finds "Chaleco ... Negro",
 * and typing without accents never finds "Corazón". This tokenizes the
 * query and strips accents on both sides so word order and accents stop
 * mattering, while still requiring every typed word to match somewhere.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesAdminSearch(haystackParts: Array<string | number | null | undefined>, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(
    haystackParts
      .filter((part): part is string | number => part !== null && part !== undefined)
      .join(" "),
  );
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}
