# Order Confirmation Email Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the internal "new order" notification email and admin-list visibility behind an explicit customer confirmation click that happens inside a redesigned, site-styled invoice email, instead of firing immediately when the order form is submitted.

**Architecture:** Orders created via the public checkout start in a new `pending_contact` status and only get the customer-facing invoice email. A signed link inside that email points at a new same-origin route (`/pedido/confirmar`) intercepted early in `src/server.ts`'s existing custom fetch handler; hitting it with a valid signature flips the order to `new`, fires the internal notification email exactly once, and 302-redirects into WhatsApp. Admin's default order list and dashboard counts exclude `pending_contact` orders, with an explicit filter tab to still see them.

**Tech Stack:** TanStack Start (React 19) + Cloudflare Workers/D1/R2, Zod, Resend (REST API via `fetch`), Web Crypto (`crypto.subtle`) for HMAC signing.

## Global Constraints

- No test runner exists in this repo (`package.json` has no `test` script; no Vitest/Jest config). Do **not** invent one. Verify each task with `pnpm build` (this repo's only automated check — it runs the TypeScript compiler via Vite/tsc) plus the manual verification steps given per task. Do not add a testing framework as part of this plan — that would be unrelated scope creep.
- Product/order money values are plain numbers (pesos, not cents) at the TS layer; D1 storage uses `*_cents` integers via the existing `toCents`/`fromCents` helpers in `src/lib/manual-orders.ts`. Keep using them — do not introduce a second money representation.
- Follow the existing per-file `WorkerEnv` type + `getWorkerEnv()`/`import("cloudflare:workers")` pattern already used in `src/lib/manual-orders.ts`, `src/lib/catalog.ts`, `src/lib/admin-content.ts`, etc. Do not introduce a shared/global env type — this codebase deliberately duplicates a small local type per file.
- Email HTML must use the site's actual palette: cream `#fbf4e8` background, ink `#231717` text/borders, WhatsApp green `#25D366` for the WhatsApp CTA (all three are literal hex values already used elsewhere in this codebase, e.g. `src/routes/solicitud.tsx`). Do **not** reuse the dark/gold gradient style from the existing birthday email in `src/lib/public-forms.ts` — that template is explicitly out of scope and must not change.
- All new/changed server-side strings are in Spanish, matching the rest of the codebase's copy.
- Commit after each task with `pnpm build` passing.

---

### Task 1: Add `pending_contact` status + `contact_confirmed_at` column

**Files:**
- Modify: `src/lib/admin-types.ts:16-21` (`AdminInquiryStatus` union)
- Modify: `src/lib/manual-orders.ts:15` (`ORDER_STATUSES` const), `src/lib/manual-orders.ts:117-137` (`InquiryRow` type), `src/lib/manual-orders.ts:412-464` (`ensureOrderStorageReady` migration block)
- Modify: `src/lib/admin-service.ts:587-595` (`formatAdminInquiryStatus`)

**Interfaces:**
- Produces: `AdminInquiryStatus` now includes `"pending_contact"`. `ORDER_STATUSES` (used by `adminOrderUpdateSchema`'s `z.enum` and `normalizeOrderStatus`) includes `"pending_contact"`. `formatAdminInquiryStatus("pending_contact")` returns `"Pendiente de contacto"`.

- [ ] **Step 1: Add the status to the shared type**

In `src/lib/admin-types.ts`, change:

```ts
export type AdminInquiryStatus =
  | "new"
  | "follow_up"
  | "quoted"
  | "closed"
  | "cancelled";
```

to:

```ts
export type AdminInquiryStatus =
  | "pending_contact"
  | "new"
  | "follow_up"
  | "quoted"
  | "closed"
  | "cancelled";
```

- [ ] **Step 2: Add it to `ORDER_STATUSES` in `src/lib/manual-orders.ts`**

Change line 15 from:

```ts
const ORDER_STATUSES = ["new", "follow_up", "quoted", "closed", "cancelled"] as const;
```

to:

```ts
const ORDER_STATUSES = ["pending_contact", "new", "follow_up", "quoted", "closed", "cancelled"] as const;
```

- [ ] **Step 3: Add `contact_confirmed_at` to the `InquiryRow` type**

In `src/lib/manual-orders.ts`, in the `InquiryRow` type (currently lines 117-137), add one field (keep alphabetical-ish placement consistent with the rest of the type, right after `channel`):

```ts
type InquiryRow = {
  channel: string;
  contact_confirmed_at: string | null;
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
```

- [ ] **Step 4: Add the migration**

In `src/lib/manual-orders.ts`, inside `ensureOrderStorageReady` (around line 452-464), add the new column to the existing `ALTER TABLE` migration loop:

```ts
      for (const statement of [
        "ALTER TABLE inquiries ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';",
        "ALTER TABLE inquiries ADD COLUMN fulfillment_method TEXT NOT NULL DEFAULT 'pickup';",
        "ALTER TABLE inquiries ADD COLUMN shipping_line1 TEXT;",
        "ALTER TABLE inquiries ADD COLUMN shipping_city TEXT;",
        "ALTER TABLE inquiries ADD COLUMN shipping_province TEXT;",
        "ALTER TABLE inquiries ADD COLUMN contact_confirmed_at TEXT;",
      ]) {
```

(This is the only change in that block — just one more string in the array.)

- [ ] **Step 5: Add the Spanish label**

In `src/lib/admin-service.ts`, change `formatAdminInquiryStatus` (currently lines 587-595) to:

```ts
export function formatAdminInquiryStatus(status: AdminInquiryStatus) {
  return {
    pending_contact: "Pendiente de contacto",
    new: "Nueva",
    follow_up: "Seguimiento",
    quoted: "Cotizada",
    closed: "Cerrada",
    cancelled: "Cancelada",
  }[status];
}
```

- [ ] **Step 6: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds with no TypeScript errors (this will surface any other place that exhaustively switches over `AdminInquiryStatus` without a default case — if the build fails on a missing-case error somewhere other than the files above, that file needs the same treatment; add it to this task before moving on).

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin-types.ts src/lib/manual-orders.ts src/lib/admin-service.ts
git commit -m "feat: add pending_contact order status and contact_confirmed_at column"
```

---

### Task 2: Signed order-confirm token helper

**Files:**
- Create: `src/lib/order-confirm-token.ts`

**Interfaces:**
- Produces: `signOrderConfirmToken(orderId: string, secret: string): Promise<string>` and `verifyOrderConfirmToken(orderId: string, token: string, secret: string): Promise<boolean>`. Task 4 consumes both.

- [ ] **Step 1: Write the helper**

```ts
const TOKEN_ENCODER = new TextEncoder();

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    TOKEN_ENCODER.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function signOrderConfirmToken(orderId: string, secret: string) {
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, TOKEN_ENCODER.encode(orderId));
  return toBase64Url(signature);
}

export async function verifyOrderConfirmToken(orderId: string, token: string, secret: string) {
  if (!token) return false;
  const expected = await signOrderConfirmToken(orderId, secret);
  if (expected.length !== token.length) return false;

  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ token.charCodeAt(index);
  }
  return mismatch === 0;
}
```

(The char-code XOR loop in `verifyOrderConfirmToken` is a constant-time comparison — avoids leaking how many leading characters matched via a short-circuiting `===`, same reasoning as any signature-verification code.)

- [ ] **Step 2: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/order-confirm-token.ts
git commit -m "feat: add HMAC signing helper for order confirm links"
```

