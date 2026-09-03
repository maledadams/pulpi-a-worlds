import defaultShareImage from "@/assets/logo-sunshine.png";

export const SITE_URL = "https://pulpinastore.com";
export const SITE_NAME = "Pulpiña RD";
// So Google associates searches for the name without the ñ (or without
// "RD") with the same brand - people type this store's name several ways.
// This list is also the main lever for separating this store from the
// unrelated "Pulpina" cartoon character (Sea Princesses), which otherwise
// owns the bare, un-qualified spelling in both search and AI answers.
export const SITE_NAME_VARIANTS = [
  "Pulpina RD",
  "Pulpiña",
  "Pulpina",
  "PulpinaRD",
  "Pulpina Store",
  "Pulpiña Store",
  "Pulpina RD Store",
  "pulpinastore",
];

export const SITE_DESCRIPTION =
  "Pulpiña RD (también escrita Pulpina RD) es una boutique de moda alternativa en República Dominicana desde 2020, con colecciones curadas de ropa, calzado y accesorios para todos los géneros.";

export const SITE_FOUNDING_DATE = "2020-01-21";

// Published on /contacto - repeating them as machine-readable contact points
// gives search and AI engines a second, corroborating signal that this is a
// real Dominican business.
export const SITE_WHATSAPP_NUMBERS = ["+1-829-964-3104", "+1-829-549-0112"];

// The catalog's real search URL - lets Google wire up a sitelinks searchbox
// pointing at the store's own search instead of guessing.
const SEARCH_URL_TEMPLATE = `${SITE_URL}/tienda?q={search_term_string}`;

type SeoOptions = {
  description?: string;
  image?: string;
  noIndex?: boolean;
  pageName: string;
  path: string;
  type?: "website" | "product";
};

export function absoluteSiteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createSeoHead({ description, image, noIndex = false, pageName, path, type = "website" }: SeoOptions) {
  const title = `${SITE_NAME} | ${pageName}`;
  const url = absoluteSiteUrl(path);
  const imageUrl = absoluteSiteUrl(image || defaultShareImage);
  const meta: Array<Record<string, string>> = [
    { title },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "es_DO" },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:url", content: url },
    { property: "og:image", content: imageUrl },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:image", content: imageUrl },
  ];

  if (description) {
    meta.push(
      { name: "description", content: description },
      { property: "og:description", content: description },
      { name: "twitter:description", content: description },
    );
  }
  if (noIndex) {
    meta.push({ name: "robots", content: "noindex, nofollow, noarchive" });
  } else {
    // Without this, engines cap image previews and truncate snippets by their
    // own defaults. Bing, DuckDuckGo (Bing-backed) and AI answer engines all
    // read it, and a longer permitted snippet is literally more of the page
    // an answer engine is allowed to quote back.
    meta.push({
      name: "robots",
      content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    });
  }

  return {
    meta,
    links: noIndex ? [] : [{ rel: "canonical", href: url }],
  };
}

// Google's merchant/product structured data treats a missing "image" as a
// critical error - products without real photos still need something here.
export function resolveStructuredDataImage(image?: string) {
  return [absoluteSiteUrl(image || defaultShareImage)];
}

// Stable @id anchors so every JSON-LD block on the site points at the same
// two entities instead of Google/LLMs inferring a new nameless one per page.
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * OnlineStore rather than plain Organization: the more specific type, the
 * easier it is for search and AI answer engines to tell this retailer apart
 * from the "Pulpina" cartoon character that shares the un-tilded spelling.
 * areaServed/currency/language all push the same way - they describe a
 * Dominican shop, which a fictional octopus princess is not.
 */
export function buildOrganizationJsonLd({ logo, sameAs = [] }: { logo: string; sameAs?: string[] }) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_VARIANTS,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo,
    image: logo,
    areaServed: { "@type": "Country", name: "República Dominicana" },
    address: { "@type": "PostalAddress", addressCountry: "DO" },
    currenciesAccepted: "DOP",
    knowsLanguage: "es-DO",
    foundingDate: SITE_FOUNDING_DATE,
    // A dated founding, real phone numbers and a described catalog are all
    // things a fictional character doesn't have. Each one widens the gap
    // between this store and the cartoon sharing the un-tilded name.
    contactPoint: SITE_WHATSAPP_NUMBERS.map((telephone) => ({
      "@type": "ContactPoint",
      telephone,
      contactType: "customer service",
      areaServed: "DO",
      availableLanguage: ["es", "en"],
    })),
    knowsAbout: [
      "moda alternativa",
      "ropa alternativa",
      "ropa gótica",
      "streetwear alternativo",
      "accesorios alternativos",
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/**
 * Catalog pages (/tienda and each sub-store) had no structured data at all,
 * so nothing told an engine what those pages are or how they relate to the
 * store. Deliberately does NOT enumerate every product as an ItemList: with
 * ~300 products that would add serious weight to exactly the pages whose
 * render cost we just spent effort reducing, and the sitemap already lists
 * every product URL for crawlers.
 */
export function buildCollectionPageJsonLd({
  description,
  name,
  path,
}: {
  description?: string;
  name: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${name} | ${SITE_NAME}`,
    url: absoluteSiteUrl(path),
    inLanguage: "es-DO",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
    ...(description ? { description } : {}),
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_NAME_VARIANTS,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    inLanguage: "es-DO",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: SEARCH_URL_TEMPLATE },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteSiteUrl(item.path) } : {}),
    })),
  };
}
