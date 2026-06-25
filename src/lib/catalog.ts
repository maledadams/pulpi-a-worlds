import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import {
  FALLBACK_PRODUCTS,
  type Product,
  type ProductImage,
  type ProductVariant,
} from "@/data/products";
import { enforceAdminAccess } from "@/lib/admin-access";
import type { AdminProductRecord } from "@/lib/admin-types";
import { toAdminProductRecord } from "@/lib/admin-service";
import {
  buildProductColorRecord,
  getProductColorHex,
  normalizeProductColorName,
} from "@/lib/product-colors";
import { normalizeSizeList } from "@/lib/product-sizing";
import { applyDiscountsToProducts, listActiveDiscountsInternal } from "@/lib/store-discounts";

type WorkerEnv = {
  DB?: D1Database;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  department: string;
  primary_category: string;
  is_nsfw: number;
  is_active: number;
  hidden: number;
  featured: number;
  new_arrival: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency_code: string;
  stock: number | null;
  product_json: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
};

const productImageSchema = z.object({
  url: z.string().trim().url(),
  altText: z.string().nullable(),
});

const productVariantSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  available: z.boolean(),
  quantityAvailable: z.number().int().nullable(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable(),
  currencyCode: z.string().trim().min(1),
  image: productImageSchema.nullable(),
  selectedOptions: z.array(
    z.object({
      name: z.string().trim().min(1),
      value: z.string().trim().min(1),
    }),
  ),
});

const productColorSchema = z.object({
  name: z.string().trim().min(1),
  hex: z.string().trim().min(1),
});

const adminProductSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  vibe: z.enum(["pulpina", "men", "moon", "sunshine"]),
  sortOrder: z.number().int().nonnegative(),
  categories: z.array(z.string().trim().min(1)).min(1),
  primaryCategory: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable(),
  available: z.boolean(),
  hidden: z.boolean(),
  stock: z.number().int().nullable(),
  featured: z.boolean(),
  newArrival: z.boolean(),
  isNsfw: z.boolean(),
  images: z.array(productImageSchema),
  featuredImage: productImageSchema.nullable(),
  sizes: z.array(z.string().trim().min(1)).min(1).max(20),
  colors: z.array(productColorSchema).min(1).max(15),
  variants: z.array(productVariantSchema),
  tags: z.array(z.string().trim().min(1)),
  createdAt: z.string().trim().min(1),
});

const deleteProductSchema = z.object({
  id: z.string().trim().min(1),
});

const memoryCatalog = new Map<string, Product>();
let catalogStorageReadyPromise: Promise<void> | null = null;
let memoryCatalogSeeded = false;

function cloneImage(image: ProductImage): ProductImage {
  return {
    url: image.url,
    altText: image.altText,
  };
}

function cloneVariant(variant: ProductVariant): ProductVariant {
  return {
    ...variant,
    image: variant.image ? cloneImage(variant.image) : null,
    selectedOptions: variant.selectedOptions.map((option) => ({ ...option })),
  };
}

function cloneProduct(product: Product): Product {
  return {
    ...product,
    categories: product.categories ? [...product.categories] : undefined,
    tags: [...product.tags],
    swatch: [...product.swatch] as [string, string],
    images: product.images.map(cloneImage),
    featuredImage: product.featuredImage ? cloneImage(product.featuredImage) : null,
    options: product.options.map((option) => ({
      ...option,
      values: [...option.values],
    })),
    variants: product.variants.map(cloneVariant),
    sizes: product.sizes ? [...product.sizes] : undefined,
    colors: product.colors?.map((color) => ({ ...color })),
  };
}

function cloneProducts(products: Product[]) {
  return products.map(cloneProduct);
}

function localizeVariantTitle(size: string, color: string, hasColor = true) {
  return hasColor ? `${size} / ${color}` : size;
}

