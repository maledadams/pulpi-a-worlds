import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import type {
  AdminAnnouncementRecord,
  AdminCategoryRecord,
  AdminCollectionRecord,
  AdminDiscountRecord,
  AdminSettingsRecord,
  AdminSizeFormatRecord,
} from "@/lib/admin-types";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  ADMIN_CATEGORIES,
  ADMIN_COLLECTIONS,
  ADMIN_DISCOUNTS,
  ADMIN_SETTINGS,
  toAdminProductRecord,
} from "@/lib/admin-service";
import type { AdminSizeFormat } from "@/lib/product-sizing";
import {
  cloneSizeFormat,
  getCategorySizeFormat,
  getDefaultSizeFormats,
  normalizeSizeList,
} from "@/lib/product-sizing";
import {
  listCatalogProductsInternal,
  listStorefrontCatalogProductsInternal,
  saveCatalogProductInternal,
} from "@/lib/catalog";

type WorkerEnv = {
  DB?: D1Database;
  PUBLIC_MEDIA?: R2Bucket;
  R2_PUBLIC_BASE_URL?: string;
};

type CategoryRow = {
  id: string;
  slug: string;
  name_es: string;
  is_nsfw: number;
  department_scope: string | null;
  size_format: string | null;
  sort_order: number | null;
};

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  department_scope: string | null;
  is_published: number | null;
  featured: number;
  show_on_home: number | null;
  home_order: number | null;
  category_ids_json: string | null;
  product_ids_json: string | null;
};

type DiscountRow = {
  id: string;
  code: string;
  label: string;
  discount_type: string;
  amount: number;
  active: number;
  scope: string;
};

type SizeFormatRow = {
  id: string;
  label: string;
  sizes_json: string | null;
  sort_order: number | null;
};

const categorySchema = z.object({
  id: z.string().trim().min(1),
  previousId: z.string().trim().min(1).optional(),
  label: z.string().trim().min(1),
  isNsfw: z.boolean(),
  vibes: z.array(z.enum(["pulpina", "men", "moon", "sunshine"])).min(1),
  sizeFormat: z.enum(["standard", "shoes", "onesize"]),
  productCount: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

const sizeFormatSchema = z.object({
  id: z.enum(["standard", "shoes", "onesize"]),
  label: z.string().trim().min(1),
  sizes: z.array(z.string().trim().min(1)).min(1),
  sortOrder: z.number().int().nonnegative(),
});

const collectionSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim(),
  vibe: z.enum(["store", "pulpina", "men", "moon", "sunshine"]),
  published: z.boolean(),
  featured: z.boolean(),
  showOnHome: z.boolean(),
  homeOrder: z.number().int().nonnegative(),
  categoryIds: z.array(z.string().trim().min(1)),
  productIds: z.array(z.string().trim().min(1)),
});

const discountSchema = z.object({
  id: z.string().trim().min(1),
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().nonnegative(),
  active: z.boolean(),
  scope: z.enum(["store", "pulpina", "men", "moon", "sunshine"]),
});

const announcementSchema = z.object({
  id: z.string().trim().min(1),
  text: z.string().trim(),
  active: z.boolean(),
});

const footerLinkSchema = z.object({
  label: z.string().trim().min(1),
  to: z.string().trim().min(1),
});

const contactFaqSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

const legalSectionSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});

const settingsSchema = z.object({
  businessName: z.string().trim().min(1),
  supportEmail: z.string().trim().email(),
  whatsappNumber: z.string().trim().min(3),
  whatsappLabel: z.string().trim().min(3),
  instagramHandle: z.string().trim().min(1),
  instagramUrl: z.string().trim().url(),
  contactResponseNote: z.string().trim().min(1),
  adultAudienceNotice: z.string().trim().min(1),
  contactPageTitle: z.string().trim().min(1),
  contactPageIntro: z.string().trim().min(1),
  contactCardNote: z.string().trim().min(1),
  contactFaqs: z.array(contactFaqSchema),
  homeSelectionTitle: z.string().trim().min(1),
  homeSelectionSubtitle: z.string().trim().min(1),
  homeGeneralStoreCtaLabel: z.string().trim().min(1),
  newsletterTitle: z.string().trim().min(1),
  newsletterDescription: z.string().trim().min(1),
  aboutPageTitle: z.string().trim().min(1),
  aboutPageIntro: z.string().trim().min(1),
  aboutStoryTitle: z.string().trim().min(1),
  aboutStoryBody: z.string().trim().min(1),
  aboutCtaLabel: z.string().trim().min(1),
  moonPageTagline: z.string().trim().min(1),
  moonPageIntro: z.string().trim().min(1),
  sunshinePageTagline: z.string().trim().min(1),
  sunshinePageIntro: z.string().trim().min(1),
  menPageTagline: z.string().trim().min(1),
  menPageIntro: z.string().trim().min(1),
  vibeCatalogHeading: z.string().trim().min(1),
  productDetailsTitle: z.string().trim().min(1),
  productDetailsBody: z.string().trim().min(1),
  productCareTitle: z.string().trim().min(1),
  productCareBody: z.string().trim().min(1),
  productShippingTitle: z.string().trim().min(1),
  productShippingBody: z.string().trim().min(1),
  footerHeading: z.string().trim().min(1),
  footerAccent: z.string().trim().min(1),
  footerCopyright: z.string().trim().min(1),
  footerShopLinks: z.array(footerLinkSchema),
  footerHelpLinks: z.array(footerLinkSchema),
  legalPageTitle: z.string().trim().min(1),
  legalLastUpdated: z.string().trim().min(1),
  legalOperatorName: z.string().trim().min(1),
  legalOperatorEmail: z.string().trim().email(),
  legalOperatorPhone: z.string().trim().min(3),
  legalOperatorAddress: z.string().trim().min(3),
  legalTaxId: z.string().trim().min(1),
  legalIntro: z.string().trim().min(1),
  legalSections: z.array(legalSectionSchema),
  adminAllowedEmails: z.array(z.string().trim().email()),
  announcements: z.array(announcementSchema),
});

