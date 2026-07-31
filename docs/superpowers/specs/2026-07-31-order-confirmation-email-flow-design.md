# Order confirmation email flow + branded transactional emails

## Problem

Today, submitting the order form on `/solicitud`:
1. Creates the order in D1 immediately (status `new`).
2. Immediately emails both the customer and the internal team (Resend), with bare unstyled HTML (`<p>`/`<pre>` dumps).
3. Shows a success page with a "Enviar por WhatsApp" link the customer may or may not click.

The team gets notified and the order appears in `/admin/pedidos` even if the customer never actually reaches out — there's no signal that they intend to follow through. Both customer-facing and internal emails also look unstyled, unlike the birthday-coupon email, which already has a nice branded template.

## Goals

- The order only becomes "real" (visible in the main admin list, internal notification sent) once the customer takes an explicit confirm action.
- That confirm action happens **inside the customer's email**, via a "Confirmar por WhatsApp" button — not on the site. The site checkout success page just tells the customer to check their email.
- The customer email looks like an invoice: product images, names, quantities, prices, totals — styled to match the actual site (cream/ink palette), not the dark/gold birthday template.
- No lead is silently lost: orders awaiting the customer's click stay visible to the admin under a dedicated filter, just excluded from the default view and counts.
- No new paid services. The "click tracking" is our own signed redirect link.

## Data model changes

`inquiries` table (D1), via the existing `ALTER TABLE ... ADD COLUMN` migration pattern already used in `ensureOrderStorageReady`:

- New column: `contact_confirmed_at TEXT` (nullable).
- New status value for the existing `status TEXT` column: `pending_contact`. Orders created through the public `submitManualOrder` path start here instead of `new`. Orders created through the admin panel (`createAdminManualOrder`) are unaffected and still start at `new`.

## Order submission flow (`submitManualOrder`)

- Order is created with `status = 'pending_contact'`, `contact_confirmed_at = NULL`.
- `sendOrderEmails` is split into two independent functions:
  - `sendCustomerInvoiceEmail(record)` — fires immediately, as today. Renders the new invoice-style template (see below).
  - `sendTeamOrderNotificationEmail(record)` — **not called from submission anymore.** Only called from the confirm endpoint.
- Response to the client no longer includes anything about a WhatsApp button; the success page copy changes (see below).

## Confirm-and-redirect endpoint

New route handled directly in `src/server.ts`'s existing custom pre-routing (same pattern as `maybeHandleAgentationWebhook`), so it runs before the TanStack handler:

`GET /pedido/confirmar?order=<id>&token=<signature>`

- `token` = HMAC-SHA256(order id, secret) using a new secret `ORDER_CONFIRM_SECRET` (generated now, pushed via `wrangler secret put`, never a plaintext var).
- Valid token + order found + `status === 'pending_contact'`:
  - Set `status = 'new'`, `contact_confirmed_at = now()`.
  - Fire `sendTeamOrderNotificationEmail(record)` (only here — this is the only place it's called).
  - 302 redirect to `https://wa.me/<number>?text=<prefilled message with order number>` — identical destination/prefill the old on-site button used.
- Valid token, but order already confirmed (double click / already actioned): skip the state change and email, redirect to WhatsApp anyway. Idempotent, harmless.
- Invalid/missing token or order not found: redirect straight to the plain WhatsApp number (no order context, no state change). Fails open so a broken/tampered link never strands a genuine customer — it just silently skips the tracking.

## Checkout success page (`/solicitud`)

- Remove the "Enviar por WhatsApp" button and related copy entirely.
- Replace with: confirmation of the order number, and copy along the lines of *"Te enviamos un correo con tu pedido — ábrelo y confirma por WhatsApp para completarlo."*
- Order summary (line items, totals) stays on the page as today — only the WhatsApp CTA and its copy are removed.

## Customer invoice email

- Visual style matches the actual site's default theme, **not** the birthday email's dark/gold template: cream background (`#fbf4e8`), ink text/borders (`#231717`), same rounded/bordered card look used elsewhere on the site. No gradients, no gold accents.
- Plain text wordmark header ("Pulpiña RD"), not an image — avoids broken-image issues in clients that block remote images by default, and needs no new asset hosting.
- Invoice body: one row per line item — product image (already a public R2 URL, used as-is), name, variant label, quantity, unit price, line total.
- Totals block below: subtotal, discount (if any), shipping (if any), total — same numbers as today's plain-text summary.
- Below the invoice: a prominent button, "Confirmar por WhatsApp", linking to the signed `/pedido/confirmar` URL from above. Copy makes clear this step is required to complete the order and arrange payment.
- Plain-text part of the email updated to match (image URLs included as plain links, since plain text can't embed images).

## Internal team notification email

- Fires only from the confirm endpoint, so it only ever represents a customer who actually intends to follow through.
- Kept simple and scannable — on-brand (same cream/ink styling for consistency) but plain and utilitarian: subject includes order number, body lists customer contact info and the item list/total. Not trying to be a marketing artifact, since it's read by the store owner to take action.

## Admin (`/admin/pedidos`)

- `AdminInquiryStatus` gains `pending_contact`.
- Default view (`statusFilter === 'all'`) excludes `pending_contact` orders.
- New explicit filter option, "Pendientes de contacto", to see them anyway.
- Any "open orders" counts elsewhere in admin also exclude `pending_contact` by default, consistent with it not counting as a real actionable order yet.

## Edge cases

- Admin-created manual orders bypass this gate entirely (start at `new`, as today) — the person creating them already knows about the order.
- Clicking the confirm link twice, or after the order was already actioned in admin, is a no-op beyond the WhatsApp redirect.
- If Resend isn't configured (`RESEND_API_KEY`/`RESEND_FROM_EMAIL` missing), behavior degrades the same way it does today — order is still created, no email attempted, existing "email provider not configured yet" messaging stays.

## Out of scope

- No changes to the birthday coupon email template — it stays as the existing dark/gold design (that one wasn't part of this ask).
- No payment processing — WhatsApp remains the manual close-out step, unchanged.
- No expiry on the confirm token — it's tied 1:1 to a single order and replay is harmless (idempotent), so there's no security benefit to adding time-based expiry.
