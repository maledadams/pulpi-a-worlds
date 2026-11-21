import { z } from "zod";
import type { AdminDiscountRecord } from "@/lib/admin-types";

// Theme files (Lucia, 2026-11-20): one .json that carries a whole theme to another site
// (local → the live store) with no deploy. It holds the theme, the discounts it controls
// and the images it uses. Importing creates everything new: new image ids, new discount
// ids (switched off until the theme is published and on), categories matched by name,
// because the live store's category ids are not the same as anywhere else.
// Older files (just the theme document) still import.

export const THEME_BUNDLE_FORMAT = "pulpina-theme";
/** Base64 grows ~4/3: 25 MB of file ≈ 18 MB of images. */
export const THEME_BUNDLE_MAX_CHARS = 25_000_000;

const base64 = z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, "Imagen dañada en el archivo.");

const bundleImageSchema = z.object({
  ref: z.string().min(1).max(64),
  kind: z.enum(["image", "icon"]),
  data: base64,
  variants: z.array(z.object({ data: base64 })).max(4).default([]),
});

const bundleDiscountSchema = z.object({
  ref: z.string().min(1).max(80),
  kind: z.enum(["code", "promotion"]),
  code: z.string().trim().max(40).default(""),
  label: z.string().trim().min(1).max(120),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().nonnegative().max(100_000),
  scope: z.enum(["store", "pulpina", "men", "moon", "sunshine"]).default("store"),
  /** By name: ids differ between sites. Empty = the whole store. */
  categories: z.array(z.string().trim().min(1).max(80)).max(60).default([]),
  maxRedemptions: z.number().int().positive().nullable().default(null),
  onePerCustomer: z.boolean().default(false),
  webOnly: z.boolean().default(false),
  /** The promotion's banner (images by their ref in `images`); checked again on import. */
  banner: z.unknown().optional(),
});

export const themeBundleSchema = z.object({
  format: z.literal(THEME_BUNDLE_FORMAT),
  version: z.literal(2),
  exportedAt: z.string().optional(),
  theme: z.record(z.string(), z.unknown()),
  discounts: z.array(bundleDiscountSchema).max(20).default([]),
  images: z.array(bundleImageSchema).max(60).default([]),
});

export type ThemeBundle = z.infer<typeof themeBundleSchema>;
export type BundleDiscount = z.infer<typeof bundleDiscountSchema>;

/** A discount as the file carries it: no id, no switch, categories by name. */
export function discountForBundle(
  discount: AdminDiscountRecord,
  categoryName: (id: string) => string | undefined,
): BundleDiscount {
  return {
    ref: discount.id,
    kind: discount.kind,
    code: discount.kind === "code" ? discount.code : "",
    label: discount.label,
    type: discount.type,
    value: discount.value,
    scope: discount.scope,
    categories: discount.categoryIds.map((id) => categoryName(id) ?? id),
    maxRedemptions: discount.maxRedemptions,
    onePerCustomer: discount.onePerCustomer,
    webOnly: Boolean(discount.webOnly),
    banner: discount.banner ?? null,
  };
}

/** Lowercase, no accents, no punctuation: "Lencería" and "lenceria" match. */
export function categoryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** The site's category ids for the names in the file, and the names it doesn't have. */
export function matchCategories(
  names: string[],
  categories: Array<{ id: string; label: string; slug?: string }>,
) {
  const byKey = new Map<string, string>();
  for (const category of categories) {
    for (const key of [category.id, category.slug, category.label]) {
      if (key) byKey.set(categoryKey(key), category.id);
    }
  }
  const ids: string[] = [];
  const missing: string[] = [];
  for (const name of names) {
    const id = byKey.get(categoryKey(name));
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else missing.push(name);
  }
  return { ids, missing };
}

/**
 * The theme document with every image id and discount id swapped for the new ones.
 * Image ids (img_ + hex) are unique strings, so a whole-value swap is exact; discount ids
 * only ever live in discountIds.
 */
export function rewriteThemeRefs(
  doc: Record<string, unknown>,
  images: Map<string, string>,
  discounts: Map<string, string>,
): Record<string, unknown> {
  const swap = (value: unknown): unknown => {
    if (typeof value === "string") return images.get(value) ?? value;
    if (Array.isArray(value)) return value.map(swap);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, swap(inner)]));
    return value;
  };
  const next = swap(doc) as Record<string, unknown>;
  const ids = Array.isArray(doc.discountIds) ? doc.discountIds : [];
  next.discountIds = ids
    .map((id) => (typeof id === "string" ? discounts.get(id) : undefined))
    .filter((id): id is string => Boolean(id));
  return next;
}

/** Bytes ↔ base64 without Buffer (Workers and browsers both have btoa/atob). */
export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at++) bytes[at] = binary.charCodeAt(at);
  return bytes;
}
