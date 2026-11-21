// Theme engine server functions (spec 2026-11-16-pulpina-theme-engine-design).
// Admin functions check access and record who saved; the storefront reads only
// getActiveThemeSlice. Storage lives in themes-store.ts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { enforceAdminAccess, getAdminAccountEmail } from "@/lib/admin-access";
import { onceReady } from "@/lib/once-ready";
import { bannerPath } from "@/lib/theme-banner";
import {
  THEME_BUNDLE_FORMAT,
  THEME_BUNDLE_MAX_CHARS,
  base64ToBytes,
  bytesToBase64,
  discountForBundle,
  matchCategories,
  rewriteThemeRefs,
  themeBundleSchema,
  type ThemeBundle,
} from "@/lib/theme-bundle";
import { NO_THEME_DISCOUNTS, type ThemeDiscountControl } from "@/lib/theme-discounts";
import { buildThemeCss } from "@/lib/theme-css";
import { readImageInfo } from "@/lib/theme-image-info";
import { fromSantoDomingoInput, toSantoDomingoInput } from "@/lib/theme-schedule";
import {
  parseTheme,
  promoBannerSchema,
  type PromoBanner,
  sanitizePromoBannerDraft,
  type StickerArea,
  type Theme,
  type ThemeHomeBanner,
  type ThemeSticker,
} from "@/lib/theme-schema";
import {
  createThemeStore,
  ensureThemeTables,
  themeAssetIds,
  type ActiveTheme,
} from "@/lib/themes-store";

type WorkerEnv = { DB?: D1Database; R2_PUBLIC_BASE_URL?: string; PUBLIC_MEDIA?: R2Bucket };

async function getWorkerEnv() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return ((workerModule as { env?: WorkerEnv }).env ?? {}) as WorkerEnv;
  } catch {
    return {} as WorkerEnv;
  }
}

const ready = onceReady(ensureThemeTables);

async function getStore() {
  const db = (await getWorkerEnv()).DB;
  if (!db) throw new Error("La base de datos no está configurada.");
  return createThemeStore(db, { ready });
}

async function noStore() {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "private, no-store");
}

// The active theme only changes on an admin action or a schedule boundary, so it
// is cached per isolate for the current minute. Admin actions clear it here; other
// isolates catch up within 60 s (spec §4.4).
let activeCache: { minute: number; value: ActiveTheme | null } | null = null;
// Discounts are read from another copy of this module than the admin functions (TanStack
// splits server functions out), so an admin action can't clear this cache: it expires on
// its own after a few seconds instead, reading the store directly (spec §4.4 allows 60 s).
const DISCOUNT_CONTROL_TTL_MS = 10_000;
let discountControlCache: { expiresAt: number; value: ThemeDiscountControl } | null = null;
function invalidateActiveTheme() {
  activeCache = null;
  discountControlCache = null;
}

/**
 * Which discounts themes own and which the active theme turns on (spec §5.9). Used by
 * store-discounts.ts for both the prices shown and the prices charged. Never a preview.
 */
export async function getThemeDiscountControl(now = Date.now()): Promise<ThemeDiscountControl> {
  try {
    if (!(await getWorkerEnv()).DB) return NO_THEME_DISCOUNTS;
    if (discountControlCache && discountControlCache.expiresAt > now)
      return discountControlCache.value;
    const store = await getStore();
    const [linked, active] = await Promise.all([store.discountLinks(), store.resolveActive(now)]);
    const value: ThemeDiscountControl = {
      linked,
      activeIds: new Set(active?.theme.discountIds ?? []),
    };
    discountControlCache = { expiresAt: now + DISCOUNT_CONTROL_TTL_MS, value };
    return value;
  } catch (error) {
    console.error("[themes] discount control failed; discounts follow their own switches", error);
    return NO_THEME_DISCOUNTS;
  }
}

async function resolvePublicActive(now: number) {
  const minute = Math.floor(now / 60_000);
  if (activeCache?.minute === minute) return activeCache.value;
  const value = await (await getStore()).resolveActive(now);
  activeCache = { minute, value };
  return value;
}