function localizeStoredProduct(product: Product): Product {
  const localizedColors = (product.colors ?? []).map((color) => ({
    ...color,
    name: normalizeProductColorName(color.name),
    hex: getProductColorHex(color.name, color.hex),
  }));
  const fallbackColorName =
    localizedColors[0]?.name ??
    normalizeProductColorName(product.options.find((option) => option.name === "Color")?.values[0] ?? getDefaultColorName(product.vibe));
  const localizedOptions = product.options.map((option) =>
    option.name === "Color"
      ? { ...option, values: option.values.map((value) => normalizeProductColorName(value)) }
      : option,
  );
  const localizedVariants = product.variants.map((variant) => {
    const localizedSelectedOptions = variant.selectedOptions.map((option) =>
      option.name === "Color"
        ? { ...option, value: normalizeProductColorName(option.value) }
        : option,
    );
    const size = localizedSelectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
    const color = localizedSelectedOptions.find((option) => option.name === "Color")?.value ?? fallbackColorName;
    return {
      ...variant,
      title: localizeVariantTitle(size, color, Boolean(color)),
      selectedOptions: localizedSelectedOptions,
    };
  });

  return {
    ...product,
    colors: localizedColors,
    options: localizedOptions,
    variants: localizedVariants,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number | null | undefined) {
  return typeof amount === "number" ? amount / 100 : null;
}

function getDefaultSwatch(vibe: Product["vibe"]): [string, string] {
  if (vibe === "moon") return ["#45121e", "#f7efe7"];
  if (vibe === "men") return ["#241d1d", "#b9a8a0"];
  if (vibe === "sunshine") return ["#ffd2e4", "#fff0a8"];
  return ["#fce7a4", "#f3a6c4"];
}

function getDefaultColorName(vibe: Product["vibe"]) {
  if (vibe === "moon") return "Vino";
  if (vibe === "men") return "Negro";
  if (vibe === "sunshine") return "Rosado";
  return "Beige";
}

function colorsToSwatch(colors: Array<{ name: string; hex: string }>, vibe: Product["vibe"]) {
  if (colors.length === 0) return getDefaultSwatch(vibe);
  const primary = colors[0]?.hex || getDefaultSwatch(vibe)[0];
  const secondary = colors[1]?.hex || colors[0]?.hex || getDefaultSwatch(vibe)[1];
  return [primary, secondary] as [string, string];
}

function ensureMemoryCatalog() {
  if (!memoryCatalogSeeded) {
    for (const product of FALLBACK_PRODUCTS.filter((entry) => entry.vibe !== "pulpina")) {
      memoryCatalog.set(product.id, cloneProduct(product));
    }
    memoryCatalogSeeded = true;
  }
}

function listMemoryProducts() {
  ensureMemoryCatalog();
  return Array.from(memoryCatalog.values())
    .map(cloneProduct)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name));
}

function saveMemoryProduct(product: Product) {
  ensureMemoryCatalog();
  memoryCatalog.set(product.id, cloneProduct(product));
  return cloneProduct(product);
}