const deleteByIdSchema = z.object({
  id: z.string().trim().min(1),
});

const deleteCategorySchema = z.object({
  id: z.string().trim().min(1),
  replacementCategoryId: z.string().trim().min(1).optional(),
});

const SETTINGS_KEY = "admin_settings";
const LOCAL_VIBES = new Set(["moon", "sunshine", "men"]);
const memoryCategories = new Map<string, AdminCategoryRecord>();
const memoryCollections = new Map<string, AdminCollectionRecord>();
const memoryDiscounts = new Map<string, AdminDiscountRecord>();
const memorySizeFormats = new Map<AdminSizeFormat, AdminSizeFormatRecord>();
let memorySettings: AdminSettingsRecord = cloneSettings(ADMIN_SETTINGS);
let adminContentReadyPromise: Promise<void> | null = null;
let memoryContentSeeded = false;

function parseCsv(raw: string | null | undefined) {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCategoryId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeCollectionId(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeDiscountId(value: string, code: string) {
  const trimmed = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (trimmed && !trimmed.startsWith("draft-discount-")) {
    return trimmed;
  }

  const normalizedCode = code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (normalizedCode) {
    return `discount-${normalizedCode}`;
  }

  return `discount-${Date.now()}`;
}

function cloneCategory(category: AdminCategoryRecord): AdminCategoryRecord {
  return {
    ...category,
    vibes: [...category.vibes],
  };
}

function cloneCollection(collection: AdminCollectionRecord): AdminCollectionRecord {
  return {
    ...collection,
    categoryIds: [...collection.categoryIds],
    productIds: [...collection.productIds],
  };
}

function mergeCollectionProductIds(
  collection: AdminCollectionRecord,
  products: Awaited<ReturnType<typeof listCatalogProductsInternal>>,
) {
  const scopedProducts =
    collection.vibe === "store"
      ? products
      : products.filter((product) => product.vibe === collection.vibe);
  const explicitIds = collection.productIds.filter((productId) =>
    scopedProducts.some((product) => product.id === productId),
  );
  const categoryIds = new Set(collection.categoryIds);
  const categoryMatches = scopedProducts
    .filter((product) =>
      categoryIds.size > 0 &&
      (product.categories?.length ? product.categories : [product.category]).some((category) =>
        categoryIds.has(category),
      ),
    )
    .map((product) => product.id);

  return Array.from(new Set([...explicitIds, ...categoryMatches]));
}

function cloneDiscount(discount: AdminDiscountRecord): AdminDiscountRecord {
  return {
    ...discount,
  };
}

function cloneSettings(settings: AdminSettingsRecord): AdminSettingsRecord {
  return {
    ...settings,
    contactFaqs: settings.contactFaqs.map((faq) => ({ ...faq })),
    footerShopLinks: settings.footerShopLinks.map((link) => ({ ...link })),
    footerHelpLinks: settings.footerHelpLinks.map((link) => ({ ...link })),
    legalSections: settings.legalSections.map((section) => ({ ...section })),
    adminAllowedEmails: [...settings.adminAllowedEmails],
    announcements: settings.announcements.map((announcement) => ({ ...announcement })),
  };
}

function coerceSettingsRecord(raw: unknown) {
  const fallback = cloneSettings(ADMIN_SETTINGS);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as Partial<AdminSettingsRecord>;
  return settingsSchema.parse({
    ...fallback,
    ...candidate,
    contactFaqs: Array.isArray(candidate.contactFaqs) ? candidate.contactFaqs : fallback.contactFaqs,
    footerShopLinks: Array.isArray(candidate.footerShopLinks) ? candidate.footerShopLinks : fallback.footerShopLinks,
    footerHelpLinks: Array.isArray(candidate.footerHelpLinks) ? candidate.footerHelpLinks : fallback.footerHelpLinks,
    legalSections: Array.isArray(candidate.legalSections) ? candidate.legalSections : fallback.legalSections,
    adminAllowedEmails: Array.isArray(candidate.adminAllowedEmails)
      ? candidate.adminAllowedEmails
      : fallback.adminAllowedEmails,
    announcements: Array.isArray(candidate.announcements)
      ? candidate.announcements
      : fallback.announcements,
  });
}

function normalizeAnnouncementId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `announcement-${Date.now()}`;
}

function seedMemoryContent() {
  if (memoryContentSeeded) return;
  for (const format of getDefaultSizeFormats()) {
    memorySizeFormats.set(format.id, cloneSizeFormat(format));
  }
  for (const category of ADMIN_CATEGORIES) {
    memoryCategories.set(category.id, cloneCategory(category));
  }
  for (const collection of ADMIN_COLLECTIONS) {
    memoryCollections.set(collection.id, cloneCollection(collection));
  }
  for (const discount of ADMIN_DISCOUNTS) {
    memoryDiscounts.set(discount.id, cloneDiscount(discount));
  }
  memorySettings = cloneSettings(ADMIN_SETTINGS);
  memoryContentSeeded = true;
}

async function getWorkerEnv() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return ((workerModule as { env?: WorkerEnv }).env ?? {}) as WorkerEnv;
  } catch {
    return {} as WorkerEnv;
  }
}