// The storefront's other theme reads (image rows, whether the banner's link still exists)
// change only on admin edits, so they are kept for the current minute too (spec §4.4).
let minuteMemo = { minute: -1, values: new Map<string, Promise<unknown>>() };
function perMinute<T>(key: string, load: () => Promise<T>): Promise<T> {
  const minute = Math.floor(Date.now() / 60_000);
  if (minuteMemo.minute !== minute) minuteMemo = { minute, values: new Map() };
  const memo = minuteMemo;
  let value = memo.values.get(key) as Promise<T> | undefined;
  if (!value) {
    value = load();
    memo.values.set(key, value);
    value.catch(() => memo.values.delete(key));
  }
  return value;
}

export type ThemeAssetRef = {
  url: string;
  width: number;
  height: number;
  /** Smaller copies for srcset (widths below the full image). */
  variants: Array<{ url: string; width: number }>;
};

/** Local development serves theme images from the local R2 bucket (src/server.ts). */
export const LOCAL_THEME_MEDIA_PREFIX = "/__theme-media/";

function mediaUrl(baseUrl: string, key: string) {
  return import.meta.env.DEV ? `${LOCAL_THEME_MEDIA_PREFIX}${key}` : publicUrl(baseUrl, key);
}

function assetRef(
  baseUrl: string,
  row: {
    r2_key: string;
    width: number;
    height: number;
    variants: Array<{ key: string; width: number }>;
  },
): ThemeAssetRef {
  return {
    url: mediaUrl(baseUrl, row.r2_key),
    width: row.width,
    height: row.height,
    variants: row.variants.map((variant) => ({
      url: mediaUrl(baseUrl, variant.key),
      width: variant.width,
    })),
  };
}

/**
 * The published theme's link preview image URL, or null. Used by src/server.ts to swap
 * the default og:image in HTML responses (pages set their own, so the root can't).
 */
export async function getActiveShareImageUrl(): Promise<string | null> {
  try {
    const env = await getWorkerEnv();
    const baseUrl = env.R2_PUBLIC_BASE_URL?.trim();
    if (!env.DB || !baseUrl) return null;
    const assetId = (await resolvePublicActive(Date.now()))?.theme.shareImage;
    if (!assetId) return null;
    const [row] = await perMinute(`assets:${assetId}`, async () =>
      (await getStore()).assets([assetId]),
    );
    // Link previews are fetched by other sites: always the public URL, never the local dev one.
    return row ? publicUrl(baseUrl, row.r2_key) : null;
  } catch {
    return null;
  }
}

export type ThemeSliceBanner = ThemeHomeBanner & {
  /** Where it links (null: nowhere); /tienda when its collection or product is gone. */
  href: string | null;
};

export type ThemeSlice = {
  themeId: string;
  name: string;
  source: ActiveTheme["source"];
  css: string;
  slots: Theme["slots"];
  stickers: Partial<Record<StickerArea, ThemeSticker[]>>;
  heroEffect: Theme["heroEffect"];
  heroWave: Theme["heroWave"];
  /** Banners for Inicio and for Tienda (only the current page's are sent), each with its link. */
  homeBanners: ThemeSliceBanner[];
  /** Inicio: banners above "Elige tu Tienda" instead of in its place. */
  keepStorePicker: boolean;
  tiendaBanners: ThemeSliceBanner[];
  favicon: string | null;
  shareImage: string | null;
  assets: Record<string, ThemeAssetRef>;
};

function publicUrl(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/g, "")}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

const sliceInput = z.object({
  path: z.string().max(300),
  collectionVibe: z.string().max(20).nullish(),
  previewThemeId: z.string().max(80).nullish(),
  /** "Ver como el día…": a Santo Domingo "YYYY-MM-DDTHH:mm" (admins only). */
  previewAt: z.string().max(20).nullish(),
});

