import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getStorefrontSettingsInternal } from "@/lib/admin-content";
import { ADMIN_INQUIRIES } from "@/lib/admin-service";
import { enforceAdminAccess } from "@/lib/admin-access";
import { formatPrice, isStorefrontVisible } from "@/data/products";
import { adjustCatalogVariantInventoryInternal, getCatalogVariantByIdInternal } from "@/lib/catalog";
import { verifyTurnstileToken } from "@/lib/turnstile";
import type { AdminInquiryChannel, AdminInquiryRecord, AdminInquiryStatus } from "@/lib/admin-types";

const ORDER_SEQUENCE_KEY = "manual_orders";
const ORDER_PREFIX = "PUL-";
const CONTACT_CHANNELS = ["formulario", "whatsapp", "instagram", "email"] as const;
const ORDER_STATUSES = ["new", "follow_up", "quoted", "closed", "cancelled"] as const;
const FULFILLMENT_METHODS = ["pickup", "delivery"] as const;

const shippingAddressSchema = z.object({
  line1: z.string().trim().max(160).default(""),
  city: z.string().trim().max(120).default(""),
  province: z.string().trim().max(120).default(""),
});

const manualOrderLineSchema = z.object({
  quantity: z.number().int().min(1).max(99),
  variantId: z.string().trim().min(1),
});

const manualOrderSchema = z.object({
  customerEmail: z.string().trim().email(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  fulfillmentMethod: z.enum(FULFILLMENT_METHODS).default("pickup"),
  lines: z.array(manualOrderLineSchema).min(1),
  notes: z.string().trim().max(1200).optional().default(""),
  shipping: z.number().min(0).max(999999).default(0),
  shippingAddress: shippingAddressSchema.default({ line1: "", city: "", province: "" }),
  turnstileToken: z.string().trim().min(1),
});

const adminOrderUpdateSchema = z.object({
  channel: z.enum(CONTACT_CHANNELS),
  customerEmail: z.string().trim().email(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  discount: z.number().min(0).max(999999).default(0),
  fulfillmentMethod: z.enum(FULFILLMENT_METHODS).default("pickup"),
  id: z.string().trim().min(1),
  lines: z.array(manualOrderLineSchema).min(1),
  notes: z.string().trim().max(4000),
  paymentStatus: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  shipping: z.number().min(0).max(999999).default(0),
  shippingAddress: shippingAddressSchema.default({ line1: "", city: "", province: "" }),
  status: z.enum(ORDER_STATUSES),
});

const adminOrderDeleteSchema = z.object({
  id: z.string().trim().min(1),
});

const adminManualOrderSchema = z.object({
  channel: z.enum(CONTACT_CHANNELS).default("whatsapp"),
  customerEmail: z.string().trim().email(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  discount: z.number().min(0).max(999999).default(0),
  fulfillmentMethod: z.enum(FULFILLMENT_METHODS).default("pickup"),
  lines: z.array(manualOrderLineSchema).min(1),
  notes: z.string().trim().max(1200).optional().default(""),
  paymentStatus: z.enum(["pending", "confirmed", "cancelled"]).default("pending"),
  sendEmails: z.boolean().default(true),
  shipping: z.number().min(0).max(999999).default(0),
  shippingAddress: shippingAddressSchema.default({ line1: "", city: "", province: "" }),
  status: z.enum(ORDER_STATUSES).default("new"),
});

type ManualOrderInput = z.infer<typeof manualOrderSchema>;
type AdminManualOrderInput = z.infer<typeof adminManualOrderSchema>;
type OrderWriteInput = {
  channel?: AdminInquiryChannel;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  discount?: number;
  fulfillmentMethod?: AdminInquiryRecord["fulfillmentMethod"];
  notes: string;
  paymentStatus?: AdminInquiryRecord["paymentStatus"];
  sendEmails?: boolean;
  shipping?: number;
  shippingAddress?: AdminInquiryRecord["shippingAddress"];
  status?: AdminInquiryStatus;
};
type CanonicalManualOrderLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  variantId: string;
  variantLabel: string;
};

type WorkerEnv = {
  DB?: D1Database;
  ORDER_NOTIFICATION_EMAIL?: string;
  PUBLIC_SUPPORT_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

type OrderEmailState = {
  configured: boolean;
  customerSent: boolean;
  teamSent: boolean;
};

type InquiryRow = {
  channel: string;
  created_at: string;
  customer_email: string;
  customer_name: string | null;
  customer_phone: string | null;
  discount_cents: number;
  fulfillment_method: string | null;
  id: string;
  items_json: string | null;
  notes: string | null;
  payment_status: string | null;
  request_number: string;
  shipping_city: string | null;
  shipping_cents: number;
  shipping_line1: string | null;
  shipping_province: string | null;
  status: string;
  subtotal_cents: number;
  total_cents: number;
};

const memoryOrders = new Map<string, AdminInquiryRecord>();
let memorySequence = -1;
let orderStorageReadyPromise: Promise<void> | null = null;

function parseOrderSequence(requestNumber: string) {
  if (!requestNumber.startsWith(ORDER_PREFIX)) return -1;
  const raw = requestNumber.slice(ORDER_PREFIX.length);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : -1;
}

function getMockOrders() {
  return ADMIN_INQUIRIES.map(cloneInquiry);
}

function cloneInquiry(inquiry: AdminInquiryRecord): AdminInquiryRecord {
  return {
    ...inquiry,
    adminTags: [...inquiry.adminTags],
    shippingAddress: { ...inquiry.shippingAddress },
    lines: inquiry.lines.map((line) => ({ ...line })),
  };
}

function formatOrderNumber(sequence: number) {
  return `${ORDER_PREFIX}${String(sequence).padStart(6, "0")}`;
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

function fromCents(amount: number) {
  return amount / 100;
}

function serializeRecordLines(lines: AdminInquiryRecord["lines"]) {
  return JSON.stringify(
    lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceCents: toCents(line.unitPrice),
      variantId: "",
      variantLabel: line.variantLabel,
    })),
  );
}

function serializeInquiryLines(lines: CanonicalManualOrderLine[]) {
  return JSON.stringify(
    lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitPriceCents: toCents(line.unitPrice),
      variantId: line.variantId,
      variantLabel: line.variantLabel,
    })),
  );
}

