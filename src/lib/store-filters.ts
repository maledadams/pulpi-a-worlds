import {
  getCategoryLabel,
  getCategorySortOrder,
  isConfiguredNsfwCategory,
  type Product,
  type Vibe,
} from "@/data/products";
import {
  PRODUCT_COLOR_PRESETS,
  normalizeProductColorId,
} from "@/lib/product-colors";

export const CATALOG_SORTS = [
  { id: "featured", label: "Destacados" },
  { id: "new", label: "Nuevos" },
  { id: "asc", label: "Precio +" },
  { id: "desc", label: "Precio -" },
] as const;

export type CatalogSortId = (typeof CATALOG_SORTS)[number]["id"];

export const PRICE_BUCKETS = [
  { id: "$", label: "$", min: 0, max: 1499 },
  { id: "$$", label: "$$", min: 1500, max: 2499 },
  { id: "$$$", label: "$$$", min: 2500, max: 3999 },
  { id: "$$$$", label: "$$$$", min: 4000, max: Number.POSITIVE_INFINITY },
] as const;

export const COLOR_FAMILIES = PRODUCT_COLOR_PRESETS.map((preset) => ({
  id: preset.id,
  label: preset.label,
  swatch: preset.hex,
})) as ReadonlyArray<{
  id: (typeof PRODUCT_COLOR_PRESETS)[number]["id"];
  label: string;
  swatch: string;
}>;

export type CatalogSearch = {
  q?: string;
  shop?: string;
  category?: string;
  nsfw?: string;
  size?: string;
  shoe?: string;
  color?: string;
  price?: string;
  sort?: string;
  avail?: string;
  sale?: string;
  fresh?: string;
};

export type CatalogFilters = {
  q: string;
  departments: Set<Vibe>;
  categories: Set<string>;
  nsfwEnabled: boolean;
  apparelSizes: Set<string>;
  shoeSizes: Set<string>;
  colors: Set<string>;
  priceBuckets: Set<string>;
  onlyAvail: boolean;
  onlySale: boolean;
  onlyNew: boolean;
  sort: CatalogSortId;
};

const DEPARTMENTS = ["moon", "sunshine", "men"] as const satisfies readonly Vibe[];
type Department = (typeof DEPARTMENTS)[number];
export const NSFW_CATEGORIES = ["lingerie", "kinkwear", "sex-toys"] as const;

export function getProductCategories(product: Product) {
  return product.categories && product.categories.length > 0 ? product.categories : [product.category];
}

export function isNsfwCategory(category: string) {
  return isConfiguredNsfwCategory(category);
}

export function isNsfwProduct(product: Product) {
  return getProductCategories(product).some((category) => isNsfwCategory(category));
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function splitCsv(value?: string) {
  return value
    ?.split(",")
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];
}

function categorySortKey(category: string) {
  return getCategorySortOrder(category);
}

export function validateCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    q: getString(search.q),
    shop: getString(search.shop),
    category: getString(search.category),
    nsfw: getString(search.nsfw),
    size: getString(search.size),
    shoe: getString(search.shoe),
    color: getString(search.color),
    price: getString(search.price),
    sort: getString(search.sort),
    avail: getString(search.avail),
    sale: getString(search.sale),
    fresh: getString(search.fresh),
  };
}

export function parseCatalogSearch(search: CatalogSearch): CatalogFilters {
  const sort = CATALOG_SORTS.some((entry) => entry.id === search.sort)
    ? (search.sort as CatalogSortId)
    : "featured";

  return {
    q: search.q ?? "",
    departments: new Set(
      splitCsv(search.shop).filter((entry): entry is Department =>
        DEPARTMENTS.includes(entry as Department),
      ),
    ),
    categories: new Set(splitCsv(search.category)),
    nsfwEnabled: search.nsfw === "1",
    apparelSizes: new Set(splitCsv(search.size)),
    shoeSizes: new Set(splitCsv(search.shoe)),
    colors: new Set(splitCsv(search.color)),
    priceBuckets: new Set(splitCsv(search.price)),
    onlyAvail: search.avail === "1",
    onlySale: search.sale === "1",
    onlyNew: search.fresh === "1",
    sort,
  };
}