/** What the current page needs from the active theme; null when no theme applies (Sin tema). */
export const getActiveThemeSlice = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof sliceInput>) => sliceInput.parse(data))
  .handler(async ({ data }): Promise<ThemeSlice | null> => {
    try {
      const env = await getWorkerEnv();
      if (!env.DB) return null;
      let active: ActiveTheme | null;
      const previewAt = data.previewAt ? fromSantoDomingoInput(data.previewAt) : null;
      if (data.previewThemeId || previewAt) {
        // Drafts and other dates are for admins only; anyone else just gets the public theme.
        let isAdmin = false;
        try {
          await enforceAdminAccess();
          isAdmin = true;
        } catch {
          isAdmin = false;
        }
        const store = await getStore();
        active = !isAdmin
          ? await resolvePublicActive(Date.now())
          : data.previewThemeId
            ? await store.resolveActive(Date.now(), { previewThemeId: data.previewThemeId })
            : await store.resolveActive(Date.parse(previewAt!), { scheduleOnly: true });
        if (isAdmin) await noStore();
      } else {
        active = await resolvePublicActive(Date.now());
      }
      if (!active) return null;

      const { theme } = active;
      // Every page's stickers and banners, not just this page's: the root loader doesn't run
      // again on in-store navigation, so whatever the first page got had to serve every page
      // after it (Lucia, 2026-11-21: stickers missing until you left and came back). Each
      // page picks its own on screen (usePageStickers, useThemeBanners).
      const pageTheme: Theme = theme;
      const baseUrl = env.R2_PUBLIC_BASE_URL?.trim() ?? "";
      const ids = themeAssetIds(pageTheme);
      const rows =
        baseUrl || import.meta.env.DEV
          ? await perMinute(`assets:${ids.join(",")}`, async () => (await getStore()).assets(ids))
          : [];
      const withHref = (list: ThemeHomeBanner[]) =>
        Promise.all(
          list.map(async (banner) => ({
            ...banner,
            href: bannerPath(
              banner.link,
              banner.link.kind === "collection" || banner.link.kind === "product"
                ? await perMinute(`link:${JSON.stringify(banner.link)}`, async () =>
                    (await getStore()).linkTargetExists(banner.link),
                  )
                : true,
            ),
          })),
        );
      const [homeBanners, tiendaBanners] = await Promise.all([
        withHref(pageTheme.homeBanners),
        withHref(pageTheme.tiendaBanners),
      ]);
      const assets = Object.fromEntries(rows.map((row) => [row.id, assetRef(baseUrl, row)]));
      return {
        themeId: active.themeId,
        name: active.name,
        source: active.source,
        css: buildThemeCss(theme),
        slots: theme.slots,
        stickers: theme.stickers,
        heroEffect: theme.heroEffect,
        heroWave: theme.heroWave,
        homeBanners,
        keepStorePicker: theme.keepStorePicker,
        tiendaBanners,
        favicon: theme.favicon,
        shareImage: theme.shareImage,
        assets,
      };
    } catch (error) {
      // A theme can never break the page: on any failure the site renders Sin tema.
      console.error("[themes] active theme failed, rendering without a theme", error);
      return null;
    }
  });

export type PromoBannerSlide = {
  alt: string;
  href: string | null;
  desktop: ThemeAssetRef;
  phone: ThemeAssetRef;
  /** Which page shows it: Inicio, Tienda or both. */
  placement: PromoBanner["placement"];
};

/**
 * Banners of the promotions that are on right now (Lucia, 2026-11-20), for Inicio or
 * Tienda, whatever theme is active (or none). Only complete banners whose images exist;
 * on any failure, none, so a promotion can never break the page.
 */
export const getPromoBanners = createServerFn({ method: "GET" })
  .inputValidator((data: { path: string }) => z.object({ path: z.string().max(300) }).parse(data))
  .handler(async ({ data }): Promise<PromoBannerSlide[]> => {
    // Not this page's only: the root loader doesn't run again on in-store navigation, so the
    // first page's answer serves every page after it. useThemeBanners picks by placement.
    if (data.path.startsWith("/admin")) return [];
    try {
      const env = await getWorkerEnv();
      if (!env.DB) return [];
      const { listActiveDiscountsInternal } = await import("@/lib/store-discounts");
      const banners = (await listActiveDiscountsInternal()).flatMap((discount) => {
        const parsed = promoBannerSchema.safeParse(discount.banner);
        return parsed.success ? [parsed.data] : [];
      });
      if (!banners.length) return [];
      const baseUrl = env.R2_PUBLIC_BASE_URL?.trim() ?? "";
      const ids = banners.flatMap((banner) => [banner.desktopAsset, banner.mobileAsset]);
      const rows =
        baseUrl || import.meta.env.DEV
          ? await perMinute(`assets:${[...new Set(ids)].join(",")}`, async () =>
              (await getStore()).assets(ids),
            )
          : [];
      const refs = new Map(rows.map((row) => [row.id, assetRef(baseUrl, row)]));
      const slides: PromoBannerSlide[] = [];
      for (const banner of banners) {
        const desktop = refs.get(banner.desktopAsset);
        const phone = refs.get(banner.mobileAsset);
        if (!desktop || !phone) continue;
        const exists =
          banner.link.kind === "collection" || banner.link.kind === "product"
            ? await perMinute(`link:${JSON.stringify(banner.link)}`, async () =>
                (await getStore()).linkTargetExists(banner.link),
              )
            : true;
        slides.push({
          alt: banner.alt,
          href: bannerPath(banner.link, exists),
          desktop,
          phone,
          placement: banner.placement,
        });
      }
      return slides;
    } catch (error) {
      console.error("[themes] promotion banners failed, showing none", error);
      return [];
    }
  });

