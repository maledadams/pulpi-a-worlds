import { createFileRoute } from "@tanstack/react-router";
import { getCategoryLabel, type Product } from "@/data/products";
import { listStorefrontCatalogProductsInternal } from "@/lib/catalog";
import { absoluteSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

/**
 * Google Merchant Center product feed.
 *
 * Merchant was only seeing a fraction of the catalog because there was no
 * feed at all - Google was discovering products by crawling page by page,
 * which never finishes covering a catalog this size and silently drops
 * whatever it hasn't reached yet. A feed hands it every visible product in
 * one fetch, so coverage stops depending on crawl budget.
 *
 * One entry per product, not per size/colour variant. That matches how the
 * product page actually sells (pick size and colour on the page itself) and
 * keeps the feed at ~433 items instead of several thousand. If Shopping ads
 * for apparel are ever run, that's the point to split into variant rows
 * with g:item_group_id - free listings don't need it.
 */

const FEED_TITLE = `${SITE_NAME} - Catálogo`;
// Google truncates past these; trimming here keeps entries from being
// rejected outright for length.
const MAX_TITLE = 150;
const MAX_DESCRIPTION = 5000;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function clamp(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function formatAmount(amount: number, currency: string) {
  return `${amount.toFixed(2)} ${currency}`;
}

function tag(name: string, value: string) {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function renderItem(product: Product) {
  const link = absoluteSiteUrl(`/producto/${product.slug}`);
  const images = product.featuredImage
    ? [product.featuredImage, ...product.images.filter((image) => image.url !== product.featuredImage?.url)]
    : product.images;
  const primaryImage = images[0]?.url;

  // No image means Google rejects the entry anyway - skip rather than
  // submit something guaranteed to be disapproved.
  if (!primaryImage) return "";

  const currency = product.currencyCode || "DOP";
  const onSale = typeof product.compareAtPrice === "number" && product.compareAtPrice > product.price;
  // compareAtPrice is the struck-through original, price is what's charged
  // today - so the list price is the higher of the two and the sale price
  // is only sent when there actually is a discount.
  const listPrice = onSale ? product.compareAtPrice! : product.price;

  const parts = [
    tag("g:id", product.id),
    tag("g:title", clamp(product.name, MAX_TITLE)),
    tag("g:description", clamp(product.description || product.name, MAX_DESCRIPTION)),
    tag("g:link", link),
    tag("g:image_link", primaryImage),
    ...images.slice(1, 11).map((image) => tag("g:additional_image_link", image.url)),
    tag("g:availability", product.available && (product.stock ?? 0) > 0 ? "in_stock" : "out_of_stock"),
    tag("g:price", formatAmount(listPrice, currency)),
    ...(onSale ? [tag("g:sale_price", formatAmount(product.price, currency))] : []),
    tag("g:condition", "new"),
    tag("g:brand", SITE_NAME),
    // The catalog has no barcodes or manufacturer part numbers; declaring
    // that explicitly is what keeps Google from rejecting entries for a
    // missing GTIN.
    tag("g:identifier_exists", "no"),
    tag("g:product_type", getCategoryLabel(product.category)),
    ...(product.colors?.[0]?.name ? [tag("g:color", product.colors[0].name)] : []),
    ...(product.sizes && product.sizes.length > 0 ? [tag("g:size", product.sizes[0])] : []),
    `<g:shipping><g:country>DO</g:country></g:shipping>`,
  ];

  return `<item>${parts.join("")}</item>`;
}

export const Route = createFileRoute("/feed.xml")({
  server: {
    handlers: {
      GET: async () => {
        const products = await listStorefrontCatalogProductsInternal();
        const items = products
          // Hidden products don't belong in a shopping feed, and a zero
          // price is an automatic Merchant disapproval - submitting either
          // only buys account warnings, so they're filtered rather than sent.
          .filter((product) => !product.hidden && product.price > 0)
          .map(renderItem)
          .join("");

        const body =
          `<?xml version="1.0" encoding="UTF-8"?>` +
          `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>` +
          tag("title", FEED_TITLE) +
          tag("link", absoluteSiteUrl("/")) +
          tag("description", SITE_DESCRIPTION) +
          items +
          `</channel></rss>`;

        return new Response(body, {
          headers: {
            // Short window on purpose: Merchant refetches on its own schedule,
            // and a restock or a new product should reach it on the next pull
            // rather than sitting behind a long cache.
            "Cache-Control": "public, max-age=300, s-maxage=300",
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});
