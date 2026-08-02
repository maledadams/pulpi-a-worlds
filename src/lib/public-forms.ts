import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getStorefrontSettingsInternal } from "@/lib/admin-content";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { enforceAdminAccess } from "@/lib/admin-access";
import { signOrderConfirmToken, verifyOrderConfirmToken } from "@/lib/order-confirm-token";

type WorkerEnv = {
  DB?: D1Database;
  ORDER_CONFIRM_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

export const BIRTHDAY_COUPON_CODE = "CUMP15";
const BIRTHDAY_DISCOUNT_RATE = 0.15;

const contactSchema = z.object({
  email: z.string().email(),
  message: z.string().trim().min(10).max(2000),
  name: z.string().trim().min(2).max(120),
  turnstileToken: z.string().trim().min(1),
});

const newsletterSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().email(),
  turnstileToken: z.string().trim().min(1),
});

const couponValidationSchema = z.object({
  code: z.string().trim().min(1).max(20),
  email: z.string().trim().email(),
  subtotal: z.number().min(0).max(9999999),
  token: z.string().trim().optional().default(""),
});

const memoryContacts: Array<{ createdAt: string; email: string; message: string; name: string }> = [];

const memorySubscribers = new Map<
  string,
  { birthDate: string; createdAt: string; email: string; lastCouponSentDate: string | null }
>();
let publicFormsReadyPromise: Promise<void> | null = null;

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

async function getBirthdayTokenSecret() {
  const workerEnv = await getWorkerEnv();
  return workerEnv.ORDER_CONFIRM_SECRET ?? process.env.ORDER_CONFIRM_SECRET ?? "";
}

function birthdayTokenSubject(email: string, dateKey: string) {
  return `birthday:${email}:${dateKey}`;
}

async function ensurePublicFormsReady(db: D1Database) {
  if (!publicFormsReadyPromise) {
    publicFormsReadyPromise = (async () => {
      await db.exec(
        `
        CREATE TABLE IF NOT EXISTS contact_messages (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          message TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'site',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          email TEXT PRIMARY KEY,
          status TEXT NOT NULL DEFAULT 'subscribed',
          source TEXT NOT NULL DEFAULT 'site',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS birthday_subscribers (
          email TEXT PRIMARY KEY,
          birth_date TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'subscribed',
          source TEXT NOT NULL DEFAULT 'site',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS birthday_coupons (
          code TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          valid_date TEXT NOT NULL,
          emailed_at TEXT,
          redeemed_at TEXT,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(email, valid_date)
        );

        CREATE INDEX IF NOT EXISTS birthday_coupons_valid_date
        ON birthday_coupons (valid_date, email);
      `.replace(/\n/g, " "),
      );

      try {
        await db.exec("ALTER TABLE birthday_subscribers ADD COLUMN last_coupon_sent_date TEXT;");
      } catch {
        // Existing databases already migrated.
      }
    })().catch((error) => {
      publicFormsReadyPromise = null;
      throw error;
    });
  }

  return publicFormsReadyPromise;
}

async function saveContactMessage(input: z.infer<typeof contactSchema>) {
  const db = await getDatabase();
  if (!db) {
    memoryContacts.push({
      createdAt: new Date().toISOString(),
      email: input.email.trim().toLowerCase(),
      message: input.message.trim(),
      name: input.name.trim(),
    });
    return;
  }

  await ensurePublicFormsReady(db);
  await db
    .prepare(`
      INSERT INTO contact_messages (id, name, email, message, source)
      VALUES (?, ?, ?, ?, 'site')
    `)
    .bind(
      crypto.randomUUID(),
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.message.trim(),
    )
    .run();
}

function getDominicanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = value("year");
  const month = value("month");
  const day = value("day");
  return { day, month, year, dateKey: `${year}-${month}-${day}`, monthDay: `${month}-${day}` };
}

function isValidBirthDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