// ── Admin ──────────────────────────────────────────────────────────────────

async function admin() {
  const email = await getAdminAccountEmail();
  await noStore();
  return { email, store: await getStore() };
}

const idInput = z.object({ id: z.string().trim().min(1).max(80) });
const nameInput = z.string().trim().min(1, "Ponle un nombre al tema.").max(60);

export const listAdminThemes = createServerFn({ method: "GET" }).handler(async () => {
  const { store } = await admin();
  const [themes, schedule, override] = await Promise.all([
    store.list(),
    store.listSchedule(),
    store.getOverride(),
  ]);
  const names = new Map(themes.map((theme) => [theme.id, theme.name]));
  return {
    themes,
    override,
    schedule: schedule.map((entry) => ({
      ...entry,
      themeName: names.get(entry.themeId) ?? "Tema borrado",
      startsAtLocal: toSantoDomingoInput(entry.startsAt),
      endsAtLocal: toSantoDomingoInput(entry.endsAt),
    })),
  };
});

export const getAdminTheme = createServerFn({ method: "GET" })
  .inputValidator((data: z.input<typeof idInput>) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { store } = await admin();
    const theme = await store.get(data.id);
    if (!theme) throw new Error("El tema ya no existe.");
    return { ...theme, versions: await store.versions(data.id) };
  });

export const createAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string }) => z.object({ name: nameInput }).parse(data))
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    return store.create(data.name, email);
  });

export const duplicateAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; name: string }) =>
    idInput.extend({ name: nameInput }).parse(data),
  )
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    return store.duplicate(data.id, data.name, email);
  });

const versionedInput = idInput.extend({ baseVersion: z.number().int().min(1) });

export const saveAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; baseVersion: number; doc: unknown; label?: string }) =>
    versionedInput
      .extend({ doc: z.unknown(), label: z.string().trim().max(60).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    return store.save(data.id, data.doc, data.baseVersion, email, data.label);
  });

export const renameAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; baseVersion: number; name: string }) =>
    versionedInput.extend({ name: nameInput }).parse(data),
  )
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    const result = await store.rename(data.id, data.name, data.baseVersion, email);
    invalidateActiveTheme();
    return result;
  });

export const publishAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; baseVersion: number }) => versionedInput.parse(data))
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    const result = await store.publish(data.id, data.baseVersion, email);
    invalidateActiveTheme();
    return result;
  });

export const deleteAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { store } = await admin();
    await store.remove(data.id);
    invalidateActiveTheme();
    return { ok: true };
  });

export const restoreAdminThemeVersion = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; baseVersion: number; version: number }) =>
    versionedInput.extend({ version: z.number().int().min(1) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    return store.restore(data.id, data.version, data.baseVersion, email);
  });

/**
 * A theme file (src/lib/theme-bundle.ts): the theme's draft, the discounts it controls
 * (categories by name) and its images, so it can be imported on another site.
 */