export function buildCatalogSearch(filters: CatalogFilters): CatalogSearch {
  const join = <T,>(values: Set<T>) => (values.size > 0 ? Array.from(values).join(",") : undefined);

  return {
    q: filters.q || undefined,
    shop: join(filters.departments),
    category: join(filters.categories),
    nsfw: filters.nsfwEnabled ? "1" : undefined,
    size: join(filters.apparelSizes),
    shoe: join(filters.shoeSizes),
    color: join(filters.colors),
    price: join(filters.priceBuckets),
    sort: filters.sort === "featured" ? undefined : filters.sort,
    avail: filters.onlyAvail ? "1" : undefined,
    sale: filters.onlySale ? "1" : undefined,
    fresh: filters.onlyNew ? "1" : undefined,
  };
}

export function toggleSet<T>(current: Set<T>, value: T) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function sizeLabel(size: string) {
  const key = size.trim().toUpperCase();
  if (key === "XS") return "Extra pequena";
  if (key === "S") return "Pequena";
  if (key === "M") return "Mediana";
  if (key === "L") return "Grande";
  if (key === "XL") return "Extra grande";
  if (key === "ONE SIZE" || key === "UNICA" || key === "UNICO") return "Talla unica";
  return size;
}

export function getProductSizes(product: Product) {
  return product.sizes ?? product.options.find((option) => option.name === "Talla")?.values ?? [];
}

export function getApparelSizes(product: Product) {
  return getProductSizes(product).filter((size) => !/^\d{2,3}$/.test(size.trim()));
}

export function getShoeSizes(product: Product) {
  return getProductSizes(product).filter((size) => /^\d{2,3}$/.test(size.trim()));
}

export function getProductColors(product: Product) {
  return (
    product.colors ??
    (product.options.find((option) => option.name === "Color")?.values ?? []).map((name, index) => ({
      name,
      hex: product.swatch[index % product.swatch.length],
    }))
  );
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case red:
        h = (green - blue) / d + (green < blue ? 6 : 0);
        break;
      case green:
        h = (blue - red) / d + 2;
        break;
      default:
        h = (red - green) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s, l };
}

export function getColorFamily(name: string, hex: string) {
  const normalizedByName = normalizeProductColorId(name);
  if (normalizedByName) return normalizedByName;

  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);

  if (l >= 0.93) return "white";
  if (s <= 0.12 && l >= 0.72) return "beige";
  if (s <= 0.12 && l <= 0.2) return "black";
  if (s <= 0.12) return "gray";
  if (h < 15 || h >= 345) return l <= 0.42 ? "vino" : "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 105) return l >= 0.62 ? "light-green" : "green";
  if (h < 170) return "green";
  if (h < 225) return l >= 0.68 ? "light-blue" : "blue";
  if (h < 265) return "blue";
  if (h < 320) return "purple";
  return "pink";
}

export function priceMatches(product: Product, buckets: Set<string>) {
  if (buckets.size === 0) return true;
  return PRICE_BUCKETS.some((bucket) => {
    if (!buckets.has(bucket.id)) return false;
    const price = product.salePrice ?? product.price;
    return price >= bucket.min && price <= bucket.max;
  });
}

export function filterCatalogProducts(products: Product[], filters: CatalogFilters) {
  let result = products.filter((product) => {
    if (product.hidden) return false;
    if (filters.q && !`${product.name} ${product.description}`.toLowerCase().includes(filters.q.toLowerCase())) {
      return false;
    }
    if (!filters.nsfwEnabled && isNsfwProduct(product)) return false;
    if (filters.departments.size > 0 && !filters.departments.has(product.vibe)) return false;
    if (filters.categories.size > 0 && !getProductCategories(product).some((category) => filters.categories.has(category))) {
      return false;
    }
    if (
      filters.apparelSizes.size > 0 &&
      !getApparelSizes(product).some((size) => filters.apparelSizes.has(size))
    ) {
      return false;
    }
    if (filters.shoeSizes.size > 0) {
      if (!getProductCategories(product).includes("shoes")) return false;
      if (!getShoeSizes(product).some((size) => filters.shoeSizes.has(size))) return false;
    }
    if (
      filters.colors.size > 0 &&
      !getProductColors(product).some((color) => filters.colors.has(getColorFamily(color.name, color.hex)))
    ) {
      return false;
    }
    if (!priceMatches(product, filters.priceBuckets)) return false;
    if (filters.onlyAvail && !product.available) return false;
    if (filters.onlySale && !product.salePrice) return false;
    if (filters.onlyNew && !product.newArrival) return false;
    return true;
  });

  if (filters.sort === "asc") {
    result = [...result].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
  }
  if (filters.sort === "desc") {
    result = [...result].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
  }
  if (filters.sort === "new") {
    result = [...result].sort((a, b) => Number(!!b.newArrival) - Number(!!a.newArrival));
  }
  if (filters.sort === "featured") {
    result = [...result].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }

  return result;
}

