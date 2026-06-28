import {
  CATEGORIES,
  PRODUCTS,
  formatPrice,
  getCategoryLabel,
  type Product,
  type Vibe,
} from "@/data/products";
import { getCategorySizeFormat, normalizeSizeList } from "@/lib/product-sizing";
import type {
  AdminAnnouncementRecord,
  AdminCategoryRecord,
  AdminContactFaqRecord,
  AdminCollectionRecord,
  AdminDashboardSnapshot,
  AdminDiscountRecord,
  AdminFooterColumnLink,
  AdminInquiryChannel,
  AdminInquiryRecord,
  AdminInquiryStatus,
  AdminLegalSectionRecord,
  AdminProductRecord,
  AdminSettingsRecord,
} from "@/lib/admin-types";

const NSFW_CATEGORY_IDS = new Set(["lingerie", "kinkwear", "sex-toys"]);

function productCategories(product: Product) {
  return product.categories?.length ? product.categories : [product.category];
}

export function toAdminProductRecord(product: Product): AdminProductRecord {
  const categories = productCategories(product);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    vibe: product.vibe,
    sortOrder: product.sortOrder ?? 0,
    categories,
    primaryCategory: product.category,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    available: product.available,
    hidden: product.hidden,
    stock: product.stock,
    featured: product.featured,
    newArrival: product.newArrival,
    isNsfw: categories.some((category) => NSFW_CATEGORY_IDS.has(category)),
    images: product.images,
    featuredImage: product.featuredImage,
    sizes: product.sizes ? normalizeSizeList(product.sizes) : ["Unica"],
    colors: product.colors?.map((color) => ({ ...color })) ?? [],
    variants: product.variants,
    tags: product.tags,
    createdAt: product.createdAt,
  };
}

export const ADMIN_PRODUCTS: AdminProductRecord[] = PRODUCTS.filter((product) => product.vibe !== "pulpina").map(toAdminProductRecord);

export function buildAdminCategories(products: AdminProductRecord[]) {
  return CATEGORIES.map((category) => {
    const matching = products.filter((product) => product.categories.includes(category.id));
    return {
      id: category.id,
      label: category.label,
      isNsfw: NSFW_CATEGORY_IDS.has(category.id),
      vibes: Array.from(
        new Set(
          matching
            .map((product) => product.vibe)
            .filter((vibe): vibe is Exclude<Vibe, "pulpina"> => vibe !== "pulpina"),
        ),
      ),
      sizeFormat: getCategorySizeFormat(category.id),
      productCount: matching.length,
      sortOrder: CATEGORIES.findIndex((entry) => entry.id === category.id),
    } satisfies AdminCategoryRecord;
  });
}

export function buildAdminCollections(products: AdminProductRecord[]) {
  return [
    {
      id: "collection-recien-llegado",
      slug: "recien-llegado",
      name: "Recien llegado",
      description: "Rail principal del inicio para las piezas mas nuevas.",
      vibe: "store",
      published: true,
      featured: true,
      showOnHome: true,
      homeOrder: 0,
      categoryIds: [],
      productIds: products.filter((product) => product.newArrival).slice(0, 12).map((product) => product.id),
    },
    {
      id: "collection-escojido-para-ti",
      slug: "escojido-para-ti",
      name: "Escojido para ti",
      description: "Curaduria editable del inicio para destacar piezas clave.",
      vibe: "store",
      published: true,
      featured: true,
      showOnHome: true,
      homeOrder: 1,
      categoryIds: [],
      productIds: products.filter((product) => product.featured).slice(0, 12).map((product) => product.id),
    },
    {
      id: "collection-moon-dark-romance",
      slug: "dark-romance",
      name: "Dark Romance",
      description: "Drop principal de Moon con vestidos, lenceria y piezas oscuras.",
      vibe: "moon",
      published: true,
      featured: true,
      showOnHome: false,
      homeOrder: 10,
      categoryIds: ["dresses", "lingerie", "kinkwear"],
      productIds: products.filter((product) => product.vibe === "moon").slice(0, 5).map((product) => product.id),
    },
    {
      id: "collection-sunshine-hyper-gloss",
      slug: "hyper-gloss",
      name: "Hyper Gloss",
      description: "Cosplay, full body y accesorios glossy de Sunshine.",
      vibe: "sunshine",
      published: true,
      featured: true,
      showOnHome: false,
      homeOrder: 11,
      categoryIds: ["cosplay", "full-body", "accessories"],
      productIds: products.filter((product) => product.vibe === "sunshine").slice(0, 5).map((product) => product.id),
    },
    {
      id: "collection-men-underground",
      slug: "underground-uniform",
      name: "Underground Uniform",
      description: "Seleccion compacta de outerwear, tops y bottoms de Men.",
      vibe: "men",
      published: true,
      featured: true,
      showOnHome: false,
      homeOrder: 12,
      categoryIds: ["outerwear", "tops", "bottoms"],
      productIds: products.filter((product) => product.vibe === "men").slice(0, 5).map((product) => product.id),
    },
  ] satisfies AdminCollectionRecord[];
}