export const exportAdminTheme = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { store } = await admin();
    const theme = await store.get(data.id);
    if (!theme) throw new Error("El tema ya no existe.");
    const parsed = parseTheme(theme.doc);
    if (!parsed) throw new Error("Este tema no se puede leer.");
    const { listCategoriesInternal, listDiscountsInternal } = await import("@/lib/admin-content");
    const [allDiscounts, categories] = await Promise.all([
      listDiscountsInternal(),
      listCategoriesInternal(),
    ]);
    const names = new Map(categories.map((category) => [category.id, category.label]));
    const discounts = allDiscounts
      .filter((discount) => parsed.discountIds.includes(discount.id))
      .map((discount) => discountForBundle(discount, (id) => names.get(id)));

    const bucket = (await getWorkerEnv()).PUBLIC_MEDIA;
    // The theme's images plus its promotions' banner images.
    const bannerIds = discounts.flatMap((discount) => {
      const banner = sanitizePromoBannerDraft(discount.banner);
      return [banner?.desktopAsset, banner?.mobileAsset].filter((id): id is string => Boolean(id));
    });
    const rows = bucket ? await store.assets([...themeAssetIds(parsed), ...bannerIds]) : [];
    const read = async (key: string) => {
      const object = await bucket!.get(key);
      return object ? bytesToBase64(new Uint8Array(await object.arrayBuffer())) : null;
    };
    const images: ThemeBundle["images"] = [];
    for (const row of rows) {
      const main = await read(row.r2_key);
      if (!main) continue;
      const variants: Array<{ data: string }> = [];
      for (const variant of row.variants) {
        const bytes = await read(variant.key);
        if (bytes) variants.push({ data: bytes });
      }
      images.push({ ref: row.id, kind: row.kind === "icon" ? "icon" : "image", data: main, variants });
    }
    const bundle: ThemeBundle = {
      format: THEME_BUNDLE_FORMAT,
      version: 2,
      exportedAt: new Date().toISOString(),
      theme: theme.doc as Record<string, unknown>,
      discounts,
      images,
    };
    return { json: JSON.stringify(bundle) };
  });

export type ThemeImportReport = {
  images: number;
  discounts: Array<{ label: string; created: boolean; missing: string[]; note?: string }>;
};

/**
 * Imports a theme file as a new draft: its images join the library, its discounts are
 * created switched off (the theme turns them on once it is published and active), and
 * categories are matched by name. A discount whose categories don't exist here is not
 * created: an empty category list would mean the whole store. Older files (just the
 * theme document) still import, without images or discounts.
 */
export const importAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { json: string }) =>
    z.object({ json: z.string().max(THEME_BUNDLE_MAX_CHARS, "El archivo es muy grande.") }).parse(data),
  )
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    let raw: unknown;
    try {
      raw = JSON.parse(data.json);
    } catch {
      throw new Error("Ese archivo no es un tema válido.");
    }
    if ((raw as { format?: unknown } | null)?.format !== THEME_BUNDLE_FORMAT) {
      const result = await store.importJson(data.json, email);
      return { ...result, report: null as ThemeImportReport | null };
    }
    const checked = themeBundleSchema.safeParse(raw);
    if (!checked.success)
      throw new Error(checked.error.issues[0]?.message ?? "Ese archivo de tema está dañado.");
    const bundle = checked.data;
    if (!parseTheme(bundle.theme)) throw new Error("Ese archivo no es un tema válido.");

    // Images first: nothing else is created if one of them is refused.
    const bucket = (await getWorkerEnv()).PUBLIC_MEDIA;
    if (bundle.images.length && !bucket)
      throw new Error("El almacenamiento de imágenes no está configurado.");
    const imageIds = new Map<string, string>();
    try {
      for (const image of bundle.images) {
        const file = (data: string) => new File([base64ToBytes(data)], "imagen");
        const main = await readUpload(file(image.data), "Una imagen del tema");
        const variants: Upload[] = [];
        for (const variant of image.variants)
          variants.push(await readUpload(file(variant.data), "Una copia pequeña"));
        const { id } = await storeThemeImage(store, bucket!, image.kind, main, variants);
        imageIds.set(image.ref, id);
      }
    } catch (error) {
      for (const id of imageIds.values()) {
        const keys = await store.removeAsset(id).catch(() => []);
        if (keys.length) await bucket!.delete(keys).catch(() => undefined);
      }
      throw error;
    }

    const { listCategoriesInternal, saveDiscountInternal } = await import("@/lib/admin-content");
    const categories = await listCategoriesInternal();
    const discountIds = new Map<string, string>();
    const report: ThemeImportReport = { images: imageIds.size, discounts: [] };
    for (const discount of bundle.discounts) {
      const { ids, missing } = matchCategories(discount.categories, categories);
      if (discount.categories.length && !ids.length) {
        report.discounts.push({
          label: discount.label,
          created: false,
          missing,
          note: "ninguna de sus categorías existe aquí",
        });
        continue;
      }
      // A promotion named like an existing one gets a number; a code that exists is kept as is.
      let saved: { id: string } | null = null;
      let note: string | undefined;
      for (let attempt = 1; attempt <= 5 && !saved; attempt++) {
        const label = attempt === 1 ? discount.label : `${discount.label} (${attempt})`;
        try {
          saved = await saveDiscountInternal({
            id: "",
            kind: discount.kind,
            code: discount.kind === "code" ? discount.code : "",
            label,
            type: discount.type,
            value: discount.value,
            active: false,
            scope: discount.scope,
            categoryIds: ids,
            maxRedemptions: discount.maxRedemptions,
            onePerCustomer: discount.onePerCustomer,
            webOnly: discount.webOnly,
            banner: (() => {
              const banner = sanitizePromoBannerDraft(discount.banner);
              const image = (id: string | null) => (id ? (imageIds.get(id) ?? null) : null);
              return banner
                ? {
                    ...banner,
                    desktopAsset: image(banner.desktopAsset),
                    mobileAsset: image(banner.mobileAsset),
                  }
                : null;
            })(),
          });
        } catch (error) {
          if (discount.kind === "code") {
            note = error instanceof Error ? error.message : "no se pudo crear";
            break;
          }
        }
      }
      if (saved) discountIds.set(discount.ref, saved.id);
      report.discounts.push({ label: discount.label, created: Boolean(saved), missing, note });
    }

    const result = await store.importDocument(
      rewriteThemeRefs(bundle.theme, imageIds, discountIds),
      email,
    );
    return { ...result, report: report as ThemeImportReport | null };
  });

