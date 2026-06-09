import {
  CATEGORIES,
  PRODUCTS,
  formatPrice,
  getCategoryLabel,
  type Product,
  type Vibe,
} from "@/data/products";
import type {
  AdminCategoryRecord,
  AdminCollectionRecord,
  AdminDashboardSnapshot,
  AdminDiscountRecord,
  AdminMediaRecord,
  AdminOrderRecord,
  AdminOrderStatus,
  AdminPaymentMethod,
  AdminProductRecord,
  AdminSettingsRecord,
} from "@/lib/admin-types";

const NSFW_CATEGORY_IDS = new Set(["lingerie", "kinkwear", "sex-toys"]);

function productCategories(product: Product) {
  return product.categories?.length ? product.categories : [product.category];
}

function toAdminProduct(product: Product): AdminProductRecord {
  const categories = productCategories(product);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    vibe: product.vibe,
    categories,
    primaryCategory: product.category,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    available: product.available,
    stock: product.stock,
    featured: product.featured,
    newArrival: product.newArrival,
    isNsfw: categories.some((category) => NSFW_CATEGORY_IDS.has(category)),
    images: product.images,
    featuredImage: product.featuredImage,
    variants: product.variants,
    tags: product.tags,
    createdAt: product.createdAt,
  };
}

export const ADMIN_PRODUCTS: AdminProductRecord[] = PRODUCTS.map(toAdminProduct);

export const ADMIN_CATEGORIES: AdminCategoryRecord[] = CATEGORIES.map((category) => {
  const matching = ADMIN_PRODUCTS.filter((product) => product.categories.includes(category.id));
  return {
    id: category.id,
    label: category.label,
    isNsfw: NSFW_CATEGORY_IDS.has(category.id),
    vibes: Array.from(new Set(matching.map((product) => product.vibe))),
    productCount: matching.length,
  };
});

export const ADMIN_COLLECTIONS: AdminCollectionRecord[] = [
  {
    id: "collection-moon-dark-romance",
    slug: "dark-romance",
    name: "Dark Romance",
    description: "Drop principal de Moon con vestidos, lenceria y piezas oscuras.",
    vibe: "moon",
    featured: true,
    categoryIds: ["dresses", "lingerie", "kinkwear"],
    productIds: ADMIN_PRODUCTS.filter((product) => product.vibe === "moon").slice(0, 5).map((product) => product.id),
  },
  {
    id: "collection-sunshine-hyper-gloss",
    slug: "hyper-gloss",
    name: "Hyper Gloss",
    description: "Cosplay, full body y accesorios glossy de Sunshine.",
    vibe: "sunshine",
    featured: true,
    categoryIds: ["cosplay", "full-body", "accessories"],
    productIds: ADMIN_PRODUCTS.filter((product) => product.vibe === "sunshine").slice(0, 5).map((product) => product.id),
  },
  {
    id: "collection-men-underground",
    slug: "underground-uniform",
    name: "Underground Uniform",
    description: "Seleccion compacta de outerwear, tops y bottoms de Men.",
    vibe: "men",
    featured: true,
    categoryIds: ["outerwear", "tops", "bottoms"],
    productIds: ADMIN_PRODUCTS.filter((product) => product.vibe === "men").slice(0, 5).map((product) => product.id),
  },
  {
    id: "collection-new-in",
    slug: "new-in",
    name: "New In",
    description: "Novedades visibles en la tienda general.",
    vibe: "store",
    featured: true,
    categoryIds: ["tops", "shoes", "bags"],
    productIds: ADMIN_PRODUCTS.filter((product) => product.newArrival).map((product) => product.id),
  },
];

const sampleOrderLines = (slugs: string[]) =>
  slugs.flatMap((slug, index) => {
    const product = ADMIN_PRODUCTS.find((entry) => entry.slug === slug);
    if (!product) {
      return [];
    }

    return [
      {
        productId: product.id,
        productName: product.name,
        variantLabel:
          product.variants[index]?.title ??
          product.variants[0]?.title ??
          "Default",
        quantity: index === 0 ? 1 : 2,
        unitPrice: product.price,
      },
    ];
  });

