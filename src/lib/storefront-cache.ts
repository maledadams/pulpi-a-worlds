import { SITE_URL } from "@/lib/seo";

/**
 * Drops the edge-cached copies of the storefront pages after an admin change,
 * so a restock or a new product shows up immediately instead of waiting out
 * the 60-second cache window.
 *
 * Scope worth knowing: the Cache API deletes only in the data centre handling
 * this request, not worldwide. In practice that's the one serving the admin
 * doing the edit, so they see their own change straight away; visitors in
 * other regions still fall back to the 60-second expiry, which is the ceiling
 * on how stale anything can be. A true global purge would need a Cloudflare
 * API token stored as a secret - worth adding only if that ceiling ever
 * actually gets in the way.
 *
 * Never throws. A failed cache delete must not be able to turn a successful
 * product save into an error the admin sees.
 */

const ALWAYS_PURGE = [
  "/",
  "/tienda",
  "/moon",
  "/sunshine",
  "/men",
  "/feed.xml",
  "/sitemap.xml",
];

export async function purgeStorefrontCache(paths: string[] = []) {
  try {
    const cache = (caches as unknown as { default?: Cache }).default;
    if (!cache) return;

    const targets = new Set([...ALWAYS_PURGE, ...paths]);
    await Promise.all(
      [...targets].map((path) =>
        cache.delete(new Request(new URL(path, SITE_URL).toString())).catch(() => false),
      ),
    );
  } catch {
    // Cache API unavailable (local dev, tests) - nothing to purge.
  }
}

/** Convenience for writes that affect one product's own page too. */
export function productPaths(slug?: string | null) {
  return slug ? [`/producto/${slug}`] : [];
}