function deserializeInquiryLines(raw: string | null | undefined) {
  if (!raw) return [] as CanonicalManualOrderLine[];

  try {
    const parsed = JSON.parse(raw) as Array<{
      productId?: string;
      productName?: string;
      quantity?: number;
      unitPriceCents?: number;
      variantId?: string;
      variantLabel?: string;
    }>;

    return parsed
      .filter((line) =>
        typeof line.productId === "string" &&
        typeof line.productName === "string" &&
        typeof line.quantity === "number" &&
        typeof line.unitPriceCents === "number",
      )
      .map((line) => ({
        productId: line.productId!,
        productName: line.productName!,
        quantity: line.quantity!,
        unitPrice: fromCents(line.unitPriceCents!),
        variantId: typeof line.variantId === "string" ? line.variantId : "",
        variantLabel: typeof line.variantLabel === "string" ? line.variantLabel : "Default",
      }));
  } catch {
    return [] as CanonicalManualOrderLine[];
  }
}

function normalizeOrderStatus(status: string): AdminInquiryStatus {
  return ORDER_STATUSES.includes(status as AdminInquiryStatus)
    ? (status as AdminInquiryStatus)
    : "new";
}

function normalizeOrderChannel(channel: string): AdminInquiryChannel {
  return CONTACT_CHANNELS.includes(channel as AdminInquiryChannel)
    ? (channel as AdminInquiryChannel)
    : "formulario";
}

function normalizeFulfillmentMethod(method: string | null | undefined): AdminInquiryRecord["fulfillmentMethod"] {
  return method === "delivery" ? "delivery" : "pickup";
}