---

### Task 3: Generate and push the `ORDER_CONFIRM_SECRET`

**Files:** none (infrastructure step, no code changes)

**Interfaces:**
- Produces: a `ORDER_CONFIRM_SECRET` secret on the `tanstack-start-app-production` Worker, and the same value in `.dev.vars` for local dev. Task 4 and Task 5 consume `env.ORDER_CONFIRM_SECRET` / `process.env.ORDER_CONFIRM_SECRET`.

- [ ] **Step 1: Generate a random secret**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
Expected: prints a 64-character hex string. Copy it.

- [ ] **Step 2: Push it to the production Worker**

Run (replacing `<GENERATED_VALUE>` with the string from Step 1):

```bash
printf '%s' '<GENERATED_VALUE>' | npx wrangler secret put ORDER_CONFIRM_SECRET --env production
```

Expected: `✨ Success! Uploaded secret ORDER_CONFIRM_SECRET`

- [ ] **Step 3: Add the same value to `.dev.vars`**

Add a line to `.dev.vars` (gitignored, local-only):

```
ORDER_CONFIRM_SECRET=<GENERATED_VALUE>
```

- [ ] **Step 4: Commit**

`.dev.vars` is gitignored, so there's nothing to commit for this task — it's a manual verification-only step. Confirm with:

