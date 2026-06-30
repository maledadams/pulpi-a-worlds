import { createFileRoute } from "@tanstack/react-router";
import { listPublicCollectionsInternal } from "@/lib/admin-content";
import { listStorefrontCatalogProductsInternal } from "@/lib/catalog";
import { absoluteSiteUrl } from "@/lib/seo";

type SitemapEntry = { lastmod?: string; path: string; priority?: number };

const PAGE_ENTRIES: SitemapEntry[] = [
  { path: "/", priority: 1 },
  { path: "/tienda", priority: 0.9 },
  { path: "/moon", priority: 0.8 },
  { path: "/sunshine", priority: 0.8 },
  { path: "/men", priority: 0.8 },
  { path: "/contacto", priority: 0.7 },
  { path: "/politicas", priority: 0.5 },
];

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function renderEntry(entry: SitemapEntry) {
  const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod.slice(0, 10))}</lastmod>` : "";
  const priority = typeof entry.priority === "number" ? `<priority>${entry.priority.toFixed(1)}</priority>` : "";
  return `<url><loc>${escapeXml(absoluteSiteUrl(entry.path))}</loc>${lastmod}${priority}</url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [products, collections] = await Promise.all([
          listStorefrontCatalogProductsInternal(),
          listPublicCollectionsInternal(),
        ]);
        const entries: SitemapEntry[] = [
          ...PAGE_ENTRIES,
          ...collections.map((collection) => ({ path: `/coleccion/${collection.slug}`, priority: 0.6 })),
          ...products.filter((product) => !product.hidden).map((product) => ({
            path: `/producto/${product.slug}`,
            lastmod: product.createdAt,
          })),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(renderEntry).join("")}</urlset>`;
        return new Response(body, {
          headers: {
            "Cache-Control": "public, max-age=300, s-maxage=3600",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