async function getDatabase() {
  const workerEnv = await getWorkerEnv();
  return workerEnv.DB ?? null;
}

async function ensureAdminContentReady(db: D1Database) {
  if (!adminContentReadyPromise) {
    adminContentReadyPromise = (async () => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name_es TEXT NOT NULL,
          is_nsfw INTEGER NOT NULL DEFAULT 0,
          department_scope TEXT,
          size_format TEXT NOT NULL DEFAULT 'standard',
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS collections (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          department_scope TEXT,
          is_published INTEGER NOT NULL DEFAULT 1,
          featured INTEGER NOT NULL DEFAULT 0,
          show_on_home INTEGER NOT NULL DEFAULT 0,
          home_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discounts (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          discount_type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          scope TEXT NOT NULL DEFAULT 'store',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS size_formats (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          sizes_json TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const migrations = [
        "ALTER TABLE categories ADD COLUMN size_format TEXT NOT NULL DEFAULT 'standard';",
        "ALTER TABLE collections ADD COLUMN category_ids_json TEXT NOT NULL DEFAULT '[]';",
        "ALTER TABLE collections ADD COLUMN product_ids_json TEXT NOT NULL DEFAULT '[]';",
        "ALTER TABLE collections ADD COLUMN is_published INTEGER NOT NULL DEFAULT 1;",
        "ALTER TABLE collections ADD COLUMN show_on_home INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE collections ADD COLUMN home_order INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE size_formats ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;",
      ];

      for (const statement of migrations) {
        try {
          await db.exec(statement);
        } catch {
          // Existing schema already migrated.
        }
      }

      const categoryCount = await db.prepare("SELECT COUNT(*) AS count FROM categories").first<{ count: number }>();
      if ((categoryCount?.count ?? 0) === 0) {
        const insertCategory = db.prepare(`
          INSERT INTO categories (id, slug, name_es, is_nsfw, department_scope, size_format, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        await db.batch(
          ADMIN_CATEGORIES.map((category, index) =>
            insertCategory.bind(
              category.id,
              category.id,
              category.label,
              category.isNsfw ? 1 : 0,
              category.vibes.join(","),
              category.sizeFormat,
              index,
            ),
          ),
        );
      }

      const sizeFormatCount = await db.prepare("SELECT COUNT(*) AS count FROM size_formats").first<{ count: number }>();
      if ((sizeFormatCount?.count ?? 0) === 0) {
        const insertSizeFormat = db.prepare(`
          INSERT INTO size_formats (id, label, sizes_json, sort_order)
          VALUES (?, ?, ?, ?)
        `);
        await db.batch(
          getDefaultSizeFormats().map((format) =>
            insertSizeFormat.bind(format.id, format.label, JSON.stringify(format.sizes), format.sortOrder),
          ),
        );
      }

      const collectionCount = await db.prepare("SELECT COUNT(*) AS count FROM collections").first<{ count: number }>();
      if ((collectionCount?.count ?? 0) === 0) {
        const insertCollection = db.prepare(`
          INSERT INTO collections (
            id,
            slug,
            name,
            description,
            department_scope,
            is_published,
            featured,
            show_on_home,
            home_order,
            category_ids_json,
            product_ids_json
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        await db.batch(
          ADMIN_COLLECTIONS.map((collection) =>
            insertCollection.bind(
              collection.id,
              collection.slug,
              collection.name,
              collection.description,
              collection.vibe,
              collection.published ? 1 : 0,
              collection.featured ? 1 : 0,
              collection.showOnHome ? 1 : 0,
              collection.homeOrder,
              JSON.stringify(collection.categoryIds),
              JSON.stringify(collection.productIds),
            ),
          ),
        );
      }

      await db
        .prepare(`
          INSERT INTO app_settings (key, value_json)
          VALUES (?, ?)
          ON CONFLICT(key) DO NOTHING
        `)
        .bind(SETTINGS_KEY, JSON.stringify(ADMIN_SETTINGS))
        .run();

      const discountCount = await db.prepare("SELECT COUNT(*) AS count FROM discounts").first<{ count: number }>();
      if ((discountCount?.count ?? 0) === 0) {
        const insertDiscount = db.prepare(`
          INSERT INTO discounts (id, code, label, discount_type, amount, active, scope)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        await db.batch(
          ADMIN_DISCOUNTS.map((discount) =>
            insertDiscount.bind(
              discount.id,
              discount.code,
              discount.label,
              discount.type,
              discount.value,
              discount.active ? 1 : 0,
              discount.scope,
            ),
          ),
        );
      }
    })().catch((error) => {
      adminContentReadyPromise = null;
      throw error;
    });
  }

  return adminContentReadyPromise;
}

function withCategoryStats(
  categories: AdminCategoryRecord[],
  products: Awaited<ReturnType<typeof listCatalogProductsInternal>>,
) {
  return categories.map((category) => {
    const matching = products.filter((product) =>
      (product.categories?.length ? product.categories : [product.category]).includes(category.id),
    );
    const fallbackVibes = Array.from(
      new Set(
        matching
          .map((product) => product.vibe)
          .filter((vibe): vibe is AdminCategoryRecord["vibes"][number] => vibe !== "pulpina"),
      ),
    );
    return {
      ...category,
      productCount: matching.length,
      vibes: category.vibes.length > 0 ? category.vibes : fallbackVibes,
    } satisfies AdminCategoryRecord;
  });
}

function parseCategoryRow(row: CategoryRow): AdminCategoryRecord {
  const vibes = Array.from(
    new Set(
      parseCsv(row.department_scope).filter(
        (entry): entry is AdminCategoryRecord["vibes"][number] => LOCAL_VIBES.has(entry),
      ),
    ),
  );
  const sizeFormat = (row.size_format?.trim() || getCategorySizeFormat(row.id)) as AdminSizeFormat;

  return {
    id: row.id,
    label: row.name_es,
    isNsfw: row.is_nsfw === 1,
    vibes: vibes.length > 0 ? vibes : ["moon"],
    sizeFormat: sizeFormat === "shoes" || sizeFormat === "onesize" ? sizeFormat : "standard",
    productCount: 0,
    sortOrder: row.sort_order ?? 0,
  };
}

function parseCollectionRow(row: CollectionRow): AdminCollectionRecord {
  const rawCategoryIds = row.category_ids_json ? JSON.parse(row.category_ids_json) : [];
  const rawProductIds = row.product_ids_json ? JSON.parse(row.product_ids_json) : [];
  const vibe = row.department_scope?.trim() === "pulpina" ? "store" : row.department_scope?.trim() || "store";

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    vibe: (vibe === "store" ? "store" : vibe) as AdminCollectionRecord["vibe"],
    published: row.is_published !== 0,
    featured: row.featured === 1,
    showOnHome: row.show_on_home === 1,
    homeOrder: row.home_order ?? 0,
    categoryIds: Array.isArray(rawCategoryIds) ? rawCategoryIds.filter((entry): entry is string => typeof entry === "string") : [],
    productIds: Array.isArray(rawProductIds) ? rawProductIds.filter((entry): entry is string => typeof entry === "string") : [],
  };
}

function parseDiscountRow(row: DiscountRow): AdminDiscountRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    type: row.discount_type === "fixed" ? "fixed" : "percentage",
    value: row.amount,
    active: row.active === 1,
    scope: ((row.scope?.trim() === "pulpina" ? "store" : row.scope?.trim()) || "store") as AdminDiscountRecord["scope"],
  };
}

function parseSizeFormatRow(row: SizeFormatRow): AdminSizeFormatRecord {
  let parsedSizes: string[] = [];
  try {
    const raw = row.sizes_json ? JSON.parse(row.sizes_json) : [];
    parsedSizes = Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    parsedSizes = [];
  }

  const fallback = getDefaultSizeFormats().find((format) => format.id === row.id);

  return {
    id: (row.id === "shoes" || row.id === "onesize" ? row.id : "standard") as AdminSizeFormat,
    label: row.label?.trim() || fallback?.label || row.id,
    sizes: normalizeSizeList(parsedSizes.length > 0 ? parsedSizes : fallback?.sizes ?? ["Unica"]),
    sortOrder: row.sort_order ?? fallback?.sortOrder ?? 0,
  };
}

async function listSizeFormatsInternal() {
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    return Array.from(memorySizeFormats.values())
      .map(cloneSizeFormat)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  }

  await ensureAdminContentReady(db);
  const rows = await db
    .prepare(`
      SELECT id, label, sizes_json, sort_order
      FROM size_formats
      ORDER BY sort_order ASC, id ASC
    `)
    .all<SizeFormatRow>();

  return (rows.results ?? []).map(parseSizeFormatRow);
}

async function saveSizeFormatInternal(input: AdminSizeFormatRecord) {
  const normalized = sizeFormatSchema.parse({
    ...input,
    label: input.label.trim(),
    sizes: normalizeSizeList(input.sizes),
  });

  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memorySizeFormats.set(normalized.id, cloneSizeFormat(normalized));
    return cloneSizeFormat(normalized);
  }

  await ensureAdminContentReady(db);
  await db
    .prepare(`
      INSERT INTO size_formats (id, label, sizes_json, sort_order, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        sizes_json = excluded.sizes_json,
        sort_order = excluded.sort_order,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(normalized.id, normalized.label, JSON.stringify(normalized.sizes), normalized.sortOrder)
    .run();

  return cloneSizeFormat(normalized);
}

async function listCategoriesInternal() {
  const products = await listCatalogProductsInternal();
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    return withCategoryStats(Array.from(memoryCategories.values()).map(cloneCategory), products);
  }

  await ensureAdminContentReady(db);
  const rows = await db
    .prepare(`
      SELECT id, slug, name_es, is_nsfw, department_scope, sort_order
      , size_format
      FROM categories
      ORDER BY sort_order ASC, name_es ASC
    `)
    .all<CategoryRow>();

  return withCategoryStats((rows.results ?? []).map(parseCategoryRow), products);
}

async function reassignCategoryReferences(previousId: string, nextId: string) {
  const normalizedPreviousId = normalizeCategoryId(previousId);
  const normalizedNextId = normalizeCategoryId(nextId);
  if (normalizedPreviousId === normalizedNextId) {
    return;
  }

  const [products, collections] = await Promise.all([
    listCatalogProductsInternal(),
    listCollectionsInternal(),
  ]);

  await Promise.all(
    products
      .filter((product) =>
        (product.categories?.length ? product.categories : [product.category]).includes(normalizedPreviousId),
      )
      .map((product) => {
        const currentCategories = product.categories?.length ? product.categories : [product.category];
        const nextCategories = Array.from(
          new Set(currentCategories.map((category) => (category === normalizedPreviousId ? normalizedNextId : category))),
        );

        return saveCatalogProductInternal(
          toAdminProductRecord({
            ...product,
            category: product.category === normalizedPreviousId ? normalizedNextId : product.category,
            categories: nextCategories,
          }),
        );
      }),
  );

  await Promise.all(
    collections
      .filter((collection) => collection.categoryIds.includes(normalizedPreviousId))
      .map((collection) =>
        saveCollectionInternal({
          ...collection,
          categoryIds: Array.from(
            new Set(
              collection.categoryIds.map((categoryId) =>
                categoryId === normalizedPreviousId ? normalizedNextId : categoryId,
              ),
            ),
          ),
        }),
      ),
  );
}

async function saveCategoryInternal(input: AdminCategoryRecord) {
  const normalizedVibes = Array.from(new Set(input.vibes.filter((vibe) => vibe !== "pulpina")));
  const normalized = {
    ...input,
    id: normalizeCategoryId(input.id),
    previousId: input.previousId ? normalizeCategoryId(input.previousId) : undefined,
    label: input.label.trim(),
    vibes: normalizedVibes.length > 0 ? normalizedVibes : ["moon"],
    sizeFormat: input.sizeFormat,
    sortOrder: Math.max(0, input.sortOrder),
  } satisfies AdminCategoryRecord;

  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    if (normalized.previousId && normalized.previousId !== normalized.id) {
      const existing = memoryCategories.get(normalized.previousId);
      if (existing) {
        memoryCategories.delete(normalized.previousId);
        await reassignCategoryReferences(normalized.previousId, normalized.id);
      }
    }
    memoryCategories.set(normalized.id, cloneCategory(normalized));
    const products = await listCatalogProductsInternal();
    return withCategoryStats([cloneCategory(normalized)], products)[0]!;
  }

  await ensureAdminContentReady(db);
  const currentId = normalized.previousId ?? normalized.id;
  const existing = await db.prepare("SELECT id FROM categories WHERE id = ? LIMIT 1").bind(currentId).first();
  const conflicting = normalized.previousId && normalized.previousId !== normalized.id
    ? await db.prepare("SELECT id FROM categories WHERE id = ? LIMIT 1").bind(normalized.id).first()
    : null;
  if (conflicting) {
    throw new Error("Ya existe otra categoria con ese slug interno.");
  }
  const count = await db.prepare("SELECT COUNT(*) AS count FROM categories").first<{ count: number }>();
  const sortOrder = existing ? undefined : count?.count ?? 0;

  if (normalized.previousId && normalized.previousId !== normalized.id) {
    await reassignCategoryReferences(normalized.previousId, normalized.id);
    await db.prepare("DELETE FROM categories WHERE id = ?").bind(normalized.previousId).run();
  }

  await db
    .prepare(`
      INSERT INTO categories (id, slug, name_es, is_nsfw, department_scope, size_format, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, 0))
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name_es = excluded.name_es,
        is_nsfw = excluded.is_nsfw,
        department_scope = excluded.department_scope,
        size_format = excluded.size_format,
        sort_order = excluded.sort_order
    `)
    .bind(
      normalized.id,
      normalized.id,
      normalized.label,
      normalized.isNsfw ? 1 : 0,
      normalized.vibes.join(","),
      normalized.sizeFormat,
      normalized.sortOrder ?? sortOrder ?? null,
    )
    .run();

  const products = await listCatalogProductsInternal();
  return withCategoryStats([cloneCategory(normalized)], products)[0]!;
}

async function deleteCategoryInternal(id: string, replacementCategoryId?: string) {
  const normalizedId = normalizeCategoryId(id);
  const normalizedReplacementId = replacementCategoryId ? normalizeCategoryId(replacementCategoryId) : null;
  const products = await listCatalogProductsInternal();
  const collections = await listCollectionsInternal();
  const linkedProduct = products.find((product) =>
    (product.categories?.length ? product.categories : [product.category]).includes(normalizedId),
  );
  const linkedCollection = collections.find((collection) => collection.categoryIds.includes(normalizedId));
  if ((linkedProduct || linkedCollection) && !normalizedReplacementId) {
    throw new Error("Esta categoria sigue en uso. Elige una categoria de reemplazo antes de eliminarla.");
  }

  if (normalizedReplacementId && normalizedReplacementId === normalizedId) {
    throw new Error("La categoria de reemplazo debe ser distinta.");
  }

  if (normalizedReplacementId) {
    const categories = await listCategoriesInternal();
    if (!categories.some((category) => category.id === normalizedReplacementId)) {
      throw new Error("La categoria de reemplazo no existe.");
    }
    await reassignCategoryReferences(normalizedId, normalizedReplacementId);
  }

  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memoryCategories.delete(normalizedId);
    return { success: true };
  }

  await ensureAdminContentReady(db);
  await db.prepare("DELETE FROM categories WHERE id = ?").bind(normalizedId).run();
  return { success: true };
}

async function listCollectionsInternal() {
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    return Array.from(memoryCollections.values()).map(cloneCollection);
  }

  await ensureAdminContentReady(db);
  const rows = await db
    .prepare(`
      SELECT id, slug, name, description, department_scope, featured, show_on_home, home_order, category_ids_json, product_ids_json
      , is_published
      FROM collections
      ORDER BY show_on_home DESC, home_order ASC, name ASC
    `)
    .all<CollectionRow>();

  return (rows.results ?? []).map(parseCollectionRow);
}

async function saveCollectionInternal(input: AdminCollectionRecord) {
  const normalized = {
    ...input,
    id: normalizeCollectionId(input.id),
    slug: input.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    name: input.name.trim(),
    description: input.description.trim(),
    vibe: input.vibe === "pulpina" ? "store" : input.vibe,
    homeOrder: Math.max(0, input.homeOrder),
    categoryIds: Array.from(new Set(input.categoryIds.map(normalizeCategoryId))),
    productIds: Array.from(new Set(input.productIds.map((entry) => entry.trim()).filter(Boolean))),
  } satisfies AdminCollectionRecord;

  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memoryCollections.set(normalized.id, cloneCollection(normalized));
    return cloneCollection(normalized);
  }

  await ensureAdminContentReady(db);
  await db
    .prepare(`
      INSERT INTO collections (
        id,
        slug,
        name,
        description,
        department_scope,
        is_published,
        featured,
        show_on_home,
        home_order,
        category_ids_json,
        product_ids_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        department_scope = excluded.department_scope,
        is_published = excluded.is_published,
        featured = excluded.featured,
        show_on_home = excluded.show_on_home,
        home_order = excluded.home_order,
        category_ids_json = excluded.category_ids_json,
        product_ids_json = excluded.product_ids_json
    `)
    .bind(
      normalized.id,
      normalized.slug,
      normalized.name,
      normalized.description,
      normalized.vibe,
      normalized.published ? 1 : 0,
      normalized.featured ? 1 : 0,
      normalized.showOnHome ? 1 : 0,
      normalized.homeOrder,
      JSON.stringify(normalized.categoryIds),
      JSON.stringify(normalized.productIds),
    )
    .run();

  return cloneCollection(normalized);
}

async function deleteCollectionInternal(id: string) {
  const normalizedId = normalizeCollectionId(id);
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memoryCollections.delete(normalizedId);
    return { success: true };
  }

  await ensureAdminContentReady(db);
  await db.prepare("DELETE FROM collections WHERE id = ?").bind(normalizedId).run();
  return { success: true };
}

async function listHomeCollectionsInternal() {
  const [collections, products] = await Promise.all([
    listCollectionsInternal(),
    listStorefrontCatalogProductsInternal(),
  ]);

  return collections
    .filter((collection) => collection.published && collection.showOnHome)
    .map((collection) => ({
      ...collection,
      productIds: mergeCollectionProductIds(collection, products.filter((product) => !product.hidden)),
    }))
    .sort((a, b) => a.homeOrder - b.homeOrder || a.name.localeCompare(b.name));
}

async function listPublicCollectionsInternal() {
  const [collections, products] = await Promise.all([
    listCollectionsInternal(),
    listStorefrontCatalogProductsInternal(),
  ]);
  const visibleProducts = products.filter((product) => !product.hidden);

  return collections
    .filter((collection) => collection.published)
    .map((collection) => ({
      ...collection,
      productIds: mergeCollectionProductIds(collection, visibleProducts),
    }))
    .filter((collection) => collection.productIds.length > 0);
}

async function getStorefrontCollectionBySlugInternal(slug: string) {
  const collections = await listPublicCollectionsInternal();
  return collections.find((collection) => collection.slug === slug.trim().toLowerCase()) ?? null;
}

async function listDiscountsInternal() {
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    return Array.from(memoryDiscounts.values())
      .map(cloneDiscount)
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  await ensureAdminContentReady(db);
  const rows = await db
    .prepare(`
      SELECT id, code, label, discount_type, amount, active, scope
      FROM discounts
      ORDER BY active DESC, code ASC
    `)
    .all<DiscountRow>();

  return (rows.results ?? []).map(parseDiscountRow);
}

async function saveDiscountInternal(input: AdminDiscountRecord) {
  const normalized = {
    ...input,
    id: normalizeDiscountId(input.id, input.code),
    code: input.code.trim().toUpperCase(),
    label: input.label.trim(),
    value: Math.round(input.value),
    scope: input.scope === "pulpina" ? "store" : input.scope,
  } satisfies AdminDiscountRecord;

  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memoryDiscounts.delete(input.id);
    memoryDiscounts.set(normalized.id, cloneDiscount(normalized));
    return cloneDiscount(normalized);
  }

  await ensureAdminContentReady(db);
  await db
    .prepare(`
      INSERT INTO discounts (id, code, label, discount_type, amount, active, scope)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        label = excluded.label,
        discount_type = excluded.discount_type,
        amount = excluded.amount,
        active = excluded.active,
        scope = excluded.scope
    `)
    .bind(
      normalized.id,
      normalized.code,
      normalized.label,
      normalized.type,
      normalized.value,
      normalized.active ? 1 : 0,
      normalized.scope,
    )
    .run();

  return cloneDiscount(normalized);
}

async function deleteDiscountInternal(id: string) {
  const normalizedId = id.trim();
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memoryDiscounts.delete(normalizedId);
    return { success: true };
  }

  await ensureAdminContentReady(db);
  await db.prepare("DELETE FROM discounts WHERE id = ?").bind(normalizedId).run();
  return { success: true };
}

async function getSettingsInternal() {
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    return cloneSettings(memorySettings);
  }

  await ensureAdminContentReady(db);
  const row = await db
    .prepare("SELECT value_json FROM app_settings WHERE key = ? LIMIT 1")
    .bind(SETTINGS_KEY)
    .first<{ value_json: string }>();

  if (!row?.value_json) {
    return cloneSettings(ADMIN_SETTINGS);
  }

  try {
    return cloneSettings(coerceSettingsRecord(JSON.parse(row.value_json)));
  } catch {
    return cloneSettings(ADMIN_SETTINGS);
  }
}

async function saveSettingsInternal(input: AdminSettingsRecord) {
  const normalized = settingsSchema.parse({
    ...input,
    contactFaqs: input.contactFaqs
      .map((faq, index) => ({
        id: normalizeAnnouncementId(faq.id || `faq-${index + 1}`),
        question: faq.question.trim(),
        answer: faq.answer.trim(),
      }))
      .filter((faq) => faq.question.length > 0 && faq.answer.length > 0),
    footerShopLinks: input.footerShopLinks
      .map((link) => ({ label: link.label.trim(), to: link.to.trim() }))
      .filter((link) => link.label.length > 0 && link.to.length > 0),
    footerHelpLinks: input.footerHelpLinks
      .map((link) => ({ label: link.label.trim(), to: link.to.trim() }))
      .filter((link) => link.label.length > 0 && link.to.length > 0),
    legalSections: input.legalSections
      .map((section, index) => ({
        id: normalizeAnnouncementId(section.id || `legal-${index + 1}`),
        title: section.title.trim(),
        body: section.body.trim(),
      }))
      .filter((section) => section.title.length > 0 && section.body.length > 0),
    announcements: input.announcements
      .map((announcement, index) => ({
        id: normalizeAnnouncementId(announcement.id || `announcement-${index + 1}`),
        text: announcement.text.trim(),
        active: announcement.active,
      }))
      .filter((announcement) => announcement.text.length > 0),
  });
  const db = await getDatabase();
  if (!db) {
    seedMemoryContent();
    memorySettings = cloneSettings(normalized);
    return cloneSettings(normalized);
  }

  await ensureAdminContentReady(db);
  await db
    .prepare(`
      INSERT INTO app_settings (key, value_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(SETTINGS_KEY, JSON.stringify(normalized))
    .run();

  return cloneSettings(normalized);
}

async function listStorefrontAnnouncementsInternal() {
  const settings = await getSettingsInternal();
  return settings.announcements
    .filter((announcement) => announcement.active && announcement.text.trim().length > 0)
    .map((announcement) => ({
      id: announcement.id,
      text: announcement.text.trim(),
    } satisfies Pick<AdminAnnouncementRecord, "id" | "text">));
}

async function listStorefrontCategoriesInternal() {
  const categories = await listCategoriesInternal();
  return categories
    .map((category) => ({
      id: category.id,
      isNsfw: category.isNsfw,
      label: category.label,
      sortOrder: category.sortOrder,
      vibes: [...category.vibes],
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export async function getStorefrontSettingsInternal() {
  const settings = await getSettingsInternal();
  return {
    businessName: settings.businessName,
    supportEmail: settings.supportEmail,
    whatsappNumber: settings.whatsappNumber,
    whatsappLabel: settings.whatsappLabel,
    instagramHandle: settings.instagramHandle,
    instagramUrl: settings.instagramUrl,
    contactResponseNote: settings.contactResponseNote,
    adultAudienceNotice: settings.adultAudienceNotice,
    contactPageTitle: settings.contactPageTitle,
    contactPageIntro: settings.contactPageIntro,
    contactCardNote: settings.contactCardNote,
    contactFaqs: settings.contactFaqs.map((faq) => ({ ...faq })),
    homeSelectionTitle: settings.homeSelectionTitle,
    homeSelectionSubtitle: settings.homeSelectionSubtitle,
    homeGeneralStoreCtaLabel: settings.homeGeneralStoreCtaLabel,
    newsletterTitle: settings.newsletterTitle,
    newsletterDescription: settings.newsletterDescription,
    aboutPageTitle: settings.aboutPageTitle,
    aboutPageIntro: settings.aboutPageIntro,
    aboutStoryTitle: settings.aboutStoryTitle,
    aboutStoryBody: settings.aboutStoryBody,
    aboutCtaLabel: settings.aboutCtaLabel,
    moonPageTagline: settings.moonPageTagline,
    moonPageIntro: settings.moonPageIntro,
    sunshinePageTagline: settings.sunshinePageTagline,
    sunshinePageIntro: settings.sunshinePageIntro,
    menPageTagline: settings.menPageTagline,
    menPageIntro: settings.menPageIntro,
    vibeCatalogHeading: settings.vibeCatalogHeading,
    productDetailsTitle: settings.productDetailsTitle,
    productDetailsBody: settings.productDetailsBody,
    productCareTitle: settings.productCareTitle,
    productCareBody: settings.productCareBody,
    productShippingTitle: settings.productShippingTitle,
    productShippingBody: settings.productShippingBody,
    footerHeading: settings.footerHeading,
    footerAccent: settings.footerAccent,
    footerCopyright: settings.footerCopyright,
    footerShopLinks: settings.footerShopLinks.map((link) => ({ ...link })),
    footerHelpLinks: settings.footerHelpLinks.map((link) => ({ ...link })),
    legalPageTitle: settings.legalPageTitle,
    legalLastUpdated: settings.legalLastUpdated,
    legalOperatorName: settings.legalOperatorName,
    legalOperatorEmail: settings.legalOperatorEmail,
    legalOperatorPhone: settings.legalOperatorPhone,
    legalOperatorAddress: settings.legalOperatorAddress,
    legalTaxId: settings.legalTaxId,
    legalIntro: settings.legalIntro,
    legalSections: settings.legalSections.map((section) => ({ ...section })),
  };
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return cleaned || "image";
}

function extensionFromFile(file: File) {
  const lastDot = file.name.lastIndexOf(".");
  if (lastDot >= 0) {
    const ext = file.name.slice(lastDot).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/.test(ext)) {
      return ext;
    }
  }

  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  if (file.type === "image/avif") return ".avif";
  return "";
}

function buildPublicMediaUrl(baseUrl: string, key: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/g, "");
  const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `${normalizedBaseUrl}/${encodedKey}`;
}

function getExistingR2Key(url: string | null | undefined, baseUrl: string) {
  if (!url) return null;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/g, "");
  if (!url.startsWith(`${normalizedBaseUrl}/`)) {
    return null;
  }

  const rawKey = url.slice(normalizedBaseUrl.length + 1);
  return rawKey
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

async function uploadProductImageInternal(formData: FormData) {
  const workerEnv = await getWorkerEnv();
  const bucket = workerEnv.PUBLIC_MEDIA;
  if (!bucket) {
    throw new Error("PUBLIC_MEDIA no esta configurado todavia.");
  }

  const baseUrl = workerEnv.R2_PUBLIC_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("R2_PUBLIC_BASE_URL no esta configurado todavia.");
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim() || "Principal";
  const file = formData.get("file");

  if (!productId) {
    throw new Error("Falta el producto del asset.");
  }

  if (!(file instanceof File)) {
    throw new Error("Selecciona una imagen valida antes de subir.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se permiten imagenes.");
  }

  if (file.size <= 0) {
    throw new Error("La imagen seleccionada esta vacia.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("La imagen supera el limite de 10 MB.");
  }

  const products = await listCatalogProductsInternal();
  const current = products.find((product) => product.id === productId);
  if (!current) {
    throw new Error("El producto ya no existe.");
  }

  if (current.images.length >= 5) {
    throw new Error("Cada producto admite maximo 5 imagenes.");
  }

  const extension = extensionFromFile(file);
  const safeBaseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ""));
  const objectKey = `products/${productId}/${Date.now()}-${safeBaseName}${extension}`;
  const fileBuffer = await file.arrayBuffer();

  await bucket.put(objectKey, fileBuffer, {
    httpMetadata: {
      contentType: file.type || undefined,
    },
    customMetadata: {
      productId,
      label,
    },
  });

  const nextUrl = buildPublicMediaUrl(baseUrl, objectKey);
  const nextImage = {
    url: nextUrl,
    altText: label,
  };
  const nextImages = [...current.images, nextImage].slice(0, 5);
  const saved = await saveCatalogProductInternal(
    toAdminProductRecord({
      ...current,
      featuredImage: current.featuredImage ?? nextImage,
      images: nextImages,
    }),
  );

  return toAdminProductRecord(saved);
}

async function deleteProductImageInternal(input: { productId: string; url: string }) {
  const workerEnv = await getWorkerEnv();
  const baseUrl = workerEnv.R2_PUBLIC_BASE_URL?.trim() || "";
  const bucket = workerEnv.PUBLIC_MEDIA;
  const products = await listCatalogProductsInternal();
  const current = products.find((product) => product.id === input.productId);
  if (!current) {
    throw new Error("El producto ya no existe.");
  }

  const nextImages = current.images.filter((image) => image.url !== input.url);
  if (nextImages.length === current.images.length) {
    throw new Error("La imagen ya no existe en este producto.");
  }

  const nextFeaturedImage =
    current.featuredImage?.url === input.url
      ? nextImages[0] ?? null
      : current.featuredImage;

  if (bucket && baseUrl) {
    const existingKey = getExistingR2Key(input.url, baseUrl);
    if (existingKey) {
      try {
        await bucket.delete(existingKey);
      } catch {
        // Best effort cleanup only.
      }
    }
  }

  const saved = await saveCatalogProductInternal(
    toAdminProductRecord({
      ...current,
      featuredImage: nextFeaturedImage,
      images: nextImages,
    }),
  );

  return toAdminProductRecord(saved);
}

export const getAdminCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return listCategoriesInternal();
});

export const getAdminSizeFormats = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return listSizeFormatsInternal();
});

export const saveAdminSizeFormat = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof sizeFormatSchema>) => sizeFormatSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return saveSizeFormatInternal(data);
  });

export const saveAdminCategory = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof categorySchema>) => categorySchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return saveCategoryInternal(data);
  });

export const deleteAdminCategory = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof deleteCategorySchema>) => deleteCategorySchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return deleteCategoryInternal(data.id, data.replacementCategoryId);
  });

export const getAdminCollections = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return listCollectionsInternal();
});

export const getStorefrontHomeCollections = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");
  return listHomeCollectionsInternal();
});

export const getStorefrontCollections = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");
  return listPublicCollectionsInternal();
});

export const getStorefrontCollectionBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "public, max-age=60");
    return getStorefrontCollectionBySlugInternal(data.slug);
  });

export const saveAdminCollection = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof collectionSchema>) => collectionSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return saveCollectionInternal(data);
  });

export const deleteAdminCollection = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof deleteByIdSchema>) => deleteByIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return deleteCollectionInternal(data.id);
  });

export const getAdminDiscounts = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return listDiscountsInternal();
});

export const saveAdminDiscount = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof discountSchema>) => discountSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return saveDiscountInternal(data);
  });

export const deleteAdminDiscount = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return deleteDiscountInternal(data.id);
  });

export const getAdminSettingsRecord = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return getSettingsInternal();
});

export const saveAdminSettingsRecord = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof settingsSchema>) => settingsSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return saveSettingsInternal(data);
  });

export const getStorefrontAnnouncements = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");
  return listStorefrontAnnouncementsInternal();
});

export const getStorefrontCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");
  return listStorefrontCategoriesInternal();
});

export const getStorefrontSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");
  return getStorefrontSettingsInternal();
});

export const uploadAdminProductImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) {
      throw new Error("Invalid product image upload form data.");
    }

    return data;
  })
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return uploadProductImageInternal(data);
  });

export const deleteAdminProductImage = createServerFn({ method: "POST" })
  .inputValidator((data: { productId: string; url: string }) =>
    z.object({
      productId: z.string().trim().min(1),
      url: z.string().trim().url(),
    }).parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();
    setResponseHeader("Cache-Control", "private, no-store");
    return deleteProductImageInternal(data);
  });