async function saveNewsletterSubscriber(input: z.infer<typeof newsletterSchema>) {
  const email = input.email.trim().toLowerCase();
  if (!isValidBirthDate(input.birthDate)) {
    return { message: "Selecciona una fecha de cumpleaños valida.", ok: false as const, token: "" };
  }
  const today = getDominicanDateParts();
  const isBirthdayToday = input.birthDate.slice(5) === today.monthDay;

  const db = await getDatabase();
  if (!db) {
    const existing = memorySubscribers.get(email);
    if (existing && existing.birthDate !== input.birthDate) {
      return { message: "Este correo ya tiene un cumpleaños registrado.", ok: false as const, token: "" };
    }
    memorySubscribers.set(email, {
      birthDate: input.birthDate,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      email,
      lastCouponSentDate: isBirthdayToday ? today.dateKey : (existing?.lastCouponSentDate ?? null),
    });
    const secret = await getBirthdayTokenSecret();
    const token = isBirthdayToday && secret ? await signOrderConfirmToken(birthdayTokenSubject(email, today.dateKey), secret) : "";
    return { message: "Cumpleaños guardado. Recibiras tu código especial en esa fecha.", ok: true as const, token };
  }

  await ensurePublicFormsReady(db);
  const existing = await db
    .prepare("SELECT birth_date FROM birthday_subscribers WHERE email = ?")
    .bind(email)
    .first<{ birth_date: string }>();
  if (existing && existing.birth_date !== input.birthDate) {
    return { message: "Este correo ya tiene un cumpleaños registrado.", ok: false as const, token: "" };
  }
  await db
    .prepare(`
      INSERT INTO birthday_subscribers (email, birth_date, status, source, created_at, updated_at)
      VALUES (?, ?, 'subscribed', 'site', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        status = 'subscribed',
        source = 'site',
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(email, input.birthDate)
    .run();

  let token = "";
  if (isBirthdayToday) {
    const sent = await sendBirthdayEmailIfNeeded(email, today);
    if (sent) {
      const secret = await getBirthdayTokenSecret();
      token = secret ? await signOrderConfirmToken(birthdayTokenSubject(email, today.dateKey), secret) : "";
    }
  }
  return { message: "Cumpleaños guardado. Recibiras tu código especial en esa fecha.", ok: true as const, token };
}

async function sendBirthdayEmail(email: string, dateKey: string) {
  const workerEnv = await getWorkerEnv();
  const apiKey = workerEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? "";
  const from = workerEnv.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "";
  if (!apiKey || !from) return false;

  const secret = await getBirthdayTokenSecret();
  const token = secret ? await signOrderConfirmToken(birthdayTokenSubject(email, dateKey), secret) : "";
  const confirmUrl = token
    ? `https://pulpinastore.com/cumpleanos/confirmar?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
    : "https://pulpinastore.com/tienda";

  const html = `
    <div style="background:#fbf4e8;padding:32px 16px;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #231717;border-radius:20px;padding:32px;text-align:center">
        <p style="letter-spacing:.18em;text-transform:uppercase;color:#6b5a55;font-size:12px;margin:0 0 4px">Pulpiña RD</p>
        <h1 style="font-size:28px;margin:0 0 12px;color:#231717">Feliz cumpleaños 🎂</h1>
        <p style="font-size:14px;line-height:1.6;color:#231717;margin:0 0 20px">
          Hoy celebramos contigo. Usa este código durante todo el día de hoy y recibe <strong>15% de descuento</strong> en toda la tienda.
        </p>
        <div style="margin:8px auto 20px;padding:16px;border:2px dashed #c5475f;border-radius:12px;font-size:26px;font-weight:800;letter-spacing:.16em;color:#231717">
          ${BIRTHDAY_COUPON_CODE}
        </div>
        <div style="margin-top:8px">
          <a href="${confirmUrl}" style="display:inline-block;background:#231717;color:#fbf4e8;text-decoration:none;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px;padding:14px 28px;border-radius:999px">
            Reclamar mi descuento
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#6b5a55;margin-top:20px">
          Válido únicamente hoy y para el correo que recibió este mensaje. Toca el botón desde el navegador donde vas a comprar para activarlo.
        </p>
      </div>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Tu regalo de cumpleaños de Pulpiña RD 🎂",
      text: `Feliz cumpleaños. Usa el código ${BIRTHDAY_COUPON_CODE} hoy para recibir 15% de descuento en toda la tienda. Activa tu descuento aquí: ${confirmUrl}`,
      html,
    }),
  });
  return response.ok;
}

async function sendBirthdayEmailIfNeeded(email: string, today: ReturnType<typeof getDominicanDateParts>) {
  const db = await getDatabase();
  if (!db) {
    const existing = memorySubscribers.get(email);
    if (existing?.lastCouponSentDate === today.dateKey) return true;
    const sent = await sendBirthdayEmail(email, today.dateKey);
    if (sent && existing) memorySubscribers.set(email, { ...existing, lastCouponSentDate: today.dateKey });
    return sent;
  }

  const row = await db
    .prepare("SELECT last_coupon_sent_date FROM birthday_subscribers WHERE email = ?")
    .bind(email)
    .first<{ last_coupon_sent_date: string | null }>();
  if (row?.last_coupon_sent_date === today.dateKey) return true;

  const sent = await sendBirthdayEmail(email, today.dateKey);
  if (sent) {
    await db
      .prepare("UPDATE birthday_subscribers SET last_coupon_sent_date = ? WHERE email = ?")
      .bind(today.dateKey, email)
      .run();
  }
  return sent;
}

export async function processBirthdayEmailsInternal(now = new Date(), onlyEmail?: string) {
  const today = getDominicanDateParts(now);
  const db = await getDatabase();
  const subscribers = db
    ? await (async () => {
        await ensurePublicFormsReady(db);
        const rows = await db.prepare("SELECT email, birth_date FROM birthday_subscribers WHERE status = 'subscribed'").all<{ email: string; birth_date: string }>();
        return (rows.results ?? []).map((row) => ({ email: row.email, birthDate: row.birth_date }));
      })()
    : Array.from(memorySubscribers.values()).map((entry) => ({ email: entry.email, birthDate: entry.birthDate }));

  let sent = 0;
  for (const subscriber of subscribers) {
    if (onlyEmail && subscriber.email !== onlyEmail.toLowerCase()) continue;
    if (subscriber.birthDate.slice(5) !== today.monthDay) continue;
    if (await sendBirthdayEmailIfNeeded(subscriber.email, today)) sent += 1;
  }
  return { sent };
}

export async function validateBirthdayCouponInternal(input: z.infer<typeof couponValidationSchema>) {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  const invalidResult = {
    discount: 0,
    message: "El código no es válido para este correo o para el día de hoy.",
    ok: false as const,
  };

  if (code !== BIRTHDAY_COUPON_CODE) {
    return invalidResult;
  }

  const secret = await getBirthdayTokenSecret();
  const today = getDominicanDateParts();
  if (!secret || !input.token || !(await verifyOrderConfirmToken(birthdayTokenSubject(email, today.dateKey), input.token, secret))) {
    return invalidResult;
  }

  const db = await getDatabase();
  const birthDate = db
    ? await (async () => {
        await ensurePublicFormsReady(db);
        const row = await db
          .prepare("SELECT birth_date FROM birthday_subscribers WHERE email = ?")
          .bind(email)
          .first<{ birth_date: string }>();
        return row?.birth_date ?? null;
      })()
    : memorySubscribers.get(email)?.birthDate ?? null;

  if (!birthDate || birthDate.slice(5) !== today.monthDay) {
    return invalidResult;
  }

  const discount = Math.round(input.subtotal * BIRTHDAY_DISCOUNT_RATE * 100) / 100;
  return { code, discount, message: "Código aplicado: 15% de descuento de cumpleaños.", ok: true as const };
}

export const submitContactForm = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof contactSchema>) => contactSchema.parse(data))
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

    await saveContactMessage(data);
    const settings = await getStorefrontSettingsInternal();

    return {
      message: settings.contactResponseNote,
      ok: true as const,
    };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof newsletterSchema>) => newsletterSchema.parse(data))
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
        token: "",
      };
    }

    return saveNewsletterSubscriber(data);
  });

export const validateBirthdayCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof couponValidationSchema>) => couponValidationSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "private, no-store");
    return validateBirthdayCouponInternal(data);
  });

function birthdayRedirectPage(email: string, token: string) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>Pulpiña RD</title></head><body style="background:#fbf4e8;color:#231717;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
<p>Activando tu descuento de cumpleaños...</p>
<script>
try {
  localStorage.setItem("pulpina_birthday_token", JSON.stringify({ email: ${JSON.stringify(email)}, token: ${JSON.stringify(token)} }));
} catch (error) {}
location.replace("/tienda");
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" }, status: 200 });
}

export async function maybeHandleBirthdayConfirmRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/cumpleanos/confirmar") return null;

  const fallback = Response.redirect(`${url.origin}/tienda`, 302);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("token") ?? "";
  const secret = await getBirthdayTokenSecret();
  if (!email || !token || !secret) return fallback;

  const today = getDominicanDateParts();
  if (!(await verifyOrderConfirmToken(birthdayTokenSubject(email, today.dateKey), token, secret))) {
    return fallback;
  }

  const db = await getDatabase();
  const birthDate = db
    ? await (async () => {
        await ensurePublicFormsReady(db);
        const row = await db
          .prepare("SELECT birth_date FROM birthday_subscribers WHERE email = ?")
          .bind(email)
          .first<{ birth_date: string }>();
        return row?.birth_date ?? null;
      })()
    : memorySubscribers.get(email)?.birthDate ?? null;

  if (!birthDate || birthDate.slice(5) !== today.monthDay) return fallback;

  return birthdayRedirectPage(email, token);
}

async function listBirthdaySubscribersInternal() {
  const today = getDominicanDateParts();
  const db = await getDatabase();
  if (!db) {
    return Array.from(memorySubscribers.values())
      .map((subscriber) => ({
        email: subscriber.email,
        birthDate: subscriber.birthDate,
        isBirthdayToday: subscriber.birthDate.slice(5) === today.monthDay,
        lastCouponSentDate: subscriber.lastCouponSentDate,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  }

  await ensurePublicFormsReady(db);
  const rows = await db
    .prepare(
      "SELECT email, birth_date, last_coupon_sent_date FROM birthday_subscribers WHERE status = 'subscribed' ORDER BY birth_date ASC",
    )
    .all<{ email: string; birth_date: string; last_coupon_sent_date: string | null }>();

  return (rows.results ?? []).map((row) => ({
    email: row.email,
    birthDate: row.birth_date,
    isBirthdayToday: row.birth_date.slice(5) === today.monthDay,
    lastCouponSentDate: row.last_coupon_sent_date,
  }));
}

export const getAdminBirthdaySubscribers = createServerFn({ method: "GET" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return listBirthdaySubscribersInternal();
});

export const triggerBirthdayEmailsNow = createServerFn({ method: "POST" }).handler(async () => {
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  await enforceAdminAccess();
  setResponseHeader("Cache-Control", "private, no-store");
  return processBirthdayEmailsInternal();
});