```bash
npx wrangler secret list --name tanstack-start-app-production
```

Expected: `ORDER_CONFIRM_SECRET` appears in the JSON list alongside `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY`.

---

### Task 4: Split order emails, gate the internal one, add the confirm handler

**Files:**
- Modify: `src/lib/manual-orders.ts` — imports (line 1-10), `WorkerEnv` type (lines 103-109), `getEmailConfig` (lines 305-315+), `sendEmailViaResend` (lines 1229-1256), `sendOrderEmails` (lines 1258-1316), `submitManualOrder` (lines 1318-1416)

**Interfaces:**
- Consumes: `signOrderConfirmToken`/`verifyOrderConfirmToken` from Task 2 (`@/lib/order-confirm-token`); `listStorefrontCatalogProductsInternal` from `@/lib/catalog` (already exported, just needs importing here); `getStorefrontSettingsInternal` from `@/lib/admin-content` (already imported in this file... check — currently this file does NOT import it directly; `getStorefrontSettingsInternal` is imported in `src/lib/manual-orders.ts`'s existing `sendOrderEmails` via a call — confirm at implementation time and add the import if missing).
- Produces: `sendCustomerInvoiceEmail(record: AdminInquiryRecord): Promise<boolean>`, `sendTeamOrderNotificationEmail(record: AdminInquiryRecord): Promise<boolean>` (both module-private, same visibility as the current `sendEmailViaResend`). `export async function maybeHandleOrderConfirmRequest(request: Request): Promise<Response | null>` — new exported function, `null` if the request doesn't match the confirm route, otherwise a `Response` (redirect). This is what Task 5 imports into `src/server.ts`.

- [ ] **Step 1: Add `ORDER_CONFIRM_SECRET` to this file's `WorkerEnv` type**

Change (lines 103-109):

```ts
type WorkerEnv = {
  DB?: D1Database;
  ORDER_NOTIFICATION_EMAIL?: string;
  PUBLIC_SUPPORT_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};
```

to:

```ts
type WorkerEnv = {
  DB?: D1Database;
  ORDER_CONFIRM_SECRET?: string;
  ORDER_NOTIFICATION_EMAIL?: string;
  PUBLIC_SUPPORT_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};
```

- [ ] **Step 2: Add the import for the token helper and the catalog lookup**

At the top of `src/lib/manual-orders.ts`, add to the existing import block:

```ts
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";
import { listStorefrontCatalogProductsInternal } from "@/lib/catalog";
```

(`adjustCatalogVariantInventoryInternal` and `getCatalogVariantByIdInternal` are already imported from `@/lib/catalog` in this file per the existing `import { adjustCatalogVariantInventoryInternal, getCatalogVariantByIdInternal } from "@/lib/catalog";` line — add `listStorefrontCatalogProductsInternal` into that same import statement rather than a new one.)

- [ ] **Step 3: Add a secret getter alongside `getEmailConfig`**

Right after the existing `getEmailConfig` function, add:

```ts
async function getOrderConfirmSecret() {
  const workerEnv = await getWorkerEnv();
  return workerEnv.ORDER_CONFIRM_SECRET ?? process.env.ORDER_CONFIRM_SECRET ?? "";
}
```

- [ ] **Step 4: Build a variantId → image lookup helper**

Add this near `buildOrderSummary` (the function is used by both new email builders):

```ts
async function buildVariantImageMap(lines: AdminInquiryRecord["lines"]) {
  const products = await listStorefrontCatalogProductsInternal();
  const variantIds = new Set(lines.map((line) => line.variantId));
  const map = new Map<string, { url: string; altText: string | null }>();

  for (const product of products) {
    for (const variant of product.variants) {
      if (!variantIds.has(variant.id)) continue;
      const image = variant.image ?? product.featuredImage;
      if (image) map.set(variant.id, image);
    }
  }

  return map;
}
```

- [ ] **Step 5: Replace `sendOrderEmails` with two separate functions**

Replace the whole current `sendOrderEmails` function (lines 1258-1316) with:

```ts
async function sendCustomerInvoiceEmail(record: AdminInquiryRecord): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config.apiKey || !config.from) return false;

  const settings = await getStorefrontSettingsInternal();
  const secret = await getOrderConfirmSecret();
  const imageMap = await buildVariantImageMap(record.lines);

  const confirmUrl = secret
    ? `https://pulpinastore.com/pedido/confirmar?order=${encodeURIComponent(record.id)}&token=${encodeURIComponent(
        await signOrderConfirmToken(record.id, secret),
      )}`
    : `https://wa.me/${settings.whatsappNumber}`;

  const rows = record.lines
    .map((line) => {
      const image = imageMap.get(line.variantId);
      const imageCell = image
        ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.altText ?? line.productName)}" width="72" height="72" style="width:72px;height:72px;object-fit:cover;border:1px solid #231717;border-radius:12px;display:block" />`
        : `<div style="width:72px;height:72px;border:1px solid #231717;border-radius:12px;background:#f7f2ec"></div>`;

      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(35,23,23,0.12)">${imageCell}</td>
          <td style="padding:12px 16px;border-bottom:1px solid rgba(35,23,23,0.12);color:#231717">
            <div style="font-weight:700">${escapeHtml(line.productName)}</div>
            <div style="font-size:13px;color:#6b5a55">${escapeHtml(line.variantLabel)} &middot; x${line.quantity}</div>
          </td>
          <td style="padding:12px 0;border-bottom:1px solid rgba(35,23,23,0.12);color:#231717;text-align:right;white-space:nowrap">
            ${escapeHtml(formatPrice(line.unitPrice * line.quantity))}
          </td>
        </tr>`;
    })
    .join("");

  const totalsRows = [
    ["Subtotal", formatPrice(record.subtotal)],
    ...(record.discount > 0 ? [["Descuento", `-${formatPrice(record.discount)}`]] : []),
    ...(record.shipping > 0 ? [["Envio", formatPrice(record.shipping)]] : []),
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:4px 0;color:#6b5a55" colspan="2">${label}</td>
          <td style="padding:4px 0;text-align:right;color:#231717">${value}</td>
        </tr>`,
    )
    .join("");

  const html = `
    <div style="background:#fbf4e8;padding:32px 16px;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #231717;border-radius:20px;padding:32px">
        <p style="letter-spacing:.18em;text-transform:uppercase;color:#6b5a55;font-size:12px;margin:0 0 4px">Pulpiña RD</p>
        <h1 style="font-size:26px;margin:0 0 8px;color:#231717">Pedido ${escapeHtml(record.requestNumber)}</h1>
        <p style="font-size:14px;line-height:1.6;color:#231717;margin:0 0 20px">
          Recibimos tu pedido. Para completarlo, confirma por WhatsApp con el boton de abajo.
        </p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          ${totalsRows}
          <tr>
            <td colspan="2" style="padding:10px 0 0;font-weight:700;color:#231717;border-top:1px solid #231717">Total</td>
            <td style="padding:10px 0 0;text-align:right;font-weight:700;color:#231717;border-top:1px solid #231717">${escapeHtml(formatPrice(record.total))}</td>
          </tr>
        </table>
        <div style="text-align:center;margin-top:28px">
          <a href="${confirmUrl}" style="display:inline-block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px;padding:14px 28px;border-radius:999px">
            Confirmar por WhatsApp
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#6b5a55;text-align:center;margin-top:16px">
          Este paso es necesario para confirmar disponibilidad, envio y pago.
        </p>
      </div>
    </div>`;

  const text = [
    `Pedido ${record.requestNumber}`,
    "",
    ...record.lines.map(
      (line) => `- ${line.productName} (${line.variantLabel}) x${line.quantity} - ${formatPrice(line.unitPrice * line.quantity)}`,
    ),
    "",
    `Total: ${formatPrice(record.total)}`,
    "",
    "Confirma por WhatsApp para completar tu pedido:",
    confirmUrl,
  ].join("\n");

  return sendEmailViaResend({
    html,
    subject: `Tu pedido ${record.requestNumber} - ${settings.businessName}`,
    text,
    to: record.customerEmail,
  });
}