function orderTotal(lines: ReturnType<typeof sampleOrderLines>, shipping: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return { subtotal, total: subtotal + shipping };
}

function makeOrder(input: {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  createdAt: string;
  shipping: number;
  notes: string;
  shippingAddress: {
    line1: string;
    city: string;
    province: string;
  };
  slugs: string[];
}): AdminOrderRecord {
  const lines = sampleOrderLines(input.slugs);
  const totals = orderTotal(lines, input.shipping);
  return {
    id: input.id,
    orderNumber: input.orderNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: input.status,
    paymentMethod: input.paymentMethod,
    subtotal: totals.subtotal,
    shipping: input.shipping,
    total: totals.total,
    createdAt: input.createdAt,
    notes: input.notes,
    shippingAddress: input.shippingAddress,
    lines,
  };
}

export const ADMIN_ORDERS: AdminOrderRecord[] = [
  makeOrder({
    id: "order-1",
    orderNumber: "PUL-1001",
    customerName: "Camila Marte",
    customerEmail: "camila@example.com",
    customerPhone: "809-555-0101",
    status: "pending_payment",
    paymentMethod: "transferencia",
    createdAt: "2026-05-20T14:35:00.000Z",
    shipping: 250,
    notes: "Clienta dijo que enviara comprobante por WhatsApp.",
    shippingAddress: {
      line1: "Av. Sarasota 111",
      city: "Santo Domingo",
      province: "Distrito Nacional",
    },
    slugs: ["midnight-lace-set", "velvet-harness"],
  }),
  makeOrder({
    id: "order-2",
    orderNumber: "PUL-1002",
    customerName: "Mia Rosario",
    customerEmail: "mia@example.com",
    customerPhone: "829-555-0102",
    status: "paid",
    paymentMethod: "paypal",
    createdAt: "2026-05-20T18:10:00.000Z",
    shipping: 250,
    notes: "Pago confirmado por PayPal.",
    shippingAddress: {
      line1: "C/ Benito Moncion 15",
      city: "Santiago",
      province: "Santiago",
    },
    slugs: ["angel-cosplay-set", "kawaii-platforms"],
  }),
  makeOrder({
    id: "order-3",
    orderNumber: "PUL-1003",
    customerName: "Jose Delgado",
    customerEmail: "jose@example.com",
    customerPhone: "849-555-0103",
    status: "processing",
    paymentMethod: "whatsapp",
    createdAt: "2026-05-19T11:20:00.000Z",
    shipping: 300,
    notes: "Confirmado manualmente por chat.",
    shippingAddress: {
      line1: "Ens. Ozama",
      city: "Santo Domingo Este",
      province: "Santo Domingo",
    },
    slugs: ["patch-cargo", "stud-belt"],
  }),
  makeOrder({
    id: "order-4",
    orderNumber: "PUL-1004",
    customerName: "Laura Pena",
    customerEmail: "laura@example.com",
    customerPhone: "809-555-0104",
    status: "shipped",
    paymentMethod: "transferencia",
    createdAt: "2026-05-18T09:00:00.000Z",
    shipping: 250,
    notes: "Entregado a mensajeria.",
    shippingAddress: {
      line1: "Las Terrenas centro",
      city: "Las Terrenas",
      province: "Samana",
    },
    slugs: ["starlight-catsuit"],
  }),
];

export const ADMIN_DISCOUNTS: AdminDiscountRecord[] = [
  {
    id: "discount-new10",
    code: "NEW10",
    label: "Bienvenida general",
    type: "percentage",
    value: 10,
    active: true,
    scope: "store",
  },
  {
    id: "discount-moon500",
    code: "MOON500",
    label: "Drop Moon",
    type: "fixed",
    value: 500,
    active: false,
    scope: "moon",
  },
];