export function getAdminCategoryProductsFromProducts(products: AdminProductRecord[], categoryId: string) {
  return products.filter((product) => product.categories.includes(categoryId));
}

export function getAdminCollectionProductsFromProducts(
  products: AdminProductRecord[],
  collection: AdminCollectionRecord,
) {
  return collection.productIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is AdminProductRecord => Boolean(product));
}

export const ADMIN_CATEGORIES: AdminCategoryRecord[] = buildAdminCategories(ADMIN_PRODUCTS);

export const ADMIN_COLLECTIONS: AdminCollectionRecord[] = buildAdminCollections(ADMIN_PRODUCTS);

const sampleInquiryLines = (slugs: string[]) =>
  slugs.flatMap((slug, index) => {
    const product = ADMIN_PRODUCTS.find((entry) => entry.slug === slug);
    if (!product) {
      return [];
    }

    return [
      {
        productId: product.id,
        productName: product.name,
        variantId:
          product.variants[index]?.id ??
          product.variants[0]?.id ??
          "",
        variantLabel:
          product.variants[index]?.title ??
          product.variants[0]?.title ??
          "Default",
        quantity: index === 0 ? 1 : 2,
        unitPrice: product.price,
      },
    ];
  });

function inquiryTotals(lines: ReturnType<typeof sampleInquiryLines>, shipping: number) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  return { subtotal, total: subtotal + shipping };
}

function makeInquiry(input: {
  id: string;
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: AdminInquiryStatus;
  channel: AdminInquiryChannel;
  fulfillmentMethod: "pickup" | "delivery";
  createdAt: string;
  shipping: number;
  notes: string;
  shippingAddress: {
    line1: string;
    city: string;
    province: string;
  };
  slugs: string[];
}): AdminInquiryRecord {
  const lines = sampleInquiryLines(input.slugs);
  const totals = inquiryTotals(lines, input.shipping);
  return {
    id: input.id,
    requestNumber: input.requestNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: input.status,
    channel: input.channel,
    fulfillmentMethod: input.fulfillmentMethod,
    subtotal: totals.subtotal,
    shipping: input.shipping,
    discount: 0,
    total: totals.total,
    createdAt: input.createdAt,
    notes: input.notes,
    paymentStatus: input.status === "closed" ? "confirmed" : input.status === "cancelled" ? "cancelled" : "pending",
    externalReference: "",
    adminTags: [],
    shippingAddress: input.shippingAddress,
    lines,
  };
}

