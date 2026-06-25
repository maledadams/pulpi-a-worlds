export const PRODUCT_COLOR_PRESETS = [
  { id: "red", label: "Rojo", hex: "#c7262f" },
  { id: "vino", label: "Vino", hex: "#6f1830" },
  { id: "orange", label: "Naranja", hex: "#e97b2c" },
  { id: "yellow", label: "Amarillo", hex: "#e7c84e" },
  { id: "light-green", label: "Verde Claro", hex: "#a6cf70" },
  { id: "green", label: "Verde", hex: "#4f8f48" },
  { id: "light-blue", label: "Azul Claro", hex: "#8bc7ea" },
  { id: "blue", label: "Azul", hex: "#3369c9" },
  { id: "purple", label: "Morado", hex: "#7a4cc2" },
  { id: "pink", label: "Rosado", hex: "#f08bb7" },
  { id: "beige", label: "Beige", hex: "#ddc8ad" },
  { id: "white", label: "Blanco", hex: "#f4f1eb" },
  { id: "black", label: "Negro", hex: "#111111" },
  { id: "gray", label: "Gris", hex: "#9b9b9b" },
] as const;

export type ProductColorPresetId = (typeof PRODUCT_COLOR_PRESETS)[number]["id"];

const PRESET_BY_ID = new Map(PRODUCT_COLOR_PRESETS.map((preset) => [preset.id, preset] as const));

function normalizeToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COLOR_ALIASES: Record<string, ProductColorPresetId> = {
  red: "red",
  rojo: "red",
  vino: "vino",
  wine: "vino",
  merlot: "vino",
  oxblood: "vino",
  burgundy: "vino",
  cherry: "vino",
  "black-cherry": "vino",
  orange: "orange",
  naranja: "orange",
  coral: "orange",
  peach: "orange",
  yellow: "yellow",
  amarillo: "yellow",
  gold: "yellow",
  "light-green": "light-green",
  "light green": "light-green",
  "verde-claro": "light-green",
  matcha: "light-green",
  mint: "light-green",
  green: "green",
  verde: "green",
  olive: "green",
  "light-blue": "light-blue",
  "light blue": "light-blue",
  "azul-claro": "light-blue",
  sky: "light-blue",
  blue: "blue",
  azul: "blue",
  navy: "blue",
  purple: "purple",
  morado: "purple",
  violet: "purple",
  lavender: "purple",
  pink: "pink",
  rosa: "pink",
  rosado: "pink",
  bubblegum: "pink",
  gloss: "pink",
  "gloss-pink": "pink",
  "soft-pink": "pink",
  pearl: "beige",
  beige: "beige",
  crema: "beige",
  cream: "beige",
  arena: "beige",
  ivory: "beige",
  white: "white",
  blanco: "white",
  black: "black",
  negro: "black",
  gray: "gray",
  grey: "gray",
  gris: "gray",
  silver: "gray",
  charcoal: "gray",
};

export function normalizeProductColorId(value: string): ProductColorPresetId | null {
  const normalized = normalizeToken(value);
  if (!normalized) return null;
  return COLOR_ALIASES[normalized] ?? (PRESET_BY_ID.has(normalized as ProductColorPresetId) ? (normalized as ProductColorPresetId) : null);
}

export function getProductColorPreset(value: string) {
  const id = normalizeProductColorId(value);
  return id ? PRESET_BY_ID.get(id) ?? null : null;
}

export function getProductColorHex(value: string, fallback = "#d9d9d9") {
  return getProductColorPreset(value)?.hex ?? fallback;
}

export function getProductColorLabel(value: string) {
  return getProductColorPreset(value)?.label ?? (value.trim() || "Color");
}

export function normalizeProductColorName(value: string) {
  return getProductColorPreset(value)?.label ?? value.trim();
}

export function buildProductColorRecord(value: string, fallback = "#d9d9d9") {
  return {
    name: normalizeProductColorName(value),
    hex: getProductColorHex(value, fallback),
  };
}