export const ADMIN_MEDIA: AdminMediaRecord[] = ADMIN_PRODUCTS.map((product) => ({
  id: `media-${product.id}`,
  productId: product.id,
  productName: product.name,
  vibe: product.vibe,
  label: product.featuredImage ? "Principal" : "Placeholder",
  url: product.featuredImage?.url ?? null,
  fallback:
    product.images[0]?.url || product.featuredImage?.url
      ? ["#efe7dc", "#f7f2ea"]
      : [product.vibe === "moon" ? "#45121e" : product.vibe === "men" ? "#241d1d" : "#ffd2e4", product.vibe === "sunshine" ? "#fff0a8" : "#f3e7dd"],
}));

export const ADMIN_SETTINGS: AdminSettingsRecord = {
  businessName: "Pulpiña RD",
  supportEmail: "hola@pulpina.do",
  whatsappNumber: "18095550199",
  whatsappLabel: "+1 (809) 555-0199",
  paypalEmail: "payments@pulpina.do",
  bankName: "Banco Popular Dominicano",
  bankAccountType: "Cuenta corriente",
  bankAccountNumber: "123456789",
  bankAccountOwner: "Pulpiña RD",
  azulMerchantId: "",
  azulMerchantName: "PULPINA RD",
  azulMerchantType: "E-Commerce",
  shippingNote:
    "Enviaremos confirmación manual por WhatsApp cuando el pago esté validado. El tiempo de despacho depende del stock y la ciudad.",
  adminAllowedEmails: [],
};

export function getAdminDashboardSnapshot(): AdminDashboardSnapshot {
  const grossInventoryValue = ADMIN_PRODUCTS.reduce(
    (sum, product) => sum + product.price * (product.stock ?? 0),
    0,
  );
  const productsByVibe = (["moon", "sunshine", "men"] as Vibe[]).map((vibe) => ({
    vibe,
    count: ADMIN_PRODUCTS.filter((product) => product.vibe === vibe).length,
  }));

  return {
    grossInventoryValue,
    productCount: ADMIN_PRODUCTS.length,
    orderCount: ADMIN_ORDERS.length,
    pendingPaymentCount: ADMIN_ORDERS.filter((order) => order.status === "pending_payment").length,
    lowStockProducts: ADMIN_PRODUCTS.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 4),
    recentOrders: [...ADMIN_ORDERS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4),
    productsByVibe,
  };
}

export function formatAdminOrderStatus(status: AdminOrderStatus) {
  return {
    pending_payment: "Pendiente pago",
    paid: "Pagado",
    processing: "Preparando",
    shipped: "Enviado",
    cancelled: "Cancelado",
  }[status];
}

export function formatAdminPaymentMethod(method: AdminPaymentMethod) {
  return {
    transferencia: "Transferencia",
    paypal: "PayPal",
    whatsapp: "WhatsApp",
    azul: "AZUL",
  }[method];
}

export function getInventoryStatus(product: AdminProductRecord) {
  if (!product.available || (product.stock ?? 0) <= 0) return "Agotado";
  if ((product.stock ?? 0) <= 4) return "Poco stock";
  return "Disponible";
}

export function getInventoryStatusTone(product: AdminProductRecord) {
  if (!product.available || (product.stock ?? 0) <= 0) return "bg-zinc-200 text-zinc-800";
  if ((product.stock ?? 0) <= 4) return "bg-amber-200 text-amber-950";
  return "bg-emerald-200 text-emerald-950";
}

export function getAdminCollectionProducts(collection: AdminCollectionRecord) {
  return collection.productIds
    .map((id) => ADMIN_PRODUCTS.find((product) => product.id === id))
    .filter((product): product is AdminProductRecord => Boolean(product));
}

export function getAdminCategoryProducts(categoryId: string) {
  return ADMIN_PRODUCTS.filter((product) => product.categories.includes(categoryId));
}

export function getOrderRevenueLabel() {
  return formatPrice(
    ADMIN_ORDERS.reduce((sum, order) => sum + order.total, 0),
    "DOP",
  );
}

export function getVibeLabel(vibe: Vibe | "store") {
  if (vibe === "store") return "General";
  return vibe === "moon" ? "Moon" : vibe === "sunshine" ? "Sunshine" : vibe === "men" ? "Men" : "Tienda";
}

export function getCompactCategoryLabel(categoryId: string) {
  return getCategoryLabel(categoryId);
}
