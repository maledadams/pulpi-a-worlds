export const SITE_URL = "https://pulpinastore.com";
export const SITE_NAME = "Pulpiña RD";

type SeoOptions = {
  description?: string;
  noIndex?: boolean;
  pageName: string;
  path: string;
  type?: "website" | "product";
};

export function absoluteSiteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}

export function createSeoHead({ description, noIndex = false, pageName, path, type = "website" }: SeoOptions) {
  const title = `${SITE_NAME} | ${pageName}`;
  const url = absoluteSiteUrl(path);
  const meta: Array<Record<string, string>> = [
    { title },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "es_DO" },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:url", content: url },
  ];

  if (description) {
    meta.push(
      { name: "description", content: description },
      { property: "og:description", content: description },
    );
  }
  if (noIndex) meta.push({ name: "robots", content: "noindex, nofollow, noarchive" });

  return {
    meta,
    links: noIndex ? [] : [{ rel: "canonical", href: url }],
  };
}
