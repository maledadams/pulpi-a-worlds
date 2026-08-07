import type { Product } from "@/data/products";
import { ADMIN_DISCOUNTS } from "@/lib/admin-service";
import type { AdminDiscountRecord } from "@/lib/admin-types";

type WorkerEnv = {
  DB?: D1Database;
};

type DiscountRow = {
  id: string;
  kind: string | null;
  code: string;
  label: string;
  discount_type: string;
  amount: number;
  active: number;
  scope: string;
  category_ids_json: string | null;
  max_redemptions: number | null;
  one_per_customer: number | null;
};

let discountStorageReadyPromise: Promise<void> | null = null;

const DISCOUNTS_CACHE_TTL_MS = 60_000;
let discountsCache: { value: AdminDiscountRecord[]; expiresAt: number } | null = null;

export function invalidateDiscountsCache() {
  discountsCache = null;
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

async function ensureDiscountStorageReady(db: D1Database) {
  if (!discountStorageReadyPromise) {
    discountStorageReadyPromise = (async () => {
      await db.exec(
        `
        CREATE TABLE IF NOT EXISTS discounts (
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL DEFAULT 'code',
          code TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          discount_type TEXT NOT NULL,
          amount INTEGER NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          scope TEXT NOT NULL DEFAULT 'store',
          category_ids_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS discount_redemptions (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL,
          email TEXT NOT NULL,
          order_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS discount_redemptions_code ON discount_redemptions (code);
      `.replace(/\n/g, " "),
      );

      const discountMigrations = [
        "ALTER TABLE discounts ADD COLUMN max_redemptions INTEGER;",
        "ALTER TABLE discounts ADD COLUMN one_per_customer INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE discounts ADD COLUMN kind TEXT NOT NULL DEFAULT 'code';",
        "ALTER TABLE discounts ADD COLUMN category_ids_json TEXT NOT NULL DEFAULT '[]';",
      ];
      for (const statement of discountMigrations) {
        try {
          await db.exec(statement);
        } catch {
          // Existing databases already have this column.
        }
      }

      await db.exec(
        `
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `.replace(/\n/g, " "),
      );

      // Seed exactly once, ever, via a persisted marker - re-checking COUNT(*)
      // would re-insert NEW10/MOON500 the moment an admin deletes them all
      // (count back to 0), undoing intentional deletions on the next cold
      // isolate. Shares the "discounts_seeded" key with admin-content.ts,
      // which manages this same table - whichever file's ensure-ready runs
      // first wins the seed, the other just records the marker.
      const seededRow = await db
        .prepare("SELECT value_json FROM app_settings WHERE key = ?")
        .bind("discounts_seeded")
        .first<{ value_json: string }>();
      if (seededRow) return;

      const markSeeded = () =>
        db
          .prepare("INSERT INTO app_settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO NOTHING")
          .bind("discounts_seeded", JSON.stringify({ seededAt: new Date().toISOString() }))
          .run();

      const discountCount = await db.prepare("SELECT COUNT(*) AS count FROM discounts").first<{ count: number }>();
      if ((discountCount?.count ?? 0) > 0) {
        await markSeeded();
        return;
      }

      const insertDiscount = db.prepare(`
        INSERT INTO discounts (id, kind, code, label, discount_type, amount, active, scope, category_ids_json, max_redemptions, one_per_customer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await db.batch(
        ADMIN_DISCOUNTS.map((discount) =>
          insertDiscount.bind(
            discount.id,
            discount.kind,
            discount.code,
            discount.label,
            discount.type,
            discount.value,
            discount.active ? 1 : 0,
            discount.scope,
            JSON.stringify(discount.categoryIds),
            discount.maxRedemptions,
            discount.onePerCustomer ? 1 : 0,
          ),
        ),
      );
      await markSeeded();
    })().catch((error) => {
      discountStorageReadyPromise = null;
      throw error;
    });
  }

  return discountStorageReadyPromise;
}

function parseDiscountRow(row: DiscountRow): AdminDiscountRecord {
  let categoryIds: string[] = [];
  try {
    const raw = row.category_ids_json ? JSON.parse(row.category_ids_json) : [];
    categoryIds = Array.isArray(raw) ? raw.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    categoryIds = [];
  }

  return {
    id: row.id,
    kind: row.kind === "promotion" ? "promotion" : "code",
    code: row.code,
    label: row.label,
    type: row.discount_type === "fixed" ? "fixed" : "percentage",
    value: row.amount,
    active: row.active === 1,
    scope: (row.scope?.trim() || "store") as AdminDiscountRecord["scope"],
    categoryIds,
    maxRedemptions: row.max_redemptions ?? null,
    onePerCustomer: row.one_per_customer === 1,
  };
}

function roundPrice(amount: number) {
  return Math.max(0, Math.round(amount * 100) / 100);
}

function getDiscountedPrice(price: number, discount: AdminDiscountRecord) {
  if (discount.type === "percentage") {
    return roundPrice(price * (1 - discount.value / 100));
  }

  return roundPrice(price - discount.value);
}

export async function listActiveDiscountsInternal() {
  const db = await getDatabase();
  if (!db) {
    return ADMIN_DISCOUNTS.filter((discount) => discount.active);
  }

  if (discountsCache && discountsCache.expiresAt > Date.now()) {
    return discountsCache.value.map((discount) => ({ ...discount }));
  }

  await ensureDiscountStorageReady(db);
  const rows = await db
    .prepare(`
      SELECT id, kind, code, label, discount_type, amount, active, scope, category_ids_json, max_redemptions, one_per_customer
      FROM discounts
      WHERE active = 1
      ORDER BY code ASC
    `)
    .all<DiscountRow>();

  const discounts = (rows.results ?? []).map(parseDiscountRow).filter((discount) => discount.active);
  discountsCache = { value: discounts, expiresAt: Date.now() + DISCOUNTS_CACHE_TTL_MS };
  return discounts.map((discount) => ({ ...discount }));
}

export async function findActiveCheckoutDiscount(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const discounts = await listActiveDiscountsInternal();
  return discounts.find((discount) => discount.kind === "code" && discount.code.toUpperCase() === normalized) ?? null;
}

export async function getDiscountRedemptionStatus(discount: AdminDiscountRecord, email: string) {
  if (discount.maxRedemptions === null && !discount.onePerCustomer) {
    return { allowed: true as const };
  }

  const db = await getDatabase();
  if (!db) return { allowed: true as const };

  await ensureDiscountStorageReady(db);
  const normalizedCode = discount.code.trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  if (discount.onePerCustomer) {
    const existing = await db
      .prepare("SELECT 1 FROM discount_redemptions WHERE code = ? AND email = ? LIMIT 1")
      .bind(normalizedCode, normalizedEmail)
      .first();
    if (existing) {
      return { allowed: false as const, reason: "already_used" as const };
    }
  }

  if (discount.maxRedemptions !== null) {
    const countRow = await db
      .prepare("SELECT COUNT(*) AS count FROM discount_redemptions WHERE code = ?")
      .bind(normalizedCode)
      .first<{ count: number }>();
    if ((countRow?.count ?? 0) >= discount.maxRedemptions) {
      return { allowed: false as const, reason: "exhausted" as const };
    }
  }

  return { allowed: true as const };
}

export async function recordDiscountRedemption(code: string, email: string, orderId: string) {
  const db = await getDatabase();
  if (!db) return;

  await ensureDiscountStorageReady(db);
  await db
    .prepare("INSERT INTO discount_redemptions (id, code, email, order_id, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), code.trim().toUpperCase(), email.trim().toLowerCase(), orderId, new Date().toISOString())
    .run();
}

export function computeCheckoutDiscountAmount(discount: AdminDiscountRecord, subtotal: number) {
  if (discount.type === "percentage") {
    return roundPrice(subtotal * (discount.value / 100));
  }

  return roundPrice(Math.min(subtotal, discount.value));
}

export function applyDiscountsToProduct(product: Product, discounts: AdminDiscountRecord[]) {
  const productCategories = product.categories?.length ? product.categories : [product.category];
  const applicable = discounts.filter(
    (discount) =>
      discount.active &&
      // Only promotions auto-apply to displayed prices - a code discount
      // must stay invisible until someone actually types it in at checkout,
      // otherwise creating a checkout code would silently discount every
      // matching product storewide/department-wide the moment it's active.
      discount.kind === "promotion" &&
      (discount.scope === "store" || discount.scope === product.vibe) &&
      (discount.categoryIds.length === 0 ||
        productCategories.some((category) => discount.categoryIds.includes(category))),
  );

  if (applicable.length === 0) {
    return product;
  }

  const discountedVariants = product.variants.map((variant) => {
    const nextPrice = applicable.reduce((lowest, discount) => {
      const discounted = getDiscountedPrice(variant.price, discount);
      return discounted < lowest ? discounted : lowest;
    }, variant.price);

    const compareBase = Math.max(variant.compareAtPrice ?? 0, variant.price);
    return {
      ...variant,
      price: nextPrice,
      compareAtPrice: compareBase > nextPrice ? compareBase : variant.compareAtPrice,
    };
  });

  const bestPrice = discountedVariants.reduce(
    (lowest, variant) => (variant.price < lowest ? variant.price : lowest),
    product.price,
  );

  if (!(bestPrice < product.price)) {
    return product;
  }

  const compareBase = Math.max(product.compareAtPrice ?? 0, product.price);
  const compareAtPrice = compareBase > bestPrice ? compareBase : product.compareAtPrice;

  return {
    ...product,
    price: bestPrice,
    compareAtPrice,
    salePrice: bestPrice,
    variants: discountedVariants,
  } satisfies Product;
}

export function applyDiscountsToProducts(products: Product[], discounts: AdminDiscountRecord[]) {
  return products.map((product) => applyDiscountsToProduct(product, discounts));
}
