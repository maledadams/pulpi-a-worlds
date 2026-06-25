import type { Product, ProductVariant, Vibe } from "@/data/products";
import type { AdminSizeFormat, AdminSizeFormatRecord } from "@/lib/product-sizing";

export type AdminSection =
  | "resumen"
  | "productos"
  | "categorias"
  | "colecciones"
  | "pedidos"
  | "descuentos"
  | "configuracion";

export type AdminInquiryChannel = "formulario" | "whatsapp" | "instagram" | "email";

export type AdminInquiryStatus =
  | "new"
  | "follow_up"
  | "quoted"
  | "closed"
  | "cancelled";

export type AdminInventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

export type AdminProductRecord = {
  id: string;
  slug: string;
  name: string;
  vibe: Vibe;
  sortOrder: number;
  categories: string[];
  primaryCategory: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  hidden: boolean;
  stock: number | null;
  featured: boolean;
  newArrival: boolean;
  isNsfw: boolean;
  images: Product["images"];
  featuredImage: Product["featuredImage"];
  sizes: string[];
  colors: NonNullable<Product["colors"]>;
  variants: ProductVariant[];
  tags: string[];
  createdAt: string;
};

export type AdminCategoryRecord = {
  id: string;
  previousId?: string;
  label: string;
  isNsfw: boolean;
  vibes: Vibe[];
  sizeFormat: AdminSizeFormat;
  productCount: number;
  sortOrder: number;
};

export type { AdminSizeFormatRecord };

export type AdminCollectionRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  vibe: Vibe | "store";
  published: boolean;
  featured: boolean;
  showOnHome: boolean;
  homeOrder: number;
  categoryIds: string[];
  productIds: string[];
};

export type AdminInquiryLine = {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
};

export type AdminInquiryRecord = {
  id: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: AdminInquiryStatus;
  channel: AdminInquiryChannel;
  fulfillmentMethod: "pickup" | "delivery";
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  createdAt: string;
  notes: string;
  paymentStatus: "pending" | "confirmed" | "cancelled";
  externalReference: string;
  adminTags: string[];
  shippingAddress: {
    line1: string;
    city: string;
    province: string;
  };
  lines: AdminInquiryLine[];
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

export type AdminAnnouncementRecord = {
  id: string;
  text: string;
  active: boolean;
};

export type AdminFooterColumnLink = {
  label: string;
  to: string;
};

export type AdminContactFaqRecord = {
  id: string;
  question: string;
  answer: string;
};

export type AdminLegalSectionRecord = {
  id: string;
  title: string;
  body: string;
};

export type AdminSettingsRecord = {
  businessName: string;
  supportEmail: string;
  whatsappNumber: string;
  whatsappLabel: string;
  instagramHandle: string;
  instagramUrl: string;
  contactResponseNote: string;
  adultAudienceNotice: string;
  contactPageTitle: string;
  contactPageIntro: string;
  contactCardNote: string;
  contactFaqs: AdminContactFaqRecord[];
  homeSelectionTitle: string;
  homeSelectionSubtitle: string;
  homeGeneralStoreCtaLabel: string;
  newsletterTitle: string;
  newsletterDescription: string;
  aboutPageTitle: string;
  aboutPageIntro: string;
  aboutStoryTitle: string;
  aboutStoryBody: string;
  aboutCtaLabel: string;
  moonPageTagline: string;
  moonPageIntro: string;
  sunshinePageTagline: string;
  sunshinePageIntro: string;
  menPageTagline: string;
  menPageIntro: string;
  vibeCatalogHeading: string;
  productDetailsTitle: string;
  productDetailsBody: string;
  productCareTitle: string;
  productCareBody: string;
  productShippingTitle: string;
  productShippingBody: string;
  footerHeading: string;
  footerAccent: string;
  footerCopyright: string;
  footerShopLinks: AdminFooterColumnLink[];
  footerHelpLinks: AdminFooterColumnLink[];
  legalPageTitle: string;
  legalLastUpdated: string;
  legalOperatorName: string;
  legalOperatorEmail: string;
  legalOperatorPhone: string;
  legalOperatorAddress: string;
  legalTaxId: string;
  legalIntro: string;
  legalSections: AdminLegalSectionRecord[];
  adminAllowedEmails: string[];
  announcements: AdminAnnouncementRecord[];
};

export type AdminDashboardSnapshot = {
  grossInventoryValue: number;
  productCount: number;
  inquiryCount: number;
  openInquiryCount: number;
  lowStockProducts: AdminProductRecord[];
  recentInquiries: AdminInquiryRecord[];
  productsByVibe: Array<{ vibe: Vibe; count: number }>;
};

