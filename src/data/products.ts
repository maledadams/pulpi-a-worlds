export type Vibe = "pulpina" | "men" | "moon" | "sunshine";

export type Product = {
  id: string;
  slug: string;
  name: string;
  vibe: Vibe;
  category: string;
  description: string;
  price: number;
  salePrice?: number;
  colors: { name: string; hex: string }[];
  sizes: string[];
  available: boolean;
  stock: number;
  featured?: boolean;
  newArrival?: boolean;
  tags: string[];
  // visual placeholder — gradient + emoji mascot tile
  swatch: [string, string];
  emoji: string;
};

const p = (x: Partial<Product> & Pick<Product, "id" | "name" | "vibe" | "category" | "price" | "swatch" | "emoji">): Product => ({
  slug: x.id,
  description: "Pieza alternativa diseñada en RD. Edición limitada del universo Pulpiña.",
  colors: [{ name: "Único", hex: "#222" }],
  sizes: ["XS", "S", "M", "L", "XL"],
  available: true,
  stock: 12,
  tags: [],
  ...x,
} as Product);

export const PRODUCTS: Product[] = [
  // PULPIÑA general
  p({ id: "tentaculo-tee", name: "Tentáculo Tee", vibe: "pulpina", category: "tops", price: 1450, swatch: ["#fce7a4", "#f3a6c4"], emoji: "🐙", featured: true, newArrival: true, tags: ["unisex", "drop-1"] }),
  p({ id: "pulpa-hoodie", name: "Pulpa Hoodie", vibe: "pulpina", category: "outerwear", price: 2900, salePrice: 2400, swatch: ["#ffd6e8", "#c4f0a3"], emoji: "💜", featured: true }),
  p({ id: "kraken-cap", name: "Kraken Cap", vibe: "pulpina", category: "accessories", price: 850, swatch: ["#1a1a2e", "#e94560"], emoji: "🧢" }),
  p({ id: "ojo-tote", name: "Ojo Tote", vibe: "pulpina", category: "bags", price: 990, swatch: ["#fff3b0", "#ff8fab"], emoji: "👁️", newArrival: true }),

  // MEN
  p({ id: "voiceless-jacket", name: "Listen To The Voiceless Jacket", vibe: "men", category: "outerwear", price: 4900, swatch: ["#0a0a0a", "#2a2a2a"], emoji: "⛓️", featured: true, tags: ["punk", "studded"] }),
  p({ id: "patch-cargo", name: "Patch Cargo Pants", vibe: "men", category: "bottoms", price: 3400, salePrice: 2900, swatch: ["#1a1a1a", "#3a1a1a"], emoji: "🪡", newArrival: true }),
  p({ id: "stud-belt", name: "Stud Belt", vibe: "men", category: "accessories", price: 1200, swatch: ["#0a0a0a", "#888"], emoji: "🔩" }),
  p({ id: "anarchy-tee", name: "Anarchy Distressed Tee", vibe: "men", category: "tops", price: 1600, swatch: ["#0d0d0d", "#5a0a0a"], emoji: "🖤", featured: true }),
  p({ id: "combat-boots", name: "Combat Boots", vibe: "men", category: "shoes", price: 5800, swatch: ["#0a0a0a", "#1a1a1a"], emoji: "🥾", available: false, stock: 0 }),

  // MOON
  p({ id: "rosa-podrida-dress", name: "Rosa Podrida Dress", vibe: "moon", category: "dresses", price: 4200, swatch: ["#1a0608", "#5a0a14"], emoji: "🥀", featured: true, tags: ["gothic"] }),
  p({ id: "tercer-ojo-choker", name: "Tercer Ojo Choker", vibe: "moon", category: "jewelry", price: 1100, swatch: ["#0a0a0a", "#3a0a14"], emoji: "👁️‍🗨️", newArrival: true }),
  p({ id: "luna-corset", name: "Luna Corset", vibe: "moon", category: "tops", price: 3600, salePrice: 3100, swatch: ["#15080c", "#4a0e1c"], emoji: "🌑", featured: true }),
  p({ id: "veil-skirt", name: "Veil Lace Skirt", vibe: "moon", category: "bottoms", price: 2900, swatch: ["#0e0608", "#2a0a14"], emoji: "🕸️" }),
  p({ id: "candelabro-bag", name: "Candelabro Bag", vibe: "moon", category: "bags", price: 2400, swatch: ["#1a0a0e", "#5a1a24"], emoji: "🕯️" }),

  // SUNSHINE
  p({ id: "leopardo-rosa-set", name: "Leopardo Rosa Set", vibe: "sunshine", category: "tops", price: 3200, swatch: ["#ffb3d1", "#ff5fa2"], emoji: "🩷", featured: true, newArrival: true, tags: ["y2k"] }),
  p({ id: "y2k-mini", name: "Y2K Mini Skirt", vibe: "sunshine", category: "bottoms", price: 2200, salePrice: 1800, swatch: ["#ffd6ea", "#c5f56a"], emoji: "✨" }),
  p({ id: "perlas-collar", name: "Collar de Perlas Bling", vibe: "sunshine", category: "jewelry", price: 950, swatch: ["#ffe9f3", "#ffe66a"], emoji: "💖", featured: true }),
  p({ id: "telefono-bag", name: "Mini Phone Bag", vibe: "sunshine", category: "bags", price: 1500, swatch: ["#ff8fc9", "#ffe66a"], emoji: "📱" }),
  p({ id: "kawaii-platforms", name: "Kawaii Platforms", vibe: "sunshine", category: "shoes", price: 4500, swatch: ["#ffc1dc", "#c5f56a"], emoji: "👟", newArrival: true }),
  p({ id: "glitter-tee", name: "Glitter Heart Tee", vibe: "sunshine", category: "tops", price: 1300, swatch: ["#ffe0ee", "#ff8fc9"], emoji: "💕" }),
];

export const VIBES: Record<Vibe, { name: string; subtitle: string; color: string }> = {
  pulpina: { name: "Pulpiña", subtitle: "El centro del universo", color: "#e94560" },
  men: { name: "Pulpiña Men", subtitle: "Punk · Underground", color: "#c0392b" },
  moon: { name: "Pulpiña Moon", subtitle: "Romance gótico", color: "#7a0e1c" },
  sunshine: { name: "Pulpiña Sunshine", subtitle: "Prendas de otro mundo", color: "#ff5fa2" },
};

export const CATEGORIES = [
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "dresses", label: "Vestidos" },
  { id: "outerwear", label: "Abrigos" },
  { id: "accessories", label: "Accesorios" },
  { id: "shoes", label: "Zapatos" },
  { id: "jewelry", label: "Joyería" },
  { id: "bags", label: "Bolsos" },
];

export const formatPrice = (n: number) => `RD$ ${n.toLocaleString("es-DO")}`;