async function sendTeamOrderNotificationEmail(record: AdminInquiryRecord): Promise<boolean> {
  const config = await getEmailConfig();
  if (!config.apiKey || !config.from) return false;

  const summary = buildOrderSummary(record);
  const html = `
    <div style="background:#fbf4e8;padding:24px;font-family:Arial,sans-serif;color:#231717">
      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #231717;border-radius:16px;padding:24px">
        <p style="letter-spacing:.18em;text-transform:uppercase;color:#6b5a55;font-size:12px;margin:0 0 4px">Pulpiña RD</p>
        <h1 style="font-size:20px;margin:0 0 12px">Pedido confirmado: ${escapeHtml(record.requestNumber)}</h1>
        <p style="margin:0 0 12px">El cliente confirmo por WhatsApp. Detalle:</p>
        <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:14px;margin:0">${escapeHtml(summary)}</pre>
      </div>
    </div>`;

  return sendEmailViaResend({
    html,
    subject: `Nuevo pedido confirmado ${record.requestNumber}`,
    text: ["Nuevo pedido confirmado por WhatsApp.", "", summary].join("\n"),
    to: config.supportEmail,
  });
}
```

- [ ] **Step 6: Update `submitManualOrder` to create as `pending_contact` and only send the customer email**

In `submitManualOrder` (lines 1318-1416), the order object passed to `createOrderInDatabase`/`createOrderInMemory` currently doesn't set `status` explicitly, so it defaults to `"new"` via `buildInquiryRecord`'s `input.status ?? "new"`. Force it to `"pending_contact"` for this path specifically, and swap the email call. Change:

```ts
      const orderInput: OrderWriteInput = {
        ...data,
        discount,
        notes: discountCode
          ? `${data.notes}${data.notes ? "\n" : ""}Código de cumpleaños: ${discountCode}`
          : data.notes,
      };
      const record = db
        ? (await createOrderInDatabase(orderInput, canonicalLines)) ?? (await createOrderInMemory(orderInput, canonicalLines))
        : await createOrderInMemory(orderInput, canonicalLines);
      if (discountCode) {
        await redeemBirthdayCouponInternal(discountCode, data.customerEmail);
      }
      const emailState = await sendOrderEmails(record);

      return {
        emailState,
        message: emailState.configured
          ? "Pedido creado y correos de confirmacion procesados."
          : "Pedido creado. Falta configurar el proveedor de correo para enviar confirmaciones automaticas.",
```

to:

```ts
      const orderInput: OrderWriteInput = {
        ...data,
        discount,
        notes: discountCode
          ? `${data.notes}${data.notes ? "\n" : ""}Código de cumpleaños: ${discountCode}`
          : data.notes,
        status: "pending_contact",
      };
      const record = db
        ? (await createOrderInDatabase(orderInput, canonicalLines)) ?? (await createOrderInMemory(orderInput, canonicalLines))
        : await createOrderInMemory(orderInput, canonicalLines);
      if (discountCode) {
        await redeemBirthdayCouponInternal(discountCode, data.customerEmail);
      }
      const config = await getEmailConfig();
      const customerSent = config.apiKey && config.from ? await sendCustomerInvoiceEmail(record) : false;
      const emailState = { configured: Boolean(config.apiKey && config.from), customerSent, teamSent: false };

      return {
        emailState,
        message: emailState.configured
          ? "Pedido creado. Revisa tu correo para confirmar por WhatsApp."
          : "Pedido creado. Falta configurar el proveedor de correo para enviar confirmaciones automaticas.",
```

- [ ] **Step 7: Update `createAdminManualOrder` to keep sending both emails immediately (unaffected by the gate)**

Find (inside `createAdminManualOrder`, currently around lines 1418-1437):

```ts
    const emailState = data.sendEmails ? await sendOrderEmails(record) : null;
```

Replace with:

```ts
    const emailState = data.sendEmails
      ? {
          configured: true,
          customerSent: await sendCustomerInvoiceEmail(record),
          teamSent: await sendTeamOrderNotificationEmail(record),
        }
      : null;
```

(Admin-created orders already default `status` to `"new"` via `adminManualOrderSchema`'s `.default("new")` — no change needed there, so they bypass the gate entirely as intended.)

- [ ] **Step 8: Add the confirm-and-redirect handler**

Add this new exported function at the end of the file (after `updateAdminOrder`):

```ts
function buildWhatsappRedirectUrl(whatsappNumber: string, requestNumber?: string) {
  const base = `https://wa.me/${whatsappNumber}`;
  if (!requestNumber) return base;
  return `${base}?text=${encodeURIComponent(`Hola, quiero completar el pedido ${requestNumber}.`)}`;
}

export async function maybeHandleOrderConfirmRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/pedido/confirmar") return null;

  const settings = await getStorefrontSettingsInternal();
  const fallbackRedirect = buildWhatsappRedirectUrl(settings.whatsappNumber);
  const orderId = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const secret = await getOrderConfirmSecret();

  if (!orderId || !secret || !(await verifyOrderConfirmToken(orderId, token, secret))) {
    return Response.redirect(fallbackRedirect, 302);
  }

  const db = await getDatabase();
  if (!db) {
    const record = memoryOrders.get(orderId);
    if (!record) return Response.redirect(fallbackRedirect, 302);
    if (record.status === "pending_contact") {
      const confirmed = { ...record, status: "new" as const };
      memoryOrders.set(orderId, confirmed);
      await sendTeamOrderNotificationEmail(confirmed);
      return Response.redirect(buildWhatsappRedirectUrl(settings.whatsappNumber, confirmed.requestNumber), 302);
    }
    return Response.redirect(buildWhatsappRedirectUrl(settings.whatsappNumber, record.requestNumber), 302);
  }

  await ensureOrderStorageReady(db);
  const existing = await db
    .prepare(
      `
        SELECT
          id, request_number, customer_name, customer_email, customer_phone,
          status, channel, fulfillment_method, subtotal_cents, shipping_cents,
          discount_cents, total_cents, payment_status, shipping_line1,
          shipping_city, shipping_province, notes, items_json, created_at
        FROM inquiries
        WHERE id = ?
        LIMIT 1
      `,
    )
    .bind(orderId)
    .first<InquiryRow>();

  if (!existing) {
    return Response.redirect(fallbackRedirect, 302);
  }

  if (existing.status !== "pending_contact") {
    return Response.redirect(buildWhatsappRedirectUrl(settings.whatsappNumber, existing.request_number), 302);
  }

  await db
    .prepare(`UPDATE inquiries SET status = 'new', contact_confirmed_at = ? WHERE id = ?`)
    .bind(new Date().toISOString(), orderId)
    .run();

  const confirmedRecord = buildInquiryRecord({
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
    status: "new",
  });

  await sendTeamOrderNotificationEmail(confirmedRecord);

  return Response.redirect(buildWhatsappRedirectUrl(settings.whatsappNumber, existing.request_number), 302);
}
```

- [ ] **Step 9: Add the missing `getStorefrontSettingsInternal` import if not already present**

Check the top of `src/lib/manual-orders.ts` — it currently does not import `getStorefrontSettingsInternal` (only `src/lib/public-forms.ts` does). Add:

```ts
import { getStorefrontSettingsInternal } from "@/lib/admin-content";
```

- [ ] **Step 10: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add src/lib/manual-orders.ts
git commit -m "feat: split order emails, gate team notification behind WhatsApp confirm click"
```

---

### Task 5: Wire the confirm route into the Worker entrypoint

**Files:**
- Modify: `src/server.ts`

**Interfaces:**
- Consumes: `maybeHandleOrderConfirmRequest` from `@/lib/manual-orders` (Task 4).

- [ ] **Step 1: Import the handler**

In `src/server.ts`, add to the existing import block (near `maybeHandleAgentationWebhook`):

```ts
import { maybeHandleOrderConfirmRequest } from "./lib/manual-orders";
```

- [ ] **Step 2: Call it in the same spot as the existing webhook check**

In the exported `fetch` handler, right after the existing block:

```ts
      const webhookResponse = await maybeHandleAgentationWebhook(request);
      if (webhookResponse) {
        return finalizeResponse(request, webhookResponse);
      }
```

add:

```ts
      const orderConfirmResponse = await maybeHandleOrderConfirmRequest(request);
      if (orderConfirmResponse) {
        return finalizeResponse(request, orderConfirmResponse);
      }
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/server.ts
git commit -m "feat: route /pedido/confirmar through the order-confirm handler"
```

---

### Task 6: Update the checkout success page

**Files:**
- Modify: `src/routes/solicitud.tsx`

**Interfaces:** none (leaf UI change, no new exports/consumers).

- [ ] **Step 1: Remove the WhatsApp button and its supporting code**

In `src/routes/solicitud.tsx`:
- Delete the `whatsappHref` computation (lines 82-86).
- Delete the `MessageCircle` import from the `lucide-react` import line (line 3) since it's no longer used anywhere else in this file — verify with a search inside the file before removing; if unused elsewhere, drop it from the import list.
- In the success view (the `if (createdOrder)` block, lines 124-248), replace the "Siguiente paso" aside block:

```tsx
            <div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Siguiente paso
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Envianos el numero <strong>{createdOrder.order.requestNumber}</strong> por WhatsApp para terminar la compra.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold uppercase tracking-wider text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar por WhatsApp
                </a>
                <Link
                  to="/tienda"
                  className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-5 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  Volver a la tienda
                </Link>
              </div>
            </div>
```

with:

```tsx
            <div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Siguiente paso
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Te enviamos un correo con tu pedido <strong>{createdOrder.order.requestNumber}</strong>. Abrelo y
                confirma por WhatsApp desde ahi para completar tu compra.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  to="/tienda"
                  className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-5 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  Volver a la tienda
                </Link>
              </div>
            </div>
```

- [ ] **Step 2: Update the headline copy right below "Tu numero de orden es..."**

Change:

```tsx
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Ya registramos tu pedido. Ahora solo tienes que escribirnos por WhatsApp y enviarnos ese numero para confirmar disponibilidad y entrega.
          </p>
```

to:

```tsx
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Ya registramos tu pedido. Revisa tu correo: ahi tienes el detalle y el boton para confirmar por WhatsApp.
          </p>
```

- [ ] **Step 3: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds. If `MessageCircle` was left imported-but-unused, the build's ESLint/TS step may not fail (unused imports are usually just a lint warning, not a build error) — additionally run `pnpm lint` and confirm no new unused-import warning for this file.

- [ ] **Step 4: Commit**

```bash
git add src/routes/solicitud.tsx
git commit -m "feat: remove on-site WhatsApp button, point customers to their confirmation email"
```

---

### Task 7: Admin order list — hide `pending_contact` by default, add filter tab

**Files:**
- Modify: `src/routes/admin/pedidos.tsx` (filter buttons array line 457, `matchesStatus` logic line 191, `statusTone` function lines 54-59)
- Modify: `src/lib/manual-orders.ts` (`getAdminOrderSnapshotInternal`, lines 1004+ — both the DB and in-memory branches)

**Interfaces:** none new — internal filtering logic only.

- [ ] **Step 1: Add the filter tab**

In `src/routes/admin/pedidos.tsx`, change (line 457):

```tsx
              {(["all", "new", "follow_up", "quoted", "closed", "cancelled"] as const).map((entry) => (
```

to:

```tsx
              {(["all", "pending_contact", "new", "follow_up", "quoted", "closed", "cancelled"] as const).map((entry) => (
```

- [ ] **Step 2: Exclude `pending_contact` from the default "all" view**

Change the `matchesStatus` line (currently line 191):

```ts
      const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
```

to:

```ts
      const matchesStatus =
        statusFilter === "all" ? inquiry.status !== "pending_contact" : inquiry.status === statusFilter;
```

- [ ] **Step 3: Add a tone for the new status badge**

Change `statusTone` (currently lines 54-59):

```ts
function statusTone(status: AdminInquiryStatus) {
  if (status === "new") return "warn";
  if (status === "closed") return "success";
  if (status === "cancelled") return "danger";
  return "info";
}
```

to:

```ts
function statusTone(status: AdminInquiryStatus) {
  if (status === "pending_contact") return "info";
  if (status === "new") return "warn";
  if (status === "closed") return "success";
  if (status === "cancelled") return "danger";
  return "info";
}
```

- [ ] **Step 4: Exclude `pending_contact` from the live dashboard's open-order count and recent list**

In `src/lib/manual-orders.ts`, `getAdminOrderSnapshotInternal` (currently starting at line 1004):

In-memory branch — change:

```ts
      openInquiryCount: inquiries.filter((inquiry) => inquiry.status !== "closed" && inquiry.status !== "cancelled").length,
```

to:

```ts
      openInquiryCount: inquiries.filter(
        (inquiry) => !["closed", "cancelled", "pending_contact"].includes(inquiry.status),
      ).length,
      recentInquiries: inquiries
        .filter((inquiry) => inquiry.status !== "pending_contact")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.requestNumber.localeCompare(a.requestNumber))
        .slice(0, limit),
```

(This replaces both the `openInquiryCount` line and the existing `recentInquiries` line in that same in-memory branch — remove the old standalone `recentInquiries: inquiries.sort(...).slice(0, limit),` line so there's only one `recentInquiries` key.)

DB branch — change the counts query:

```sql
        SELECT
          COUNT(*) AS inquiry_count,
          SUM(CASE WHEN status NOT IN ('closed', 'cancelled') THEN 1 ELSE 0 END) AS open_inquiry_count
        FROM inquiries
```

to:

```sql
        SELECT
          COUNT(*) AS inquiry_count,
          SUM(CASE WHEN status NOT IN ('closed', 'cancelled', 'pending_contact') THEN 1 ELSE 0 END) AS open_inquiry_count
        FROM inquiries
```

And find the `recent` query directly below it in the same function (the `SELECT ... FROM inquiries ORDER BY created_at DESC ... LIMIT ?`-shaped query) and add a `WHERE status <> 'pending_contact'` clause before its `ORDER BY`.

- [ ] **Step 5: Verify it compiles**

Run: `pnpm build`
Expected: build succeeds.

- [ ] **Step 6: Manual verification**

Run: `pnpm build && npx wrangler dev`
Then in another terminal, place a test order through `http://localhost:8787/solicitud` (or whatever port `wrangler dev` prints) and confirm:
- It does NOT appear in `/admin/pedidos` under "Todas".
- It DOES appear under the "Pendiente de contacto" filter tab.

- [ ] **Step 7: Commit**

```bash
git add src/routes/admin/pedidos.tsx src/lib/manual-orders.ts
git commit -m "feat: hide pending-contact orders from default admin view, add filter tab"
```

---

### Task 8: End-to-end manual verification

**Files:** none — verification only.

- [ ] **Step 1: Dry-run deploy check**

Run: `pnpm build && npx wrangler deploy --dry-run --env production`
Expected: succeeds, bindings list includes `env.ORDER_CONFIRM_SECRET` alongside the existing ones (confirms the secret from Task 3 is visible to the Worker).

- [ ] **Step 2: Full local flow test**

Run: `npx wrangler dev`
- Submit a test order at `/solicitud`.
- Confirm the success page no longer shows a WhatsApp button, and shows the "revisa tu correo" copy instead.
- Confirm a customer invoice email was attempted (check `wrangler dev` console output/logs for the Resend call, or check the Resend dashboard's log if `RESEND_API_KEY` is live even in dev).
- Copy the confirm link's `order`/`token` query params out of the sent email (or reconstruct via `verifyOrderConfirmToken` in a scratch script) and hit `http://localhost:8787/pedido/confirmar?order=<id>&token=<token>` directly in a browser.
- Confirm it redirects to `https://wa.me/<number>?text=...` and that the order now shows up under "Todas" in `/admin/pedidos` with status "Nueva".
- Hit the same confirm URL a second time — confirm it still redirects to WhatsApp without erroring, and without sending a second internal notification email (check Resend logs / email inbox count).

- [ ] **Step 3: Real deploy**

Once local verification passes:

```bash
pnpm build
pnpm deploy:production
```

- [ ] **Step 4: Commit any leftover changes**

If Step 2 or 3 required fixes, commit them individually with descriptive messages before considering this plan complete.