export function getDepartmentOptions(products: Product[]) {
  return DEPARTMENTS.map((vibe) => ({
    value: vibe,
    label: vibe === "moon" ? "Moon" : vibe === "sunshine" ? "Sunshine" : "Men",
    count: products.filter((product) => product.vibe === vibe).length,
  })).filter((option) => option.count > 0);
}

export function getCategoryOptions(products: Product[]) {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    getProductCategories(product).forEach((category) => {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      label: getCategoryLabel(id),
      count,
    }))
    .sort((a, b) => categorySortKey(a.id) - categorySortKey(b.id) || a.label.localeCompare(b.label));
}

export function getApparelSizeOptions(products: Product[]) {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    getApparelSizes(product).forEach((size) => {
      counts.set(size, (counts.get(size) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries()).map(([value, count]) => ({
    value,
    label: sizeLabel(value),
    count,
  }));
}

export function getShoeSizeOptions(products: Product[]) {
  const counts = new Map<string, number>();
  products
    .filter((product) => getProductCategories(product).includes("shoes"))
    .forEach((product) => {
      getShoeSizes(product).forEach((size) => {
        counts.set(size, (counts.get(size) ?? 0) + 1);
      });
    });

  return Array.from(counts.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([value, count]) => ({
      value,
      count,
    }));
}

export function getColorOptions(products: Product[]) {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    getProductColors(product).forEach((color) => {
      const family = getColorFamily(color.name, color.hex);
      counts.set(family, (counts.get(family) ?? 0) + 1);
    });
  });

  return COLOR_FAMILIES.map((family) => ({
    ...family,
    count: counts.get(family.id) ?? 0,
  })).filter((family) => family.count > 0);
}

export function getCategoryLinkSearch(category: string): CatalogSearch {
  return validateCatalogSearch({ category, nsfw: isNsfwCategory(category) ? "1" : undefined });
}

export function getDepartmentCategoryLinkSearch(vibe: Vibe, category?: string): CatalogSearch {
  return validateCatalogSearch({
    shop: vibe === "pulpina" ? undefined : vibe,
    category,
    nsfw: category && isNsfwCategory(category) ? "1" : undefined,
  });
}

export function getProductCategoryKey(product: Product) {
  return getCategoryLabel(getProductCategories(product)[0] ?? product.category);
}

export function getAvailableMenuCategories(
  productsOrVibe?: Product[] | Vibe,
  vibeOrIncludeNsfw?: Vibe | boolean,
  includeNsfw = true,
) {
  const products = Array.isArray(productsOrVibe) ? productsOrVibe : [];
  const vibe = Array.isArray(productsOrVibe)
    ? (typeof vibeOrIncludeNsfw === "string" ? vibeOrIncludeNsfw : undefined)
    : (typeof productsOrVibe === "string" ? productsOrVibe : undefined);
  const safeIncludeNsfw = Array.isArray(productsOrVibe)
    ? includeNsfw
    : (typeof vibeOrIncludeNsfw === "boolean" ? vibeOrIncludeNsfw : includeNsfw);
  const pool = vibe ? products.filter((product) => product.vibe === vibe) : products;
  const available = new Set(pool.flatMap((product) => getProductCategories(product)));

  return Array.from(available)
    .map((category) => ({
      id: category,
      label: getCategoryLabel(category),
    }))
    .filter((category) => safeIncludeNsfw || !isNsfwCategory(category.id))
    .sort((a, b) => categorySortKey(a.id) - categorySortKey(b.id) || a.label.localeCompare(b.label));
}