function deleteMemoryProduct(productId: string) {
  ensureMemoryCatalog();
  memoryCatalog.delete(productId);
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

async function ensureCatalogStorageReady(db: D1Database) {
  if (!catalogStorageReadyPromise) {
    catalogStorageReadyPromise = (async () => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          department TEXT NOT NULL,
          primary_category TEXT NOT NULL,
          is_nsfw INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          featured INTEGER NOT NULL DEFAULT 0,
          new_arrival INTEGER NOT NULL DEFAULT 0,
          price_cents INTEGER NOT NULL,
          compare_at_price_cents INTEGER,
          currency_code TEXT NOT NULL DEFAULT 'DOP',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const schemaUpdates = [
        "ALTER TABLE products ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE products ADD COLUMN stock INTEGER;",
        "ALTER TABLE products ADD COLUMN product_json TEXT NOT NULL DEFAULT '{}';",
        "ALTER TABLE products ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;",
      ];

      for (const statement of schemaUpdates) {
        try {
          await db.exec(statement);
        } catch {
          // Existing databases already have this column.
        }
      }

      const countRow = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
      await db.prepare("DELETE FROM products WHERE department = ?").bind("pulpina").run();
      if ((countRow?.count ?? 0) > 0) {
        return;
      }

      const insertStatement = db.prepare(`
        INSERT INTO products (
          id,
          slug,
          name,
          description,
          department,
          primary_category,
          is_nsfw,
          is_active,
          hidden,
          featured,
          new_arrival,
          price_cents,
          compare_at_price_cents,
          currency_code,
          stock,
          product_json,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batch = FALLBACK_PRODUCTS.filter((product) => product.vibe !== "pulpina").map((product, index) => {
        const categories = product.categories?.length ? product.categories : [product.category];
        const isNsfw = categories.some((category) => ["lingerie", "kinkwear", "sex-toys"].includes(category));
        return insertStatement.bind(
          product.id,
          product.slug,
          product.name,
          product.description,
          product.vibe,
          product.category,
          isNsfw ? 1 : 0,
          product.available ? 1 : 0,
          product.hidden ? 1 : 0,
          product.featured ? 1 : 0,
          product.newArrival ? 1 : 0,
          toCents(product.price),
          product.compareAtPrice ? toCents(product.compareAtPrice) : null,
          product.currencyCode,
          product.stock,
          JSON.stringify(product),
          index,
          product.createdAt,
          product.createdAt,
        );
      });

      await db.batch(batch);
    })().catch((error) => {
      catalogStorageReadyPromise = null;
      throw error;
    });
  }

  return catalogStorageReadyPromise;
}

function parseStoredProduct(row: ProductRow) {
  if (!row.product_json) return null;

  try {
    const parsed = JSON.parse(row.product_json) as Product;
    return cloneProduct(parsed);
  } catch {
    return null;
  }
}

function productFromRow(row: ProductRow) {
  const parsed = parseStoredProduct(row);
  if (parsed) {
    return localizeStoredProduct({
      ...parsed,
      sortOrder: row.sort_order ?? parsed.sortOrder ?? 0,
      slug: row.slug,
      name: row.name,
      description: row.description,
      price: fromCents(row.price_cents) ?? parsed.price,
      compareAtPrice: fromCents(row.compare_at_price_cents),
      currencyCode: row.currency_code || parsed.currencyCode,
      available: row.is_active === 1,
      hidden: row.hidden === 1,
      featured: row.featured === 1,
      newArrival: row.new_arrival === 1,
      stock: row.stock,
      category: row.primary_category,
      createdAt: row.created_at,
    } satisfies Product);
  }

  const swatch = getDefaultSwatch(row.department as Product["vibe"]);
  const defaultColorName = getDefaultColorName(row.department as Product["vibe"]);
  const featuredImage = null;
  const variantId = `${row.slug}-default`;
  const price = fromCents(row.price_cents) ?? 0;
  const compareAtPrice = fromCents(row.compare_at_price_cents);
  const available = row.is_active === 1;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    vibe: row.department as Product["vibe"],
    sortOrder: row.sort_order ?? 0,
    category: row.primary_category,
    categories: [row.primary_category],
    description: row.description,
    descriptionHtml: `<p>${escapeHtml(row.description)}</p>`,
    price,
    compareAtPrice,
    currencyCode: row.currency_code || "DOP",
    available,
    hidden: row.hidden === 1,
    stock: row.stock,
    featured: row.featured === 1,
    newArrival: row.new_arrival === 1,
    tags: [],
    swatch,
    images: [],
    featuredImage,
    options: [
      { name: "Talla", values: ["Unica"] },
      { name: "Color", values: [defaultColorName] },
    ],
    variants: [
      {
        id: variantId,
        title: "Unica",
        available,
        quantityAvailable: row.stock,
        price,
        compareAtPrice,
        currencyCode: row.currency_code || "DOP",
        image: featuredImage,
        selectedOptions: [
          { name: "Talla", value: "Unica" },
          { name: "Color", value: defaultColorName },
        ],
      },
    ],
    createdAt: row.created_at,
    sizes: ["Unica"],
    colors: [{ name: defaultColorName, hex: swatch[0] }],
    salePrice: compareAtPrice ? price : null,
  } satisfies Product;
}

function normalizeCategories(record: AdminProductRecord) {
  const categories = Array.from(
    new Set(
      [record.primaryCategory, ...record.categories]
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  return categories.length > 0 ? categories : [record.primaryCategory.trim().toLowerCase()];
}

function normalizeVariants(record: AdminProductRecord, swatch: [string, string], featuredImage: ProductImage | null) {
  const fallbackSizes = record.variants
    .map((variant) => variant.selectedOptions.find((option) => option.name === "Talla")?.value)
    .filter((value): value is string => Boolean(value));
  const sizes = normalizeSizeList(record.sizes.length > 0 ? record.sizes : (fallbackSizes.length > 0 ? fallbackSizes : ["Unica"]));
  const fallbackColors = record.variants
    .map((variant) => variant.selectedOptions.find((option) => option.name === "Color")?.value)
    .filter((value): value is string => Boolean(value));
  const colors = Array.from(
    new Map(
      (record.colors.length > 0
        ? record.colors
        : (fallbackColors.length > 0
            ? fallbackColors.map((name, index) => buildProductColorRecord(name, swatch[index % swatch.length]))
            : [buildProductColorRecord(getDefaultColorName(record.vibe), swatch[0])]))
        .map((color) => [
          normalizeProductColorName(color.name).toLowerCase(),
          {
            name: normalizeProductColorName(color.name),
            hex: getProductColorHex(color.name, color.hex || swatch[0]),
          },
        ] as const),
    ).values(),
  );
  const colorNames = colors.map((color) => color.name);
  const existingVariants = new Map(
    record.variants.map((variant) => {
      const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
      const color = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? colorNames[0] ?? getDefaultColorName(record.vibe);
      return [`${size}::${color}`.toLowerCase(), variant] as const;
    }),
  );

  const variants = sizes.flatMap((size, sizeIndex) =>
    colorNames.map((colorName, colorIndex) => {
      const selectedOptions = [
        { name: "Talla", value: size },
        { name: "Color", value: colorName },
      ];
      const currentVariant = existingVariants.get(`${size}::${colorName}`.toLowerCase());
      const quantityAvailable =
        currentVariant?.quantityAvailable ??
        record.stock ??
        0;
      const available = currentVariant?.available ?? record.available;
      const price = currentVariant?.price ?? record.price;
      const compareAtPrice = currentVariant?.compareAtPrice ?? record.compareAtPrice;

      return {
        id: `${record.slug.trim().toLowerCase().replace(/\s+/g, "-") || "product"}-${size}-${colorName}`
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/-+/g, "-"),
        title: colorNames.length > 1 ? `${size} / ${colorName}` : size,
        available,
        quantityAvailable,
        price,
        compareAtPrice,
        currencyCode: "DOP",
        image: currentVariant?.image ?? featuredImage ?? record.images[sizeIndex + colorIndex] ?? null,
        selectedOptions,
      } satisfies ProductVariant;
    }),
  );

  return {
    variants,
    sizes,
    colors,
  };
}

function normalizeProduct(record: AdminProductRecord, existing?: Product) {
  const categories = normalizeCategories(record);
  const swatch = colorsToSwatch(record.colors, record.vibe);
  const trimmedImages = record.images.slice(0, 5).map(cloneImage);
  const featuredImage =
    (record.featuredImage && trimmedImages.some((image) => image.url === record.featuredImage?.url) ? record.featuredImage : null) ??
    trimmedImages[0] ??
    existing?.featuredImage ??
    null;
  const { variants, sizes, colors } = normalizeVariants(record, swatch, featuredImage);
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, variant.quantityAvailable ?? 0), 0);
  const hasSellableVariant = variants.some(
    (variant) => variant.available && (variant.quantityAvailable ?? 0) > 0,
  );
  const productPrice = record.price;
  const productCompareAtPrice = record.compareAtPrice;

  return {
    id: record.id.trim(),
    slug: record.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    name: record.name.trim(),
    vibe: record.vibe,
    sortOrder: Math.max(0, Number(record.sortOrder ?? 0)),
    category: record.primaryCategory.trim().toLowerCase(),
    categories,
    description: record.description.trim(),
    descriptionHtml: existing?.descriptionHtml ?? `<p>${escapeHtml(record.description.trim())}</p>`,
    price: productPrice,
    compareAtPrice: productCompareAtPrice,
    currencyCode: existing?.currencyCode ?? "DOP",
    available: record.available && hasSellableVariant,
    hidden: record.hidden,
    stock: totalStock,
    featured: record.featured,
    newArrival: record.newArrival,
    tags: Array.from(new Set(record.tags.map((tag) => tag.trim()).filter(Boolean))),
    swatch,
    images: trimmedImages,
    featuredImage,
    options: [
      { name: "Talla", values: sizes },
      { name: "Color", values: colors.map((color) => color.name) },
    ],
    variants,
    createdAt: existing?.createdAt ?? record.createdAt ?? new Date().toISOString(),
    sizes,
    colors,
    salePrice: productCompareAtPrice ? productPrice : null,
  } satisfies Product;
}

export async function listCatalogProductsInternal() {
  const db = await getDatabase();
  if (!db) {
    return listMemoryProducts();
  }

  await ensureCatalogStorageReady(db);
  const rows = await db
    .prepare(`
      SELECT
        id,
        slug,
        name,
        description,
        department,
        primary_category,
        is_nsfw,
        is_active,
        hidden,
        featured,
        new_arrival,
        price_cents,
        compare_at_price_cents,
        currency_code,
        stock,
        product_json,
        sort_order,
        created_at,
        updated_at
      FROM products
      ORDER BY sort_order ASC, created_at ASC, name ASC
    `)
    .all<ProductRow>();

  return (rows.results ?? []).map(productFromRow).filter((product) => product.vibe !== "pulpina");
}

export async function listStorefrontCatalogProductsInternal() {
  const [products, discounts] = await Promise.all([
    listCatalogProductsInternal(),
    listActiveDiscountsInternal(),
  ]);

  return applyDiscountsToProducts(products, discounts);
}

export async function getCatalogProductBySlugInternal(slug: string) {
  const products = await listCatalogProductsInternal();
  return products.find((product) => product.slug === slug) ?? null;
}

export async function getCatalogVariantByIdInternal(variantId: string) {
  const products = await listStorefrontCatalogProductsInternal();
  for (const product of products) {
    const variant = product.variants.find((candidate) => candidate.id === variantId);
    if (variant) {
      return {
        product,
        variant,
      };
    }
  }
  return null;
}

export async function saveCatalogProductInternal(record: AdminProductRecord) {
  const currentProducts = await listCatalogProductsInternal();
  const existing = currentProducts.find((product) => product.id === record.id);
  const normalized = normalizeProduct(record, existing);
  const db = await getDatabase();

  if (!db) {
    return saveMemoryProduct(normalized);
  }

  await ensureCatalogStorageReady(db);
  const index = existing
    ? currentProducts.findIndex((product) => product.id === existing.id)
    : currentProducts.length;
  const categories = normalized.categories?.length ? normalized.categories : [normalized.category];
  const isNsfw = categories.some((category) => ["lingerie", "kinkwear", "sex-toys"].includes(category));
  const now = new Date().toISOString();

  await db
    .prepare(`
      INSERT INTO products (
        id,
        slug,
        name,
        description,
        department,
        primary_category,
        is_nsfw,
        is_active,
        hidden,
        featured,
        new_arrival,
        price_cents,
        compare_at_price_cents,
        currency_code,
        stock,
        product_json,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        slug = excluded.slug,
        name = excluded.name,
        description = excluded.description,
        department = excluded.department,
        primary_category = excluded.primary_category,
        is_nsfw = excluded.is_nsfw,
        is_active = excluded.is_active,
        hidden = excluded.hidden,
        featured = excluded.featured,
        new_arrival = excluded.new_arrival,
        price_cents = excluded.price_cents,
        compare_at_price_cents = excluded.compare_at_price_cents,
        currency_code = excluded.currency_code,
        stock = excluded.stock,
        product_json = excluded.product_json,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `)
    .bind(
      normalized.id,
      normalized.slug,
      normalized.name,
      normalized.description,
      normalized.vibe,
      normalized.category,
      isNsfw ? 1 : 0,
      normalized.available ? 1 : 0,
      normalized.hidden ? 1 : 0,
      normalized.featured ? 1 : 0,
      normalized.newArrival ? 1 : 0,
      toCents(normalized.price),
      normalized.compareAtPrice ? toCents(normalized.compareAtPrice) : null,
      normalized.currencyCode,
      normalized.stock,
      JSON.stringify(normalized),
      normalized.sortOrder ?? index,
      existing?.createdAt ?? normalized.createdAt,
      now,
    )
    .run();

  return normalized;
}

export async function deleteCatalogProductInternal(id: string) {
  const normalizedId = id.trim();
  const db = await getDatabase();

  if (!db) {
    deleteMemoryProduct(normalizedId);
    return { success: true };
  }

  await ensureCatalogStorageReady(db);
  await db.prepare("DELETE FROM products WHERE id = ?").bind(normalizedId).run();
  return { success: true };
}

export async function adjustCatalogVariantInventoryInternal(
  changes: Array<{ delta: number; variantId: string }>,
) {
  if (changes.length === 0) {
    return;
  }

  const products = await listCatalogProductsInternal();
  const touched = new Map<string, Product>();

  for (const change of changes) {
    const product = products.find((candidate) =>
      candidate.variants.some((variant) => variant.id === change.variantId),
    );

    if (!product) continue;

    const currentProduct = touched.get(product.id) ?? cloneProduct(product);
    currentProduct.variants = currentProduct.variants.map((variant) => {
      if (variant.id !== change.variantId) {
        return variant;
      }

      const currentQuantity = Math.max(0, variant.quantityAvailable ?? 0);
      const nextQuantity = Math.max(0, currentQuantity + change.delta);
      return {
        ...variant,
        quantityAvailable: nextQuantity,
        available: nextQuantity > 0 ? true : false,
      };
    });
    currentProduct.stock = currentProduct.variants.reduce(
      (sum, variant) => sum + Math.max(0, variant.quantityAvailable ?? 0),
      0,
    );
    currentProduct.available = currentProduct.variants.some(
      (variant) => variant.available && (variant.quantityAvailable ?? 0) > 0,
    );
    touched.set(product.id, currentProduct);
  }

  await Promise.all(
    Array.from(touched.values()).map((product) =>
      saveCatalogProductInternal(toAdminProductRecord(product)),
    ),
  );
}

export const getStorefrontCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "public, max-age=60");

  const products = await listStorefrontCatalogProductsInternal();
  return products.filter((product) => !product.hidden);
});

export const getStorefrontProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().trim().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "public, max-age=60");

    const products = await listStorefrontCatalogProductsInternal();
    const product = products.find((candidate) => candidate.slug === data.slug) ?? null;
    if (!product || product.hidden) {
      return null;
    }

    return product;
  });

export const getAdminCatalogProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();

  setResponseHeader("Cache-Control", "private, no-store");

  const products = await listCatalogProductsInternal();
  return products.map(toAdminProductRecord);
});

export const saveAdminCatalogProduct = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof adminProductSchema>) => adminProductSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();

    setResponseHeader("Cache-Control", "private, no-store");

    const savedProduct = await saveCatalogProductInternal(data);
    return toAdminProductRecord(savedProduct);
  });

export const deleteAdminCatalogProduct = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof deleteProductSchema>) => deleteProductSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();

    setResponseHeader("Cache-Control", "private, no-store");

    return deleteCatalogProductInternal(data.id);
  });
