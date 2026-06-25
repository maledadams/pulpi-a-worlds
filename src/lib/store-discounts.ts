import type { Product } from "@/data/products";
import { ADMIN_DISCOUNTS } from "@/lib/admin-service";
import type { AdminDiscountRecord } from "@/lib/admin-types";

type WorkerEnv = {
  DB?: D1Database;
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

let discountStorageReadyPromise: Promise<void> | null = null;

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
      await db.exec(`
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
      `);

      const discountCount = await db.prepare("SELECT COUNT(*) AS count FROM discounts").first<{ count: number }>();
      if ((discountCount?.count ?? 0) > 0) {
        return;
      }

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
    })().catch((error) => {
      discountStorageReadyPromise = null;
      throw error;
    });
  }

  return discountStorageReadyPromise;
}

function parseDiscountRow(row: DiscountRow): AdminDiscountRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    type: row.discount_type === "fixed" ? "fixed" : "percentage",
    value: row.amount,
    active: row.active === 1,
    scope: (row.scope?.trim() || "store") as AdminDiscountRecord["scope"],
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

  await ensureDiscountStorageReady(db);
  const rows = await db
    .prepare(`
      SELECT id, code, label, discount_type, amount, active, scope
      FROM discounts
      WHERE active = 1
      ORDER BY code ASC
    `)
    .all<DiscountRow>();

  return (rows.results ?? []).map(parseDiscountRow).filter((discount) => discount.active);
}

export function applyDiscountsToProduct(product: Product, discounts: AdminDiscountRecord[]) {
  const applicable = discounts.filter(
    (discount) => discount.active && (discount.scope === "store" || discount.scope === product.vibe),
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