function ensureMemoryOrdersSeeded() {
  if (memoryOrders.size > 0 || memorySequence >= 0) return;

  for (const inquiry of getMockOrders()) {
    memoryOrders.set(inquiry.id, cloneInquiry(inquiry));
    memorySequence = Math.max(memorySequence, parseOrderSequence(inquiry.requestNumber));
  }
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

function shouldAllowMemoryOrders() {
  return import.meta.env.DEV;
}

async function getEmailConfig() {
  const workerEnv = await getWorkerEnv();
  return {
    apiKey: workerEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? "",
    from: workerEnv.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "",
    supportEmail:
      workerEnv.ORDER_NOTIFICATION_EMAIL ??
      process.env.ORDER_NOTIFICATION_EMAIL ??
      workerEnv.PUBLIC_SUPPORT_EMAIL ??
      process.env.PUBLIC_SUPPORT_EMAIL ??
      (await getStorefrontSettingsInternal()).supportEmail,
  };
}

async function buildCanonicalLines(lines: ManualOrderInput["lines"]) {
  const consolidated = new Map<string, number>();

  for (const line of lines) {
    consolidated.set(line.variantId, (consolidated.get(line.variantId) ?? 0) + line.quantity);
  }

  const resolved = await Promise.all(
    Array.from(consolidated.entries()).map(async ([variantId, quantity]) => ({
      canonical: await getCatalogVariantByIdInternal(variantId),
      quantity,
    })),
  );

  return resolved.map(({ canonical, quantity }) => {
    if (!canonical) {
      throw new Error("Uno de los productos ya no existe.");
    }

    if (!isStorefrontVisible(canonical.product) || !canonical.product.available || !canonical.variant.available) {
      throw new Error(`El producto ${canonical.product.name} ya no esta disponible.`);
    }

    return {
      productId: canonical.product.id,
      productName: canonical.product.name,
      quantity,
      unitPrice: canonical.variant.price,
      variantId: canonical.variant.id,
      variantLabel: canonical.variant.title,
    } satisfies CanonicalManualOrderLine;
  });
}

function buildInquiryRecord(input: {
  channel?: AdminInquiryChannel;
  createdAt?: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  discount?: number;
  fulfillmentMethod?: AdminInquiryRecord["fulfillmentMethod"];
  id: string;
  lines: CanonicalManualOrderLine[];
  notes: string;
  paymentStatus?: AdminInquiryRecord["paymentStatus"];
  requestNumber: string;
  shipping?: number;
  shippingAddress?: AdminInquiryRecord["shippingAddress"];
  status?: AdminInquiryStatus;
}) {
  const shipping = input.shipping ?? 0;
  const discount = input.discount ?? 0;
  const subtotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  return {
    id: input.id,
    requestNumber: input.requestNumber,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    status: input.status ?? "new",
    channel: input.channel ?? "formulario",
    fulfillmentMethod: input.fulfillmentMethod ?? "pickup",
    subtotal,
    shipping,
    discount,
    total: Math.max(0, subtotal + shipping - discount),
    createdAt: input.createdAt ?? new Date().toISOString(),
    notes: input.notes,
    paymentStatus: input.paymentStatus ?? "pending",
    externalReference: "",
    adminTags: [],
    shippingAddress: {
      line1: input.shippingAddress?.line1?.trim() ?? "",
      city: input.shippingAddress?.city?.trim() ?? "",
      province: input.shippingAddress?.province?.trim() ?? "",
    },
    lines: input.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      variantId: line.variantId,
      variantLabel: line.variantLabel,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
  } satisfies AdminInquiryRecord;
}

async function ensureOrderStorageReady(db: D1Database) {
  if (!orderStorageReadyPromise) {
    orderStorageReadyPromise = (async () => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS inquiries (
          id TEXT PRIMARY KEY,
          request_number TEXT NOT NULL UNIQUE,
          customer_id TEXT,
          customer_email TEXT NOT NULL,
          customer_name TEXT,
          customer_phone TEXT,
          status TEXT NOT NULL DEFAULT 'new',
          channel TEXT NOT NULL,
          fulfillment_method TEXT NOT NULL DEFAULT 'pickup',
          subtotal_cents INTEGER NOT NULL,
          shipping_cents INTEGER NOT NULL DEFAULT 0,
          discount_cents INTEGER NOT NULL DEFAULT 0,
          total_cents INTEGER NOT NULL,
          currency_code TEXT NOT NULL DEFAULT 'DOP',
          payment_status TEXT NOT NULL DEFAULT 'pending',
          shipping_line1 TEXT,
          shipping_city TEXT,
          shipping_province TEXT,
          notes TEXT,
          items_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS order_sequences (
          key TEXT PRIMARY KEY,
          current_value INTEGER NOT NULL DEFAULT -1,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        await db.exec(`ALTER TABLE inquiries ADD COLUMN items_json TEXT NOT NULL DEFAULT '[]';`);
      } catch {
        // Existing databases already migrated or created with the new schema.
      }
      for (const statement of [
        "ALTER TABLE inquiries ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';",
        "ALTER TABLE inquiries ADD COLUMN fulfillment_method TEXT NOT NULL DEFAULT 'pickup';",
        "ALTER TABLE inquiries ADD COLUMN shipping_line1 TEXT;",
        "ALTER TABLE inquiries ADD COLUMN shipping_city TEXT;",
        "ALTER TABLE inquiries ADD COLUMN shipping_province TEXT;",
      ]) {
        try {
          await db.exec(statement);
        } catch {
          // Existing databases already migrated or created with the new schema.
        }
      }

      await db
        .prepare(
          `
            INSERT INTO order_sequences (key, current_value)
            VALUES (?, -1)
            ON CONFLICT(key) DO NOTHING
          `,
        )
        .bind(ORDER_SEQUENCE_KEY)
        .run();

      const countRow = await db.prepare("SELECT COUNT(*) AS count FROM inquiries").first<{ count: number }>();
      if ((countRow?.count ?? 0) === 0) {
        const seedOrders = getMockOrders();
        const insertInquiry = db.prepare(`
          INSERT INTO inquiries (
            id,
            request_number,
            customer_email,
            customer_name,
            customer_phone,
            status,
            channel,
            fulfillment_method,
            subtotal_cents,
            shipping_cents,
            discount_cents,
            total_cents,
            currency_code,
            payment_status,
            shipping_line1,
            shipping_city,
            shipping_province,
            notes,
            items_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DOP', ?, ?, ?, ?, ?, ?)
        `);

        await db.batch(
          seedOrders.map((order) =>
            insertInquiry.bind(
              order.id,
              order.requestNumber,
              order.customerEmail,
              order.customerName,
              order.customerPhone,
              order.status,
              order.channel,
              order.fulfillmentMethod,
              toCents(order.subtotal),
              toCents(order.shipping),
              toCents(order.discount),
              toCents(order.total),
              order.paymentStatus,
              order.shippingAddress.line1,
              order.shippingAddress.city,
              order.shippingAddress.province,
              order.notes,
              serializeRecordLines(order.lines),
              order.createdAt,
            ),
          ),
        );

        const maxSequence = seedOrders.reduce(
          (max, order) => Math.max(max, parseOrderSequence(order.requestNumber)),
          -1,
        );

        await db
          .prepare(`
            UPDATE order_sequences
            SET current_value = ?, updated_at = CURRENT_TIMESTAMP
            WHERE key = ?
          `)
          .bind(maxSequence, ORDER_SEQUENCE_KEY)
          .run();
      }
    })().catch((error) => {
      orderStorageReadyPromise = null;
      throw error;
    });
  }

  return orderStorageReadyPromise;
}

async function getNextOrderNumber(db: D1Database) {
  await ensureOrderStorageReady(db);

  const row = await db
    .prepare(
      `
        UPDATE order_sequences
        SET current_value = current_value + 1, updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
        RETURNING current_value
      `,
    )
    .bind(ORDER_SEQUENCE_KEY)
    .first<{ current_value: number }>();

  if (!row) {
    throw new Error("No se pudo generar el numero de orden.");
  }

  return formatOrderNumber(row.current_value);
}

async function createOrderInDatabase(input: OrderWriteInput, lines: CanonicalManualOrderLine[]) {
  const db = await getDatabase();
  if (!db) {
    return null;
  }

  await ensureOrderStorageReady(db);
  const id = crypto.randomUUID();
  const requestNumber = await getNextOrderNumber(db);
  const record = buildInquiryRecord({
    channel: input.channel,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    discount: input.discount,
    fulfillmentMethod: input.fulfillmentMethod,
    id,
    lines,
    notes: input.notes,
    paymentStatus: input.paymentStatus,
    requestNumber,
    shipping: input.shipping,
    shippingAddress: input.shippingAddress,
    status: input.status,
  });

  await db
    .prepare(
      `
        INSERT INTO inquiries (
          id,
          request_number,
          customer_email,
          customer_name,
          customer_phone,
          status,
          channel,
          fulfillment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          total_cents,
          currency_code,
          payment_status,
          shipping_line1,
          shipping_city,
          shipping_province,
          notes,
          items_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DOP', ?, ?, ?, ?, ?, ?)
      `,
    )
    .bind(
      record.id,
      record.requestNumber,
      record.customerEmail,
      record.customerName,
      record.customerPhone,
      record.status,
      record.channel,
      record.fulfillmentMethod,
      toCents(record.subtotal),
      toCents(record.shipping),
      toCents(record.discount),
      toCents(record.total),
      record.paymentStatus,
      record.shippingAddress.line1,
      record.shippingAddress.city,
      record.shippingAddress.province,
      record.notes,
      serializeInquiryLines(lines),
    )
    .run();

  if (record.status === "closed") {
    await adjustCatalogVariantInventoryInternal(
      record.lines.map((line) => ({ delta: -line.quantity, variantId: line.variantId })),
    );
  }

  return record;
}

function createOrderInMemory(input: OrderWriteInput, lines: CanonicalManualOrderLine[]) {
  ensureMemoryOrdersSeeded();
  memorySequence += 1;
  const record = buildInquiryRecord({
    channel: input.channel,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    discount: input.discount,
    fulfillmentMethod: input.fulfillmentMethod,
    id: crypto.randomUUID(),
    lines,
    notes: input.notes,
    paymentStatus: input.paymentStatus,
    requestNumber: formatOrderNumber(memorySequence),
    shipping: input.shipping,
    shippingAddress: input.shippingAddress,
    status: input.status,
  });

  memoryOrders.set(record.id, cloneInquiry(record));
  return record;
}

async function listOrdersFromDatabase() {
  const db = await getDatabase();
  if (!db) {
    return null;
  }

  await ensureOrderStorageReady(db);
  const inquiriesResult = await db
    .prepare(
      `
        SELECT
          id,
          request_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          channel,
          fulfillment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          total_cents,
          payment_status,
          shipping_line1,
          shipping_city,
          shipping_province,
          notes,
          items_json,
          created_at
        FROM inquiries
        ORDER BY created_at DESC, request_number DESC
      `,
    )
    .all<InquiryRow>();

  return (inquiriesResult.results ?? []).map((row) =>
    buildInquiryRecord({
      channel: normalizeOrderChannel(row.channel),
      createdAt: row.created_at,
      customerEmail: row.customer_email,
      customerName: row.customer_name ?? "",
      customerPhone: row.customer_phone ?? "",
      discount: fromCents(row.discount_cents),
      fulfillmentMethod: normalizeFulfillmentMethod(row.fulfillment_method),
      id: row.id,
      lines: deserializeInquiryLines(row.items_json),
      notes: row.notes ?? "",
      paymentStatus:
        row.payment_status === "confirmed" || row.payment_status === "cancelled"
          ? row.payment_status
          : "pending",
      requestNumber: row.request_number,
      shipping: fromCents(row.shipping_cents),
      shippingAddress: {
        line1: row.shipping_line1 ?? "",
        city: row.shipping_city ?? "",
        province: row.shipping_province ?? "",
      },
      status: normalizeOrderStatus(row.status),
    }),
  );
}

async function listOrdersInternal() {
  const databaseOrders = await listOrdersFromDatabase();
  if (databaseOrders) {
    return databaseOrders;
  }

  ensureMemoryOrdersSeeded();
  return Array.from(memoryOrders.values())
    .map(cloneInquiry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.requestNumber.localeCompare(a.requestNumber));
}

function buildOrderInventoryImpact(lines: AdminInquiryRecord["lines"], status: AdminInquiryStatus) {
  if (status !== "closed") {
    return new Map<string, number>();
  }

  const impact = new Map<string, number>();
  for (const line of lines) {
    impact.set(line.variantId, (impact.get(line.variantId) ?? 0) + line.quantity);
  }
  return impact;
}

async function updateOrderInternal(input: z.infer<typeof adminOrderUpdateSchema>) {
  const canonicalLines = await buildCanonicalLines(input.lines);
  const db = await getDatabase();
  if (!db) {
    const current = memoryOrders.get(input.id);
    if (!current) {
      throw new Error("La orden no existe.");
    }

    const next = cloneInquiry({
      ...buildInquiryRecord({
        channel: input.channel,
        createdAt: current.createdAt,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        discount: input.discount,
        fulfillmentMethod: input.fulfillmentMethod,
        id: current.id,
        lines: canonicalLines,
        notes: input.notes,
        paymentStatus: input.paymentStatus,
        requestNumber: current.requestNumber,
        shipping: input.shipping,
        shippingAddress: input.shippingAddress,
        status: input.status,
      }),
    });

    memoryOrders.set(input.id, next);
    return next;
  }

  await ensureOrderStorageReady(db);
  const existing = await db
    .prepare(
      `
        SELECT
          id,
          request_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          channel,
          fulfillment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          total_cents,
          payment_status,
          shipping_line1,
          shipping_city,
          shipping_province,
          notes,
          items_json,
          created_at
        FROM inquiries
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(input.id)
    .first<InquiryRow>();

  if (!existing) {
    throw new Error("La orden no existe.");
  }

  const shipping = fromCents(existing.shipping_cents);
  const nextRecord = buildInquiryRecord({
    channel: input.channel,
    createdAt: existing.created_at,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    discount: input.discount,
    fulfillmentMethod: input.fulfillmentMethod,
    id: existing.id,
    lines: canonicalLines,
    notes: input.notes,
    paymentStatus: input.paymentStatus,
    requestNumber: existing.request_number,
    shipping: input.shipping ?? shipping,
    shippingAddress: input.shippingAddress,
    status: input.status,
  });

  const previousRecord = buildInquiryRecord({
    channel: normalizeOrderChannel(existing.channel),
    createdAt: existing.created_at,
    customerEmail: existing.customer_email,
    customerName: existing.customer_name ?? "",
    customerPhone: existing.customer_phone ?? "",
    discount: fromCents(existing.discount_cents),
    fulfillmentMethod: normalizeFulfillmentMethod(existing.fulfillment_method),
    id: existing.id,
    lines: deserializeInquiryLines(existing.items_json),
    notes: existing.notes ?? "",
    paymentStatus:
      existing.payment_status === "confirmed" || existing.payment_status === "cancelled"
        ? existing.payment_status
        : "pending",
    requestNumber: existing.request_number,
    shipping,
    shippingAddress: {
      line1: existing.shipping_line1 ?? "",
      city: existing.shipping_city ?? "",
      province: existing.shipping_province ?? "",
    },
    status: normalizeOrderStatus(existing.status),
  });

  await db
    .prepare(
      `
        UPDATE inquiries
        SET
          customer_name = ?,
          customer_email = ?,
          customer_phone = ?,
          status = ?,
          channel = ?,
          fulfillment_method = ?,
          subtotal_cents = ?,
          shipping_cents = ?,
          discount_cents = ?,
          total_cents = ?,
          payment_status = ?,
          shipping_line1 = ?,
          shipping_city = ?,
          shipping_province = ?,
          notes = ?,
          items_json = ?
        WHERE id = ?
      `,
    )
    .bind(
      input.customerName,
      input.customerEmail,
      input.customerPhone,
      input.status,
      input.channel,
      nextRecord.fulfillmentMethod,
      toCents(nextRecord.subtotal),
      toCents(nextRecord.shipping),
      toCents(nextRecord.discount),
      toCents(nextRecord.total),
      nextRecord.paymentStatus,
      nextRecord.shippingAddress.line1,
      nextRecord.shippingAddress.city,
      nextRecord.shippingAddress.province,
      input.notes,
      serializeInquiryLines(canonicalLines),
      input.id,
    )
    .run();

  const previousImpact = buildOrderInventoryImpact(previousRecord.lines, previousRecord.status);
  const nextImpact = buildOrderInventoryImpact(nextRecord.lines, nextRecord.status);
  const variantIds = new Set([...previousImpact.keys(), ...nextImpact.keys()]);
  await adjustCatalogVariantInventoryInternal(
    Array.from(variantIds)
      .map((variantId) => ({
        delta: (previousImpact.get(variantId) ?? 0) - (nextImpact.get(variantId) ?? 0),
        variantId,
      }))
      .filter((change) => change.delta !== 0),
  );

  const orders = await listOrdersInternal();
  const updated = orders.find((order) => order.id === input.id);
  if (!updated) {
    throw new Error("La orden se actualizo pero no se pudo recargar.");
  }

  return updated;
}

async function getAdminOrderSnapshotInternal(limit = 4) {
  const db = await getDatabase();
  if (!db) {
    const inquiries = Array.from(memoryOrders.values()).map(cloneInquiry);
    return {
      inquiryCount: inquiries.length,
      openInquiryCount: inquiries.filter((inquiry) => inquiry.status !== "closed" && inquiry.status !== "cancelled").length,
      recentInquiries: inquiries
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.requestNumber.localeCompare(a.requestNumber))
        .slice(0, limit),
    };
  }

  await ensureOrderStorageReady(db);

  const counts = await db
    .prepare(
      `
        SELECT
          COUNT(*) AS inquiry_count,
          SUM(CASE WHEN status NOT IN ('closed', 'cancelled') THEN 1 ELSE 0 END) AS open_inquiry_count
        FROM inquiries
      `,
    )
    .first<{ inquiry_count: number; open_inquiry_count: number | null }>();

  const recent = await db
    .prepare(
      `
        SELECT
          id,
          request_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          channel,
          fulfillment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          total_cents,
          payment_status,
          shipping_line1,
          shipping_city,
          shipping_province,
          notes,
          items_json,
          created_at
        FROM inquiries
        ORDER BY created_at DESC, request_number DESC
        LIMIT ?
      `,
    )
    .bind(limit)
    .all<InquiryRow>();

  return {
    inquiryCount: counts?.inquiry_count ?? 0,
    openInquiryCount: counts?.open_inquiry_count ?? 0,
    recentInquiries: (recent.results ?? []).map((row) =>
      buildInquiryRecord({
        channel: normalizeOrderChannel(row.channel),
        createdAt: row.created_at,
        customerEmail: row.customer_email,
        customerName: row.customer_name ?? "",
        customerPhone: row.customer_phone ?? "",
        discount: fromCents(row.discount_cents),
        fulfillmentMethod: normalizeFulfillmentMethod(row.fulfillment_method),
        id: row.id,
        lines: deserializeInquiryLines(row.items_json),
        notes: row.notes ?? "",
        paymentStatus:
          row.payment_status === "confirmed" || row.payment_status === "cancelled"
            ? row.payment_status
            : "pending",
        requestNumber: row.request_number,
        shipping: fromCents(row.shipping_cents),
        shippingAddress: {
          line1: row.shipping_line1 ?? "",
          city: row.shipping_city ?? "",
          province: row.shipping_province ?? "",
        },
        status: normalizeOrderStatus(row.status),
      }),
    ),
  };
}

async function deleteOrderInternal(id: string) {
  const normalizedId = id.trim();
  const db = await getDatabase();

  if (!db) {
    const current = memoryOrders.get(normalizedId);
    if (!current) {
      throw new Error("La orden no existe.");
    }

    const inventoryImpact = buildOrderInventoryImpact(current.lines, current.status);
    await adjustCatalogVariantInventoryInternal(
      Array.from(inventoryImpact.entries()).map(([variantId, quantity]) => ({
        delta: quantity,
        variantId,
      })),
    );

    memoryOrders.delete(normalizedId);
    return { success: true };
  }

  await ensureOrderStorageReady(db);
  const existing = await db
    .prepare(
      `
        SELECT
          id,
          request_number,
          customer_name,
          customer_email,
          customer_phone,
          status,
          channel,
          fulfillment_method,
          subtotal_cents,
          shipping_cents,
          discount_cents,
          total_cents,
          payment_status,
          shipping_line1,
          shipping_city,
          shipping_province,
          notes,
          items_json,
          created_at
        FROM inquiries
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(normalizedId)
    .first<InquiryRow>();

  if (!existing) {
    throw new Error("La orden no existe.");
  }

  const record = buildInquiryRecord({
    channel: normalizeOrderChannel(existing.channel),
    createdAt: existing.created_at,
    customerEmail: existing.customer_email,
    customerName: existing.customer_name ?? "",
    customerPhone: existing.customer_phone ?? "",
    discount: fromCents(existing.discount_cents),
    fulfillmentMethod: normalizeFulfillmentMethod(existing.fulfillment_method),
    id: existing.id,
    lines: deserializeInquiryLines(existing.items_json),
    notes: existing.notes ?? "",
    paymentStatus:
      existing.payment_status === "confirmed" || existing.payment_status === "cancelled"
        ? existing.payment_status
        : "pending",
    requestNumber: existing.request_number,
    shipping: fromCents(existing.shipping_cents),
    shippingAddress: {
      line1: existing.shipping_line1 ?? "",
      city: existing.shipping_city ?? "",
      province: existing.shipping_province ?? "",
    },
    status: normalizeOrderStatus(existing.status),
  });

  await db.prepare("DELETE FROM inquiries WHERE id = ?").bind(normalizedId).run();

  const inventoryImpact = buildOrderInventoryImpact(record.lines, record.status);
  await adjustCatalogVariantInventoryInternal(
    Array.from(inventoryImpact.entries()).map(([variantId, quantity]) => ({
      delta: quantity,
      variantId,
    })),
  );

  return { success: true };
}

function buildOrderSummary(record: AdminInquiryRecord) {
  const lines = record.lines.map(
    (line) =>
      `- ${line.productName}${line.variantLabel ? ` (${line.variantLabel})` : ""} x${line.quantity} - ${formatPrice(line.unitPrice * line.quantity)}`,
  );

  return [
    `Pedido ${record.requestNumber}`,
    `Cliente: ${record.customerName}`,
    `Email: ${record.customerEmail}`,
    `WhatsApp o telefono: ${record.customerPhone}`,
    "",
    "Productos:",
    ...lines,
    "",
    `Subtotal de referencia: ${formatPrice(record.subtotal)}`,
    record.discount > 0 ? `Descuento aplicado: -${formatPrice(record.discount)}` : "",
    record.shipping > 0 ? `Envio de referencia: ${formatPrice(record.shipping)}` : "",
    `Total de referencia: ${formatPrice(record.total)}`,
    `Entrega: ${record.fulfillmentMethod === "delivery" ? "Delivery" : "Recoger"}`,
    record.fulfillmentMethod === "delivery" && record.shippingAddress.line1
      ? `Direccion: ${record.shippingAddress.line1}, ${record.shippingAddress.city}, ${record.shippingAddress.province}`
      : "",
    "Siguiente paso: escribe por WhatsApp con tu numero de orden para confirmar disponibilidad, envio y cierre manual.",
    record.notes ? `Notas del cliente: ${record.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendEmailViaResend(input: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  const config = await getEmailConfig();
  if (!config.apiKey || !config.from) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: [input.to],
    }),
  });

  return response.ok;
}

async function sendOrderEmails(record: AdminInquiryRecord): Promise<OrderEmailState> {
  const config = await getEmailConfig();
  const settings = await getStorefrontSettingsInternal();
  if (!config.apiKey || !config.from) {
    return {
      configured: false,
      customerSent: false,
      teamSent: false,
    };
  }

  const summary = buildOrderSummary(record);
  const customerText = [
    `Recibimos tu pedido ${record.requestNumber}.`,
    "",
    "Proximo paso:",
    `Escribenos por WhatsApp al ${settings.whatsappLabel} y comparte este numero de orden para confirmar tu compra.`,
    "",
    summary,
  ].join("\n");

  const teamText = [
    "Nuevo pedido manual recibido.",
    "",
    summary,
  ].join("\n");

  const customerHtml = `
    <p>Recibimos tu pedido <strong>${escapeHtml(record.requestNumber)}</strong>.</p>
    <p>Escribenos por WhatsApp al <strong>${escapeHtml(settings.whatsappLabel)}</strong> y comparte ese numero para confirmar disponibilidad, envio y cierre manual.</p>
    <pre>${escapeHtml(summary)}</pre>
  `;

  const teamHtml = `
    <p>Nuevo pedido manual recibido: <strong>${escapeHtml(record.requestNumber)}</strong></p>
    <pre>${escapeHtml(summary)}</pre>
  `;

  const [customerSent, teamSent] = await Promise.all([
    sendEmailViaResend({
      html: customerHtml,
      subject: `Confirmacion de pedido ${record.requestNumber} - ${settings.businessName}`,
      text: customerText,
      to: record.customerEmail,
    }),
    sendEmailViaResend({
      html: teamHtml,
      subject: `Nuevo pedido manual ${record.requestNumber}`,
      text: teamText,
      to: config.supportEmail,
    }),
  ]);

  return {
    configured: true,
    customerSent,
    teamSent,
  };
}

export const submitManualOrder = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof manualOrderSchema>) => manualOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { getRequestHeader, setResponseHeader } = await import("@tanstack/react-start/server");

    setResponseHeader("Cache-Control", "private, no-store");

    const verification = await verifyTurnstileToken({
      remoteIp: getRequestHeader("cf-connecting-ip"),
      token: data.turnstileToken,
    });

    if (!verification.success) {
      return {
        message: "La verificacion anti-spam fallo. Intentalo otra vez.",
        ok: false as const,
      };
    }

    let canonicalLines: CanonicalManualOrderLine[];
    try {
      canonicalLines = await buildCanonicalLines(data.lines);
    } catch (error) {
      return {
        message: error instanceof Error ? error.message : "No se pudo validar el carrito.",
        ok: false as const,
      };
    }

    const db = await getDatabase();
    if (!db && !shouldAllowMemoryOrders()) {
      return {
        message: "El sistema de pedidos no esta conectado a la base de datos todavia.",
        ok: false as const,
      };
    }

    try {
      const record = db
        ? (await createOrderInDatabase(data, canonicalLines)) ?? createOrderInMemory(data, canonicalLines)
        : createOrderInMemory(data, canonicalLines);
      const emailState = await sendOrderEmails(record);

      return {
        emailState,
        message: emailState.configured
          ? "Pedido creado y correos de confirmacion procesados."
          : "Pedido creado. Falta configurar el proveedor de correo para enviar confirmaciones automaticas.",
        ok: true as const,
        order: {
          createdAt: record.createdAt,
          customerName: record.customerName,
          fulfillmentMethod: record.fulfillmentMethod,
          lines: record.lines.map((line) => ({ ...line })),
          requestNumber: record.requestNumber,
          shipping: record.shipping,
          shippingAddress: { ...record.shippingAddress },
          summary: buildOrderSummary(record),
          total: record.total,
        },
      };
    } catch {
      return {
        message: "No se pudo crear el pedido ahora mismo.",
        ok: false as const,
      };
    }
  });

export const createAdminManualOrder = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof adminManualOrderSchema>) => adminManualOrderSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();

    setResponseHeader("Cache-Control", "private, no-store");

    const lines = await buildCanonicalLines(data.lines);
    const record =
      (await createOrderInDatabase(data, lines)) ??
      createOrderInMemory(data, lines);

    const emailState = data.sendEmails ? await sendOrderEmails(record) : null;

    return {
      ...record,
      emailState,
    };
  });

export const getAdminOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();

  setResponseHeader("Cache-Control", "private, no-store");

  return listOrdersInternal();
});

export const getAdminOrderSnapshot = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();

  setResponseHeader("Cache-Control", "private, no-store");

  return getAdminOrderSnapshotInternal();
});

export const updateAdminOrder = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof adminOrderUpdateSchema>) => adminOrderUpdateSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();

    setResponseHeader("Cache-Control", "private, no-store");

    return updateOrderInternal(data);
  });

export const deleteAdminOrder = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof adminOrderDeleteSchema>) => adminOrderDeleteSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    await enforceAdminAccess();

    setResponseHeader("Cache-Control", "private, no-store");

    return deleteOrderInternal(data.id);
  });