const scheduleInput = z.object({
  id: z.string().trim().max(80).nullish(),
  themeId: z.string().trim().min(1).max(80),
  startsAtLocal: z.string().trim(),
  endsAtLocal: z.string().trim(),
  repeatYearly: z.boolean(),
});

export const saveAdminThemeSchedule = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof scheduleInput>) => scheduleInput.parse(data))
  .handler(async ({ data }) => {
    const { store } = await admin();
    const startsAt = fromSantoDomingoInput(data.startsAtLocal);
    const endsAt = fromSantoDomingoInput(data.endsAtLocal);
    if (!startsAt || !endsAt) throw new Error("Revisa las fechas: alguna no es válida.");
    const id = data.id || `prog_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    await store.saveScheduleEntry({
      id,
      themeId: data.themeId,
      startsAt,
      endsAt,
      repeatYearly: data.repeatYearly,
    });
    invalidateActiveTheme();
    return { id };
  });

/** A theme's color in the admin calendar (#rrggbb), or null for the automatic one. */
export const setAdminThemeCalendarColor = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; color: string | null }) =>
    z
      .object({
        id: z.string().trim().min(1).max(80),
        color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i, "Color inválido.")
          .nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { store } = await admin();
    await store.setCalendarColor(data.id, data.color);
    return { ok: true };
  });

export const deleteAdminThemeSchedule = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { store } = await admin();
    await store.removeScheduleEntry(data.id);
    invalidateActiveTheme();
    return { ok: true };
  });

export const activateAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { email, store } = await admin();
    await store.activate(data.id, email);
    invalidateActiveTheme();
    return { ok: true };
  });

export const deactivateAdminTheme = createServerFn({ method: "POST" }).handler(async () => {
  const { store } = await admin();
  await store.deactivate();
  invalidateActiveTheme();
  return { ok: true };
});

// ── Image library ──────────────────────────────────────────────────────────

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_VARIANTS = 6;

async function readUpload(entry: FormDataEntryValue | null, label: string) {
  if (!(entry instanceof File) || entry.size <= 0) throw new Error(`Falta ${label}.`);
  if (entry.size > MAX_UPLOAD_BYTES) throw new Error(`${label} pesa más de 4 MB.`);
  const bytes = new Uint8Array(await entry.arrayBuffer());
  const info = readImageInfo(bytes);
  if (!info) throw new Error(`${label}: solo se aceptan imágenes PNG o WebP.`);
  return { bytes, info };
}

/**
 * Stores one theme image (PNG/WebP, checked by its own header, never its name) plus the
 * smaller copies the browser made for srcset. kind "icon": the tab icon, a square PNG of
 * at least 512 px (spec §3).
 */
export const uploadAdminThemeAsset = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Formulario de imagen inválido.");
    return data;
  })
  .handler(async ({ data }) => {
    const { store } = await admin();
    const env = await getWorkerEnv();
    const bucket = env.PUBLIC_MEDIA;
    if (!bucket) throw new Error("El almacenamiento de imágenes no está configurado.");
    const kind = data.get("kind") === "icon" ? "icon" : "image";

    const main = await readUpload(data.get("file"), "La imagen");
    const variants: Upload[] = [];
    for (const entry of data.getAll("variant").slice(0, MAX_VARIANTS)) {
      variants.push(await readUpload(entry, "Una copia pequeña"));
    }
    const { id, mainKey, stored } = await storeThemeImage(store, bucket, kind, main, variants);
    const baseUrl = env.R2_PUBLIC_BASE_URL?.trim() ?? "";
    return {
      id,
      ...assetRef(baseUrl, {
        r2_key: mainKey,
        width: main.info.width,
        height: main.info.height,
        variants: stored,
      }),
    };
  });

type Upload = Awaited<ReturnType<typeof readUpload>>;

/**
 * Checks and stores one image and its smaller copies (R2 + library record). Shared by the
 * editor's upload and the theme-file import, so both follow the same rules.
 */
async function storeThemeImage(
  store: Awaited<ReturnType<typeof getStore>>,
  bucket: R2Bucket,
  kind: "image" | "icon",
  main: Upload,
  variants: Upload[],
) {
  if (kind === "icon") {
    if (main.info.type !== "image/png") throw new Error("El ícono tiene que ser PNG.");
    if (main.info.width !== main.info.height) throw new Error("El ícono tiene que ser cuadrado.");
    if (main.info.width < 512) throw new Error("El ícono tiene que medir al menos 512 × 512 px.");
  }
  for (const [index, variant] of variants.entries()) {
    if (variant.info.width >= main.info.width)
      throw new Error("Las copias pequeñas tienen que ser más angostas.");
    if (variants.slice(0, index).some((other) => other.info.width === variant.info.width))
      throw new Error("Dos copias pequeñas tienen el mismo ancho.");
  }
  const id = `img_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const extension = (type: string) => (type === "image/png" ? "png" : "webp");
  const mainKey = `themes/${id}/full.${extension(main.info.type)}`;
  const stored = variants.map((variant) => ({
    width: variant.info.width,
    height: variant.info.height,
    key: `themes/${id}/${variant.info.width}.${extension(variant.info.type)}`,
    variant,
  }));
  await Promise.all([
    bucket.put(mainKey, main.bytes, { httpMetadata: { contentType: main.info.type } }),
    ...stored.map((entry) =>
      bucket.put(entry.key, entry.variant.bytes, {
        httpMetadata: { contentType: entry.variant.info.type },
      }),
    ),
  ]);
  try {
    await store.insertAsset({
      id,
      r2Key: mainKey,
      kind,
      width: main.info.width,
      height: main.info.height,
      bytes: main.bytes.byteLength,
      variants: stored.map(({ width, height, key }) => ({ width, height, key })),
    });
  } catch (error) {
    // No record means nothing can ever reference these files: don't leave them behind.
    await bucket.delete([mainKey, ...stored.map((entry) => entry.key)]).catch(() => undefined);
    throw error;
  }
  return { id, mainKey, stored };
}

export const listAdminThemeAssets = createServerFn({ method: "GET" }).handler(async () => {
  const { store } = await admin();
  const baseUrl = (await getWorkerEnv()).R2_PUBLIC_BASE_URL?.trim() ?? "";
  return (await store.listAssets()).map((asset) => ({
    id: asset.id,
    kind: asset.kind,
    bytes: asset.bytes,
    createdAt: asset.createdAt,
    usedBy: asset.usedBy,
    ...assetRef(baseUrl, {
      r2_key: asset.r2Key,
      width: asset.width,
      height: asset.height,
      variants: asset.variants,
    }),
  }));
});

/** Deletes an image from the library; `force` deletes it even while themes use it. */
export const deleteAdminThemeAsset = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; force?: boolean }) =>
    z.object({ id: z.string().trim().min(1).max(80), force: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { store } = await admin();
    const keys = await store.removeAsset(data.id, { force: data.force });
    const bucket = (await getWorkerEnv()).PUBLIC_MEDIA;
    if (bucket) await bucket.delete(keys);
    return { ok: true };
  });

/** For /admin/descuentos: which discounts a published theme controls, and whether each is on right now. */
export const getAdminThemeDiscountLinks = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const control = await getThemeDiscountControl();
  return Object.fromEntries(
    [...control.linked.entries()].map(([id, themes]) => [
      id,
      { themes, on: control.activeIds.has(id) },
    ]),
  ) as Record<string, { themes: string[]; on: boolean }>;
});