export const ADMIN_INQUIRIES: AdminInquiryRecord[] = [
  makeInquiry({
    id: "inquiry-1",
    requestNumber: "PUL-000000",
    customerName: "Camila Marte",
    customerEmail: "camila@example.com",
    customerPhone: "809-555-0101",
    status: "closed",
    channel: "whatsapp",
    fulfillmentMethod: "delivery",
    createdAt: "2026-06-14T14:35:00.000Z",
    shipping: 250,
    notes: "Compra cerrada por WhatsApp con entrega local.",
    shippingAddress: {
      line1: "Av. Sarasota 111",
      city: "Santo Domingo",
      province: "Distrito Nacional",
    },
    slugs: ["midnight-lace-set", "velvet-harness"],
  }),
  makeInquiry({
    id: "inquiry-2",
    requestNumber: "PUL-000001",
    customerName: "Mia Rosario",
    customerEmail: "mia@example.com",
    customerPhone: "829-555-0102",
    status: "quoted",
    channel: "formulario",
    fulfillmentMethod: "delivery",
    createdAt: "2026-06-10T18:10:00.000Z",
    shipping: 250,
    notes: "Se envio cotizacion con costo de envio a Santiago.",
    shippingAddress: {
      line1: "C/ Benito Moncion 15",
      city: "Santiago",
      province: "Santiago",
    },
    slugs: ["angel-cosplay-set", "kawaii-platforms"],
  }),
  makeInquiry({
    id: "inquiry-3",
    requestNumber: "PUL-000002",
    customerName: "Jose Delgado",
    customerEmail: "jose@example.com",
    customerPhone: "849-555-0103",
    status: "follow_up",
    channel: "instagram",
    fulfillmentMethod: "pickup",
    createdAt: "2026-06-03T11:20:00.000Z",
    shipping: 300,
    notes: "Pregunto por tallas disponibles para Men.",
    shippingAddress: {
      line1: "Ens. Ozama",
      city: "Santo Domingo Este",
      province: "Santo Domingo",
    },
    slugs: ["patch-cargo", "stud-belt"],
  }),
  makeInquiry({
    id: "inquiry-4",
    requestNumber: "PUL-000003",
    customerName: "Laura Pena",
    customerEmail: "laura@example.com",
    customerPhone: "809-555-0104",
    status: "cancelled",
    channel: "email",
    fulfillmentMethod: "delivery",
    createdAt: "2026-06-01T09:00:00.000Z",
    shipping: 250,
    notes: "Cancelado por falta de stock despues de separar el pedido.",
    shippingAddress: {
      line1: "Las Terrenas centro",
      city: "Las Terrenas",
      province: "Samana",
    },
    slugs: ["starlight-catsuit"],
  }),
  makeInquiry({
    id: "inquiry-5",
    requestNumber: "PUL-000004",
    customerName: "Nadia Castillo",
    customerEmail: "nadia@example.com",
    customerPhone: "849-555-0105",
    status: "closed",
    channel: "instagram",
    fulfillmentMethod: "pickup",
    createdAt: "2026-01-22T16:15:00.000Z",
    shipping: 250,
    notes: "Pedido manual tomado por DM y confirmado el mismo dia.",
    shippingAddress: {
      line1: "Calle Central 8",
      city: "Santiago",
      province: "Santiago",
    },
    slugs: ["angel-cosplay-set"],
  }),
  makeInquiry({
    id: "inquiry-6",
    requestNumber: "PUL-000005",
    customerName: "Erick Santana",
    customerEmail: "erick@example.com",
    customerPhone: "809-555-0106",
    status: "closed",
    channel: "whatsapp",
    fulfillmentMethod: "delivery",
    createdAt: "2025-11-08T10:05:00.000Z",
    shipping: 300,
    notes: "Venta manual de temporada previa, ya entregada.",
    shippingAddress: {
      line1: "Urbanizacion Fernandez",
      city: "Santo Domingo",
      province: "Distrito Nacional",
    },
    slugs: ["patch-cargo", "stud-belt"],
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

const ADMIN_ANNOUNCEMENTS: AdminAnnouncementRecord[] = [
  {
    id: "announcement-offers",
    text: "Ofertas de la semana activas hasta agotar existencia.",
    active: true,
  },
  {
    id: "announcement-whatsapp-checkout",
    text: "Al finalizar tu pedido te daremos tu numero PUL para completarlo por WhatsApp.",
    active: true,
  },
  {
    id: "announcement-ops",
    text: "Si surge algun inconveniente operativo lo avisaremos aqui primero.",
    active: false,
  },
];

const DEFAULT_CONTACT_FAQS: AdminContactFaqRecord[] = [
  {
    id: "faq-shipping",
    question: "Hacen envios a todo el pais?",
    answer:
      "Si. Confirmamos disponibilidad, costo y tiempo de entrega antes de cerrar cada pedido manual.",
  },
  {
    id: "faq-web-checkout",
    question: "Puedo pagar directamente en la web?",
    answer:
      "No. La web genera tu numero de orden y el cierre final se coordina por WhatsApp u otro canal directo.",
  },
  {
    id: "faq-drop",
    question: "Cuando sale el proximo drop?",
    answer:
      "Suscribete a la lista para enterarte antes de que el drop salga publico.",
  },
];

const DEFAULT_FOOTER_SHOP_LINKS: AdminFooterColumnLink[] = [
  { label: "Tienda", to: "/tienda" },
  { label: "Moon", to: "/moon" },
  { label: "Sunshine", to: "/sunshine" },
  { label: "Men", to: "/men" },
];

const DEFAULT_FOOTER_HELP_LINKS: AdminFooterColumnLink[] = [
  { label: "Contactanos", to: "/contacto" },
  { label: "Politicas y privacidad", to: "/politicas" },
];

const DEFAULT_LEGAL_SECTIONS: AdminLegalSectionRecord[] = [
  {
    id: "identidad",
    title: "1. Identidad del responsable",
    body:
      "Marca comercial: Pulpiña RD.\nCanales publicados: hola@pulpina.do, Instagram @pulpina.rd y atencion desde Santo Domingo, Republica Dominicana.\nAntes del lanzamiento comercial debes completar razon social, RNC, domicilio legal y telefono empresarial oficial.",
  },
  {
    id: "alcance",
    title: "2. Alcance del sitio",
    body:
      "El sitio funciona como catalogo digital, formulario de contacto, newsletter y generador de pedidos manuales.\nLa web no procesa pagos ni tarjetas dentro de la app publica.\nLas imagenes, precios y disponibilidad son referenciales hasta la confirmacion final por mensaje.",
  },
  {
    id: "datos",
    title: "3. Datos que recopilamos",
    body:
      "Podemos recopilar nombre, correo, telefono, mensaje y datos de pedido que compartas voluntariamente.\nTambien podemos registrar IP, navegador, fechas, resultados anti-bot y registros de acceso administrativo cuando sea necesario para seguridad y operacion.",
  },
  {
    id: "finalidades",
    title: "4. Finalidades del tratamiento",
    body:
      "Usamos los datos para responder consultas, generar numeros de orden, coordinar disponibilidad, preparar cotizaciones, atender soporte, prevenir abuso tecnico y proteger la integridad del sitio.\nSi te suscribes al newsletter, usaremos tu correo para enviarte novedades y promociones hasta que te des de baja.",
  },
  {
    id: "seguridad-proveedores",
    title: "5. Seguridad, cookies y proveedores",
    body:
      "Este sitio usa Cloudflare para hosting, seguridad y funciones de infraestructura.\nLos formularios publicos usan Cloudflare Turnstile para reducir abuso automatizado.\nEl carrito usa almacenamiento local del navegador. Si lo desactivas, algunas funciones pueden dejar de operar correctamente.",
  },
  {
    id: "marketing",
    title: "6. Marketing y newsletter",
    body:
      "Solo debes suscribirte con un correo propio y valido.\nPuedes pedir la baja escribiendo a hola@pulpina.do o usando el mecanismo disponible en el mensaje recibido.\nNo venderemos tu lista de contactos como base de datos independiente.",
  },
  {
    id: "transparencia",
    title: "7. Transparencia comercial",
    body:
      "El numero de orden sirve como referencia operativa y no garantiza reserva automatica de inventario ni aceptacion irrevocable de una venta.\nAntes de cerrar una compra debemos confirmar disponibilidad, variante, envio, impuestos aplicables, plazo de entrega y precio total.\nNo usamos cargos automaticos ni aceptacion por inaccion.",
  },
  {
    id: "adultos",
    title: "8. Menores de edad y contenido adulto",
    body:
      "Algunas categorias del catalogo estan dirigidas solo a personas adultas.\nNo comercializamos ni promovemos productos de contenido adulto a menores de edad.\nSi detectas un uso indebido por un menor, puedes escribirnos para solicitar revision razonable.",
  },
  {
    id: "derechos",
    title: "9. Tus derechos y contacto legal",
    body:
      "Puedes escribirnos para solicitar acceso razonable a tus datos, correccion, actualizacion, baja de marketing o revision de un uso especifico de la informacion.\nConservaremos datos solo durante el tiempo necesario para la finalidad original, soporte, auditoria, prevencion de fraude o cumplimiento legal.\nSi el cambio de politica es material, procuraremos notificarlo por un medio razonable dentro del sitio.",
  },
  {
    id: "ley",
    title: "10. Ley aplicable y reclamaciones",
    body:
      "Estas politicas se interpretan conforme a las leyes aplicables de la Republica Dominicana.\nSi tienes una reclamacion, primero te pedimos contactarnos para intentar una solucion directa y razonable.\nSin perjuicio de otros derechos legales, tambien puedes acudir a las autoridades competentes de proteccion al consumidor.",
  },
];

export const ADMIN_SETTINGS: AdminSettingsRecord = {
  businessName: "Pulpiña RD",
  supportEmail: "hola@pulpina.do",
  whatsappNumber: "18095550199",
  whatsappLabel: "+1 (809) 555-0199",
  instagramHandle: "@pulpina.rd",
  instagramUrl: "https://instagram.com/pulpina.rd",
  contactResponseNote:
    "Respondemos solicitudes de producto y disponibilidad por formulario, correo o WhatsApp dentro de 1 a 2 dias habiles.",
  adultAudienceNotice:
    "Algunas categorias del catalogo son solo para personas adultas. No promovemos ni vendemos productos para menores de edad.",
  contactPageTitle: "Contactanos",
  contactPageIntro:
    "Dudas, colaboraciones o consultas de producto. Escribenos y te respondemos por el canal mas conveniente.",
  contactCardNote:
    "El sitio publico no recibe pagos ni datos de tarjetas. La coordinacion final se hace por mensaje directo y fuera de esta app.",
  contactFaqs: DEFAULT_CONTACT_FAQS,
  homeSelectionTitle: "Elige tu tienda",
  homeSelectionSubtitle:
    "Tres universos, tres entradas distintas. Elige la vibra que quieres explorar primero.",
  homeGeneralStoreCtaLabel: "Quiero explorar la tienda general",
  newsletterTitle: "Descuento de cumpleanos",
  newsletterDescription:
    "Suscribete y recibe un cupon especial el dia de tu cumpleanos.",
  aboutPageTitle: "Somos Pulpina",
  aboutPageIntro:
    "Una marca dominicana de moda alternativa con tres mundos bien definidos. Nacimos para vestir a quienes no encajan en una sola caja.",
  aboutStoryTitle: "Nuestra historia",
  aboutStoryBody:
    "Pulpina nacio como un espacio para personas que aman vestirse fuera del molde. Hoy somos una marca que construye comunidad alrededor de lo alternativo, lo expresivo y lo autentico en Republica Dominicana.",
  aboutCtaLabel: "Ver la tienda",
  moonPageTagline: "Gotico - Eerie - Antique",
  moonPageIntro:
    "Romance oscuro. Encajes, rosas marchitas, candelabros y un tercer ojo siempre abierto.",
  sunshinePageTagline: "Kawaii - Y2K - Glossy",
  sunshinePageIntro:
    "Rosa bubblegum, leopardo, perlas y mucho brillo. Para princesas alternativas de otro mundo.",
  menPageTagline: "Punk - Studded - Distressed",
  menPageIntro:
    "Cuero, puas, parches y actitud. Streetwear alternativo para los que escuchan a los sin voz.",
  vibeCatalogHeading: "Toda la Linea",
  productDetailsTitle: "Detalles",
  productDetailsBody:
    "Diseno exclusivo Pulpiña RD. Edicion limitada, hecha en Republica Dominicana.",
  productCareTitle: "Cuidado",
  productCareBody: "Lavar a mano con agua fria. No usar secadora.",
  productShippingTitle: "Envio",
  productShippingBody:
    "Envios en toda RD. El cierre final y la coordinacion se hacen por WhatsApp.",
  footerHeading: "Pulpiña RD",
  footerAccent: "Solicitudes por WhatsApp",
  footerCopyright: "© {year} Pulpiña RD.",
  footerShopLinks: DEFAULT_FOOTER_SHOP_LINKS,
  footerHelpLinks: DEFAULT_FOOTER_HELP_LINKS,
  legalPageTitle: "Politicas, privacidad y terminos",
  legalLastUpdated: "18 de junio de 2026",
  legalOperatorName: "Pulpiña RD",
  legalOperatorEmail: "hola@pulpina.do",
  legalOperatorPhone: "+1 (809) 555-0199",
  legalOperatorAddress: "Santo Domingo, Republica Dominicana",
  legalTaxId: "Completar antes del lanzamiento comercial",
  legalIntro:
    "Este sitio funciona como catalogo digital y canal de contacto para Pulpiña RD. No procesa pagos ni tarjetas dentro de la app publica.",
  legalSections: DEFAULT_LEGAL_SECTIONS,
  adminAllowedEmails: [],
  announcements: ADMIN_ANNOUNCEMENTS,
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
    inquiryCount: ADMIN_INQUIRIES.length,
    openInquiryCount: ADMIN_INQUIRIES.filter((inquiry) => inquiry.status !== "closed" && inquiry.status !== "cancelled").length,
    lowStockProducts: ADMIN_PRODUCTS.filter((product) => (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 4),
    recentInquiries: [...ADMIN_INQUIRIES].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3),
    productsByVibe,
  };
}

export function formatAdminInquiryStatus(status: AdminInquiryStatus) {
  return {
    new: "Nueva",
    follow_up: "Seguimiento",
    quoted: "Cotizada",
    closed: "Cerrada",
    cancelled: "Cancelada",
  }[status];
}

export function formatAdminInquiryChannel(channel: AdminInquiryChannel) {
  return {
    formulario: "Formulario",
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    email: "Email",
  }[channel];
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
  return getAdminCollectionProductsFromProducts(ADMIN_PRODUCTS, collection);
}

export function getAdminCategoryProducts(categoryId: string) {
  return getAdminCategoryProductsFromProducts(ADMIN_PRODUCTS, categoryId);
}

export function getInquiryRevenueLabel() {
  return formatPrice(
    ADMIN_INQUIRIES.reduce((sum, inquiry) => sum + inquiry.total, 0),
    "DOP",
  );
}

export function getVibeLabel(vibe: Vibe | "store") {
  if (vibe === "store" || vibe === "pulpina") return "General";
  return vibe === "moon" ? "Moon" : vibe === "sunshine" ? "Sunshine" : "Men";
}

export function getCompactCategoryLabel(categoryId: string) {
  return getCategoryLabel(categoryId);
}
