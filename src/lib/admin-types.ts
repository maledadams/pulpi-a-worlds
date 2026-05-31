import type { Product, ProductVariant, Vibe } from "@/data/products";

export type AdminSection =
  | "resumen"
  | "productos"
  | "categorias"
  | "colecciones"
  | "pedidos"
  | "descuentos"
  | "media"
  | "configuracion";

export type AdminPaymentMethod = "transferencia" | "paypal" | "whatsapp";

export type AdminOrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "cancelled";

export type AdminInventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export type AdminProductRecord = {
  id: string;
  slug: string;
  name: string;
  vibe: Vibe;
  categories: string[];
  primaryCategory: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  stock: number | null;
  featured: boolean;
  newArrival: boolean;
  isNsfw: boolean;
  images: Product["images"];
  featuredImage: Product["featuredImage"];
  variants: ProductVariant[];
  tags: string[];
  createdAt: string;
};

export type AdminCategoryRecord = {
  id: string;
  label: string;
  isNsfw: boolean;
  vibes: Vibe[];
  productCount: number;
};

export type AdminCollectionRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  vibe: Vibe | "store";
  featured: boolean;
  categoryIds: string[];
  productIds: string[];
};

export type AdminOrderLine = {
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};

export type AdminOrderRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: AdminOrderStatus;
  paymentMethod: AdminPaymentMethod;
  subtotal: number;
  shipping: number;
  total: number;
  createdAt: string;
  notes: string;
  shippingAddress: {
    line1: string;
    city: string;
    province: string;
  };
  lines: AdminOrderLine[];
};

export type AdminDiscountRecord = {
  id: string;
  code: string;
  label: string;
  type: "percentage" | "fixed";
  value: number;
  active: boolean;
  scope: "store" | Vibe;
};

export type AdminMediaRecord = {
  id: string;
  productId: string;
  productName: string;
  vibe: Vibe;
  label: string;
  url: string | null;
  fallback: [string, string];
};

export type AdminSettingsRecord = {
  businessName: string;
  supportEmail: string;
  whatsappNumber: string;
  whatsappLabel: string;
  paypalEmail: string;
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountOwner: string;
  shippingNote: string;
  adminAllowedEmails: string[];
};

export type AdminDashboardSnapshot = {
  grossInventoryValue: number;
  productCount: number;
  orderCount: number;
  pendingPaymentCount: number;
  lowStockProducts: AdminProductRecord[];
  recentOrders: AdminOrderRecord[];
  productsByVibe: Array<{ vibe: Vibe; count: number }>;
};

