import { getProductColorHex } from "@/lib/product-colors";

export type Vibe = "pulpina" | "men" | "moon" | "sunshine";
export type SubstoreVibe = Exclude<Vibe, "pulpina">;

export type ProductImage = {
  url: string;
  altText: string | null;
};

export type ProductOption = {
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  title: string;
  available: boolean;
  quantityAvailable: number | null;
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  image: ProductImage | null;
  selectedOptions: { name: string; value: string }[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  vibe: Vibe;
  sortOrder?: number;
  category: string;
  categories?: string[];
  description: string;
  descriptionHtml: string;
  price: number;
  compareAtPrice: number | null;
  currencyCode: string;
  available: boolean;
  hidden: boolean;
  stock: number | null;
  featured: boolean;
  newArrival: boolean;
  tags: string[];
  swatch: [string, string];
  images: ProductImage[];
  featuredImage: ProductImage | null;
  options: ProductOption[];
  variants: ProductVariant[];
  createdAt: string;
  sizes?: string[];
  colors?: { name: string; hex: string }[];
  salePrice?: number | null;
};

export type CategoryImages = Partial<Record<SubstoreVibe, ProductImage>>;

export type StorefrontCategoryConfig = {
  id: string;
  isNsfw: boolean;
  label: string;
  sortOrder: number;
  vibes: SubstoreVibe[];
  images: CategoryImages;
};

export type CartLine = {
  id: string;
  quantity: number;
  merchandiseId: string;
  title: string;
  productTitle: string;
  productHandle: string;
  image: ProductImage | null;
  price: number;
  currencyCode: string;
  selectedOptions: { name: string; value: string }[];
};

export type Cart = {
  id: string;
  totalQuantity: number;
  subtotal: number;
  currencyCode: string;
  lines: CartLine[];
};

export const VIBES: Record<
  Vibe,
  {
    name: string;
    subtitle: string;
    color: string;
  }
> = {
  pulpina: { name: "Tienda", subtitle: "General", color: "#e94560" },
  men: { name: "Pulpiña Men", subtitle: "Punk · Underground", color: "#c0392b" },
  moon: { name: "Pulpiña Moon", subtitle: "Romance Gótico", color: "#7a0e1c" },
  sunshine: { name: "Pulpiña Sunshine", subtitle: "Kawaii · Y2K", color: "#ff5fa2" },
};

export const VIBE_LAYOUTS: Record<
  Vibe,
  {
    surface: string;
    surfaceSoft: string;
    ink: string;
    panel: string;
  }
> = {
  pulpina: {
    surface: "#fff1dc",
    surfaceSoft: "#fff8ef",
    ink: "#241717",
    panel: "#fff6e5",
  },
  men: {
    surface: "#f4eadf",
    surfaceSoft: "#fbf4ec",
    ink: "#1c1717",
    panel: "#161214",
  },
  moon: {
    surface: "#f3e7e2",
    surfaceSoft: "#fbf4f0",
    ink: "#251417",
    panel: "#2a151a",
  },
  sunshine: {
    surface: "#fff0f6",
    surfaceSoft: "#fff8eb",
    ink: "#4c1730",
    panel: "#fff6d4",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  dresses: "Vestidos",
  outerwear: "Abrigos",
  lingerie: "Lenceria",
  kinkwear: "Ropa kink",
  "sex-toys": "Juguetes",
  cosplay: "Cosplay",
  "full-body": "Full Body",
  accessories: "Accesorios",
  shoes: "Zapatos",
  jewelry: "Joyería",
  bags: "Bolsos",
};

const DEFAULT_NSFW_CATEGORY_IDS = new Set(["lingerie", "kinkwear", "sex-toys"]);

const DEFAULT_CATEGORY_CONFIG = Object.entries(CATEGORY_LABELS).map(
  ([id, label], index) =>
    ({
      id,
      isNsfw: DEFAULT_NSFW_CATEGORY_IDS.has(id),
      label,
      sortOrder: index,
      vibes: ["moon", "sunshine", "men"],
      images: {} as CategoryImages,
    }) satisfies StorefrontCategoryConfig,
);

const runtimeCategoryConfig = new Map(
  DEFAULT_CATEGORY_CONFIG.map((category) => [category.id, category] as const),
);

export const CATEGORIES = DEFAULT_CATEGORY_CONFIG.map(({ id, label }) => ({
  id,
  label,
}));

const COLOR_SWATCHES: Record<string, string> = {
  arena: "#d8c1a1",
  black: "#111111",
  "black cherry": "#3a0f1a",
  bubblegum: "#ff87b8",
  charcoal: "#353535",
  crema: "#f5e7c6",
  glosspink: "#ff78b4",
  "gloss pink": "#ff78b4",
  matcha: "#9cca73",
  merlot: "#5d1427",
  negro: "#111111",
  oxblood: "#6a1726",
  pearl: "#f5eadf",
  pink: "#ff8fc9",
  "pink fade": "#f3a6c4",
  rosa: "#ff8fc9",
  silver: "#b7b7b7",
  "soft pink": "#ffc2da",
  unico: "#d9d9d9",
  "único": "#d9d9d9",
  wine: "#7a0e1c",
};

function humanizeCategoryId(category: string) {
  return category
    .trim()
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function toColorHex(name: string, fallback: string) {
  return getProductColorHex(name, fallback);
}

export function getCategoryLabel(category: string) {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "-");
  return runtimeCategoryConfig.get(normalized)?.label ?? CATEGORY_LABELS[normalized] ?? humanizeCategoryId(category);
}

export function getCategoryConfig(category: string) {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "-");
  return runtimeCategoryConfig.get(normalized) ?? null;
}

export function getCategoryImage(category: string, vibe: SubstoreVibe) {
  return getCategoryConfig(category)?.images[vibe] ?? null;
}

export function getCategorySortOrder(category: string) {
  return getCategoryConfig(category)?.sortOrder ?? DEFAULT_CATEGORY_CONFIG.length + 100;
}

export function isConfiguredNsfwCategory(category: string) {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "-");
  return runtimeCategoryConfig.get(normalized)?.isNsfw ?? DEFAULT_NSFW_CATEGORY_IDS.has(normalized);
}

