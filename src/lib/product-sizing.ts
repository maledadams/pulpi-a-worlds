export type AdminSizeFormat = "standard" | "shoes" | "onesize";

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
  if (lowered === "única" || lowered === "unica" || lowered === "one size" || lowered === "one-size") {
    return "Unica";
  }

  if (/^\d{1,3}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.toUpperCase();
}

export function normalizeSizeList(sizes: string[]) {
  return Array.from(new Set(sizes.map(normalizeSizeLabel).filter(Boolean)));
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
  return formats.find((format) => format.id === formatId) ?? DEFAULT_SIZE_FORMATS.find((format) => format.id === formatId)!;
}

export function getSizeOptionsForFormat(
  formatId: AdminSizeFormat,
  formats: AdminSizeFormatRecord[] = DEFAULT_SIZE_FORMATS,
) {
  return getSizeFormatRecord(formatId, formats).sizes;
}
