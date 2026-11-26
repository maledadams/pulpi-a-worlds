/** A size format's id: one of the three built-in ones, or one the admin created (Lucia, 2026-11-26). */
export type AdminSizeFormat = string;

export const BUILT_IN_SIZE_FORMAT_IDS = ["standard", "shoes", "onesize"] as const;

export function isBuiltInSizeFormat(id: string) {
  return (BUILT_IN_SIZE_FORMAT_IDS as readonly string[]).includes(id);
}

export type AdminSizeFormatRecord = {
  id: AdminSizeFormat;
  label: string;
  sizes: string[];
  sortOrder: number;
};

const SHOE_CATEGORY_IDS = new Set(["shoes"]);
const ONESIZE_CATEGORY_IDS = new Set(["accessories", "jewelry", "bags", "sex-toys"]);

export const DEFAULT_SIZE_FORMATS: AdminSizeFormatRecord[] = [
  {
    id: "standard",
    label: "Ropa de adulto",
    sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "Unica"],
    sortOrder: 0,
  },
  {
    id: "shoes",
    label: "Zapatos de adulto",
    sizes: ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "Unica"],
    sortOrder: 1,
  },
  {
    id: "onesize",
    label: "Solo talla unica",
    sizes: ["Unica"],
    sortOrder: 2,
  },
];

export function normalizeSizeLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const lowered = trimmed.toLowerCase();
  if (
    lowered === "única" ||
    lowered === "unica" ||
    lowered === "one size" ||
    lowered === "one-size"
  ) {
    return "Unica";
  }

  if (/^\d{1,3}$/.test(trimmed)) {
    return trimmed;
  }

  // Clothing letters (s, xl, 3xl...) are written in capitals; any other size is kept as
  // typed, so a format's "Virgo" doesn't turn into "VIRGO".
  if (/^\d*x*[sml]$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

/** Normalized, once each (ignoring capitals: "virgo" and "Virgo" are the same size). */
export function normalizeSizeList(sizes: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const size of sizes.map(normalizeSizeLabel)) {
    const key = size.toLowerCase();
    if (!size || seen.has(key)) continue;
    seen.add(key);
    result.push(size);
  }
  return result;
}

export function cloneSizeFormat(format: AdminSizeFormatRecord): AdminSizeFormatRecord {
  return {
    ...format,
    sizes: [...format.sizes],
  };
}

export function getDefaultSizeFormats() {
  return DEFAULT_SIZE_FORMATS.map(cloneSizeFormat);
}

export function getCategorySizeFormat(categoryId: string): AdminSizeFormat {
  const normalized = categoryId.trim().toLowerCase();
  if (SHOE_CATEGORY_IDS.has(normalized)) return "shoes";
  if (ONESIZE_CATEGORY_IDS.has(normalized)) return "onesize";
  return "standard";
}

export function getSizeFormatRecord(
  formatId: AdminSizeFormat,
  formats: AdminSizeFormatRecord[] = DEFAULT_SIZE_FORMATS,
) {
  return (
    formats.find((format) => format.id === formatId) ??
    DEFAULT_SIZE_FORMATS.find((format) => format.id === formatId) ??
    // A format deleted elsewhere (or never loaded): the normal sizes, never a crash.
    DEFAULT_SIZE_FORMATS[0]!
  );
}

/**
 * The size format a product uses (Lucia, 2026-11-26): its own when it has one, else its
 * main category's.
 */
export function productSizeFormatId(
  product: { sizeFormat?: string | null; primaryCategory: string },
  categories: Array<{ id: string; sizeFormat: string }>,
) {
  if (product.sizeFormat) return product.sizeFormat;
  const category =
    categories.find((entry) => entry.id === product.primaryCategory) ?? categories[0];
  return category?.sizeFormat ?? "standard";
}

/** A new format's id from its name, not taken by any of `existingIds`. */
export function newSizeFormatId(label: string, existingIds: string[]) {
  const base =
    "formato-" +
    (label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "nuevo");
  let id = base;
  for (let n = 2; existingIds.includes(id); n++) id = `${base}-${n}`;
  return id;
}

export function getSizeOptionsForFormat(
  formatId: AdminSizeFormat,
  formats: AdminSizeFormatRecord[] = DEFAULT_SIZE_FORMATS,
) {
  return getSizeFormatRecord(formatId, formats).sizes;
}
