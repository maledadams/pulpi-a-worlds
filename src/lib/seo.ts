import defaultShareImage from "@/assets/logo-sunshine.png";

export const SITE_URL = "https://pulpinastore.com";
export const SITE_NAME = "Pulpiña RD";

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
  if (noIndex) meta.push({ name: "robots", content: "noindex, nofollow, noarchive" });

  return {
    meta,
    links: noIndex ? [] : [{ rel: "canonical", href: url }],
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