export function setRuntimeCategoryConfig(categories: StorefrontCategoryConfig[]) {
  runtimeCategoryConfig.clear();
  for (const fallback of DEFAULT_CATEGORY_CONFIG) {
    runtimeCategoryConfig.set(fallback.id, fallback);
  }

  for (const category of categories) {
    const normalizedId = category.id.trim().toLowerCase().replace(/\s+/g, "-");
    if (!normalizedId) continue;
    runtimeCategoryConfig.set(normalizedId, {
      id: normalizedId,
      isNsfw: category.isNsfw,
      label: category.label.trim() || humanizeCategoryId(normalizedId),
      sortOrder: Math.max(0, Number(category.sortOrder) || 0),
      vibes: Array.from(new Set(category.vibes)),
      images: Object.fromEntries(
        Object.entries(category.images ?? {}).filter(
          ([vibe, image]) =>
            (vibe === "moon" || vibe === "sunshine" || vibe === "men") &&
            Boolean(image?.url),
        ),
      ) as CategoryImages,
    });
  }
}

export function getRuntimeCategoryConfig() {
  return Array.from(runtimeCategoryConfig.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
}

export function formatPrice(amount: number, currencyCode = "DOP") {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function isOnSale(price: number, compareAtPrice: number | null | undefined) {
  return typeof compareAtPrice === "number" && compareAtPrice > price;
}

type MockProductInput = {
  id: string;
  name: string;
  vibe: Vibe;
  category: string;
  categories?: string[];
  price: number;
  swatch: [string, string];
  featured?: boolean;
  newArrival?: boolean;
  available?: boolean;
  hidden?: boolean;
  stock?: number;
  compareAtPrice?: number | null;
  tags?: string[];
  sizes?: string[];
  colors?: string[];
};

function createMockProduct({
  id,
  name,
  vibe,
  category,
  categories,
  price,
  swatch,
  featured = false,
  newArrival = false,
  available = true,
  hidden = false,
  stock = 12,
  compareAtPrice = null,
  tags = [],
  sizes = ["XS", "S", "M", "L", "XL"],
  colors = ["Único"],
}: MockProductInput): Product {
  const variants: ProductVariant[] = sizes.flatMap((size, sizeIndex) =>
    colors.map((color, colorIndex) => ({
      id: `mock-${id}-${size}-${color}`.toLowerCase().replace(/\s+/g, "-"),
      title: colors.length > 1 ? `${size} / ${color}` : size,
      available,
      quantityAvailable: available ? Math.max(stock - sizeIndex - colorIndex, 1) : 0,
      price,
      compareAtPrice,
      currencyCode: "DOP",
      image: null,
      selectedOptions: [
        { name: "Talla", value: size },
        { name: "Color", value: color },
      ],
    })),
  );

  return {
    id: `mock-${id}`,
    slug: id,
    name,
    vibe,
    sortOrder: 0,
    category,
    categories: categories ?? [category],
    description: "Pieza alternativa diseñada en República Dominicana. Edición limitada del universo Pulpiña.",
    descriptionHtml:
      "<p>Pieza alternativa diseñada en República Dominicana. Edición limitada del universo Pulpiña.</p>",
    price,
    compareAtPrice,
    currencyCode: "DOP",
    available,
    hidden,
    stock,
    featured,
    newArrival,
    tags,
    swatch,
    images: [],
    featuredImage: null,
    options: [
      { name: "Talla", values: sizes },
      { name: "Color", values: colors },
    ],
    variants,
    createdAt: new Date("2026-04-01T00:00:00.000Z").toISOString(),
    sizes,
    colors: colors.map((color, index) => ({
      name: color,
      hex: toColorHex(color, swatch[index % swatch.length]),
    })),
    salePrice: compareAtPrice ? price : null,
  };
}

export const FALLBACK_PRODUCTS: Product[] = [
  createMockProduct({
    id: "tentaculo-tee",
    name: "Tentáculo Tee",
    vibe: "pulpina",
    category: "tops",
    price: 1450,
    swatch: ["#fce7a4", "#f3a6c4"],
    featured: true,
    newArrival: true,
    tags: ["featured", "new-arrival"],
    colors: ["Crema", "Rosa"],
  }),
  createMockProduct({
    id: "pulpa-hoodie",
    name: "Pulpa Hoodie",
    vibe: "pulpina",
    category: "outerwear",
    price: 2400,
    compareAtPrice: 2900,
    swatch: ["#ffd6e8", "#c4f0a3"],
    featured: true,
    tags: ["featured"],
    colors: ["Pink Fade", "Matcha"],
  }),
  createMockProduct({
    id: "kraken-cap",
    name: "Kraken Cap",
    vibe: "pulpina",
    category: "accessories",
    price: 850,
    swatch: ["#1a1a2e", "#e94560"],
    sizes: ["Única"],
    colors: ["Negro"],
  }),
  createMockProduct({
    id: "ojo-tote",
    name: "Ojo Tote",
    vibe: "pulpina",
    category: "bags",
    price: 990,
    swatch: ["#fff3b0", "#ff8fab"],
    newArrival: true,
    tags: ["new-arrival"],
    sizes: ["Única"],
    colors: ["Arena"],
  }),
  createMockProduct({
    id: "voiceless-jacket",
    name: "Listen To The Voiceless Jacket",
    vibe: "men",
    category: "outerwear",
    price: 4900,
    swatch: ["#0a0a0a", "#2a2a2a"],
    featured: true,
    tags: ["featured", "punk"],
    colors: ["Black"],
  }),
  createMockProduct({
    id: "patch-cargo",
    name: "Patch Cargo Pants",
    vibe: "men",
    category: "bottoms",
    price: 2900,
    compareAtPrice: 3400,
    swatch: ["#1a1a1a", "#3a1a1a"],
    newArrival: true,
    tags: ["new-arrival"],
    colors: ["Charcoal"],
  }),
  createMockProduct({
    id: "stud-belt",
    name: "Stud Belt",
    vibe: "men",
    category: "accessories",
    price: 1200,
    swatch: ["#0a0a0a", "#888888"],
    sizes: ["Única"],
    colors: ["Silver"],
  }),
  createMockProduct({
    id: "anarchy-tee",
    name: "Anarchy Distressed Tee",
    vibe: "men",
    category: "tops",
    price: 1600,
    swatch: ["#0d0d0d", "#5a0a0a"],
    featured: true,
    tags: ["featured"],
    colors: ["Black"],
  }),
  createMockProduct({
    id: "combat-boots",
    name: "Combat Boots",
    vibe: "men",
    category: "shoes",
    price: 5800,
    swatch: ["#0a0a0a", "#1a1a1a"],
    available: false,
    stock: 0,
    sizes: ["39", "40", "41", "42"],
    colors: ["Black"],
  }),
  createMockProduct({
    id: "rosa-podrida-dress",
    name: "Rosa Podrida Dress",
    vibe: "moon",
    category: "dresses",
    price: 4200,
    swatch: ["#1a0608", "#5a0a14"],
    featured: true,
    tags: ["featured", "gothic"],
    colors: ["Wine"],
  }),
  createMockProduct({
    id: "tercer-ojo-choker",
    name: "Tercer Ojo Choker",
    vibe: "moon",
    category: "jewelry",
    price: 1100,
    swatch: ["#0a0a0a", "#3a0a14"],
    newArrival: true,
    tags: ["new-arrival"],
    sizes: ["Única"],
    colors: ["Black"],
  }),
  createMockProduct({
    id: "luna-corset",
    name: "Luna Corset",
    vibe: "moon",
    category: "tops",
    price: 3100,
    compareAtPrice: 3600,
    swatch: ["#15080c", "#4a0e1c"],
    featured: true,
    tags: ["featured"],
    colors: ["Merlot"],
  }),
  createMockProduct({
    id: "midnight-lace-set",
    name: "Midnight Lace Set",
    vibe: "moon",
    category: "lingerie",
    categories: ["lingerie", "dresses"],
    price: 3600,
    swatch: ["#12070b", "#5f1427"],
    featured: true,
    newArrival: true,
    tags: ["featured", "new-arrival"],
    colors: ["Black Cherry", "Wine"],
  }),
  createMockProduct({
    id: "velvet-harness",
    name: "Velvet Harness",
    vibe: "moon",
    category: "kinkwear",
    categories: ["kinkwear", "accessories"],
    price: 2300,
    swatch: ["#18080d", "#6a1726"],
    sizes: ["S", "M", "L"],
    colors: ["Black", "Oxblood"],
  }),
  createMockProduct({
    id: "eclipse-vibe",
    name: "Eclipse Vibe",
    vibe: "moon",
    category: "sex-toys",
    categories: ["sex-toys"],
    price: 2800,
    swatch: ["#17070a", "#7a0e1c"],
    sizes: ["Unica"],
    colors: ["Black", "Wine"],
    newArrival: true,
    tags: ["new-arrival"],
  }),
  createMockProduct({
    id: "veil-skirt",
    name: "Veil Lace Skirt",
    vibe: "moon",
    category: "bottoms",
    price: 2900,
    swatch: ["#0e0608", "#2a0a14"],
    colors: ["Black Cherry"],
  }),
  createMockProduct({
    id: "candelabro-bag",
    name: "Candelabro Bag",
    vibe: "moon",
    category: "bags",
    price: 2400,
    swatch: ["#1a0a0e", "#5a1a24"],
    sizes: ["Única"],
    colors: ["Oxblood"],
  }),
  createMockProduct({
    id: "leopardo-rosa-set",
    name: "Leopardo Rosa Set",
    vibe: "sunshine",
    category: "tops",
    price: 3200,
    swatch: ["#ffb3d1", "#ff5fa2"],
    featured: true,
    newArrival: true,
    tags: ["featured", "new-arrival", "y2k"],
    colors: ["Pink"],
  }),
  createMockProduct({
    id: "y2k-mini",
    name: "Y2K Mini Skirt",
    vibe: "sunshine",
    category: "bottoms",
    price: 1800,
    compareAtPrice: 2200,
    swatch: ["#ffd6ea", "#c5f56a"],
    colors: ["Bubblegum"],
  }),
  createMockProduct({
    id: "angel-cosplay-set",
    name: "Angel Cosplay Set",
    vibe: "sunshine",
    category: "cosplay",
    categories: ["cosplay", "full-body"],
    price: 3900,
    swatch: ["#ffd7ec", "#ffe66a"],
    featured: true,
    tags: ["featured"],
    colors: ["Gloss Pink", "Pearl"],
  }),
  createMockProduct({
    id: "heart-harness",
    name: "Heart Harness",
    vibe: "sunshine",
    category: "kinkwear",
    categories: ["kinkwear", "accessories"],
    price: 2200,
    swatch: ["#ffb3d1", "#ff79b5"],
    sizes: ["S", "M", "L"],
    colors: ["Bubblegum", "Gloss Pink"],
  }),
  createMockProduct({
    id: "starlight-catsuit",
    name: "Starlight Catsuit",
    vibe: "sunshine",
    category: "full-body",
    categories: ["full-body", "tops"],
    price: 3400,
    swatch: ["#ffe0ef", "#ffd86f"],
    featured: true,
    colors: ["Pearl", "Gloss Pink"],
  }),
  createMockProduct({
    id: "perlas-collar",
    name: "Collar de Perlas Bling",
    vibe: "sunshine",
    category: "jewelry",
    price: 950,
    swatch: ["#ffe9f3", "#ffe66a"],
    featured: true,
    sizes: ["Única"],
    colors: ["Pearl"],
    tags: ["featured"],
  }),
  createMockProduct({
    id: "telefono-bag",
    name: "Mini Phone Bag",
    vibe: "sunshine",
    category: "bags",
    price: 1500,
    swatch: ["#ff8fc9", "#ffe66a"],
    sizes: ["Única"],
    colors: ["Pink"],
  }),
  createMockProduct({
    id: "kawaii-platforms",
    name: "Kawaii Platforms",
    vibe: "sunshine",
    category: "shoes",
    price: 4500,
    swatch: ["#ffc1dc", "#c5f56a"],
    newArrival: true,
    tags: ["new-arrival"],
    sizes: ["36", "37", "38", "39"],
    colors: ["Gloss Pink"],
  }),
  createMockProduct({
    id: "glitter-tee",
    name: "Glitter Heart Tee",
    vibe: "sunshine",
    category: "tops",
    price: 1300,
    swatch: ["#ffe0ee", "#ff8fc9"],
    colors: ["Soft Pink"],
  }),
];

export function getFallbackProducts() {
  return FALLBACK_PRODUCTS.filter((product) => product.vibe !== "pulpina");
}

export function isStorefrontVisible(product: Product) {
  return !product.hidden;
}

export function getPublicProducts() {
  return FALLBACK_PRODUCTS.filter((product) => product.vibe !== "pulpina").filter(isStorefrontVisible);
}

export function getPublicProductsByVibe(vibe: Vibe) {
  return getPublicProducts().filter((product) => product.vibe === vibe);
}

export function getPublicProductBySlug(slug: string) {
  return getPublicProducts().find((product) => product.slug === slug) ?? null;
}

export function getFallbackProductsByVibe(vibe: Vibe) {
  return FALLBACK_PRODUCTS.filter((product) => product.vibe !== "pulpina" && product.vibe === vibe);
}

export function getFallbackProductBySlug(slug: string) {
  return FALLBACK_PRODUCTS.find((product) => product.vibe !== "pulpina" && product.slug === slug) ?? null;
}

export function getFallbackVariantById(variantId: string) {
  for (const product of FALLBACK_PRODUCTS.filter((entry) => entry.vibe !== "pulpina")) {
    const variant = product.variants.find((candidate) => candidate.id === variantId);
    if (variant) {
      return { product, variant };
    }
  }
  return null;
}

export const PRODUCTS = FALLBACK_PRODUCTS.filter((product) => product.vibe !== "pulpina");
