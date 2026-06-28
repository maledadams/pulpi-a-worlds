import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getStorefrontSettingsInternal } from "@/lib/admin-content";
import { verifyTurnstileToken } from "@/lib/turnstile";

type WorkerEnv = {
  DB?: D1Database;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

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
});

const memoryContacts: Array<{ createdAt: string; email: string; message: string; name: string }> = [];
type BirthdayCoupon = {
  code: string;
  email: string;
  validDate: string;
  redeemedAt: string | null;
  emailedAt: string | null;
};

const memorySubscribers = new Map<string, { birthDate: string; createdAt: string; email: string }>();
const memoryCoupons = new Map<string, BirthdayCoupon>();
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

async function ensurePublicFormsReady(db: D1Database) {
  if (!publicFormsReadyPromise) {
    publicFormsReadyPromise = (async () => {
      await db.exec(`
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
      `);
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

function generateBirthdayCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `CM${String(values[0] % 10000).padStart(4, "0")}`;
}

async function saveNewsletterSubscriber(input: z.infer<typeof newsletterSchema>) {
  const email = input.email.trim().toLowerCase();
  if (!isValidBirthDate(input.birthDate)) {
    return { message: "Selecciona una fecha de cumpleaños valida.", ok: false as const };
  }
  const db = await getDatabase();
  if (!db) {
    const existing = memorySubscribers.get(email);
    if (existing && existing.birthDate !== input.birthDate) {
      return { message: "Este correo ya tiene un cumpleaños registrado.", ok: false as const };
    }
    memorySubscribers.set(email, {
      birthDate: input.birthDate,
      createdAt: new Date().toISOString(),
      email,
    });
    return { message: "Cumpleaños guardado. Recibiras tu código especial en esa fecha.", ok: true as const };
  }

  await ensurePublicFormsReady(db);
  const existing = await db
    .prepare("SELECT birth_date FROM birthday_subscribers WHERE email = ?")
    .bind(email)
    .first<{ birth_date: string }>();
  if (existing && existing.birth_date !== input.birthDate) {
    return { message: "Este correo ya tiene un cumpleaños registrado.", ok: false as const };
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
  return { message: "Cumpleaños guardado. Recibiras tu código especial en esa fecha.", ok: true as const };
}

async function getOrCreateBirthdayCoupon(email: string, validDate: string) {
  const db = await getDatabase();
  if (!db) {
    const existing = Array.from(memoryCoupons.values()).find(
      (coupon) => coupon.email === email && coupon.validDate === validDate,
    );
    if (existing) return existing;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const code = generateBirthdayCode();
      if (memoryCoupons.has(code)) continue;
      const coupon: BirthdayCoupon = { code, email, validDate, redeemedAt: null, emailedAt: null };
      memoryCoupons.set(code, coupon);
      return coupon;
    }
    throw new Error("No se pudo generar un código de cumpleaños único.");
  }

  await ensurePublicFormsReady(db);
  const existing = await db
    .prepare("SELECT code, email, valid_date, emailed_at, redeemed_at FROM birthday_coupons WHERE email = ? AND valid_date = ?")
    .bind(email, validDate)
    .first<{ code: string; email: string; valid_date: string; emailed_at: string | null; redeemed_at: string | null }>();
  if (existing) {
    return { code: existing.code, email: existing.email, validDate: existing.valid_date, emailedAt: existing.emailed_at, redeemedAt: existing.redeemed_at };
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = generateBirthdayCode();
    try {
      await db.prepare("INSERT INTO birthday_coupons (code, email, valid_date) VALUES (?, ?, ?)").bind(code, email, validDate).run();
      return { code, email, validDate, emailedAt: null, redeemedAt: null } satisfies BirthdayCoupon;
    } catch {
      // Another worker may have created this subscriber's daily coupon while
      // this request was generating a code. Reuse it instead of exhausting
      // retries against the UNIQUE(email, valid_date) constraint.
      const concurrent = await db
        .prepare("SELECT code, email, valid_date, emailed_at, redeemed_at FROM birthday_coupons WHERE email = ? AND valid_date = ?")
        .bind(email, validDate)
        .first<{ code: string; email: string; valid_date: string; emailed_at: string | null; redeemed_at: string | null }>();
      if (concurrent) {
        return {
          code: concurrent.code,
          email: concurrent.email,
          validDate: concurrent.valid_date,
          emailedAt: concurrent.emailed_at,
          redeemedAt: concurrent.redeemed_at,
        } satisfies BirthdayCoupon;
      }
      // Otherwise the four-digit code collided with another subscriber.
    }
  }
  throw new Error("No se pudo generar un código de cumpleaños único.");
}

async function sendBirthdayEmail(coupon: BirthdayCoupon) {
  const workerEnv = await getWorkerEnv();
  const apiKey = workerEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? "";
  const from = workerEnv.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "";
  if (!apiKey || !from) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [coupon.email],
      subject: "Tu regalo de cumpleaños de Pulpiña RD 🎂",
      text: `Feliz cumpleaños. Usa ${coupon.code} hoy para recibir 10% de descuento en toda la tienda.`,
      html: `<div style="background:#07070b;padding:32px;font-family:Arial,sans-serif;color:#fff7f2"><div style="max-width:560px;margin:auto;border:1px solid #c5475f;background:linear-gradient(135deg,#231717,#5f1427);padding:36px;text-align:center"><p style="letter-spacing:.2em;text-transform:uppercase;color:#f3a6c4">Pulpiña RD</p><h1 style="font-size:38px;margin:16px 0">Feliz cumpleaños ✨</h1><p style="font-size:17px;line-height:1.6">Hoy celebramos contigo. Usa este código durante tu cumpleaños y recibe <strong>10% de descuento</strong> en toda la tienda.</p><div style="margin:28px auto;padding:18px;border:2px dashed #ffe66a;font-size:30px;font-weight:800;letter-spacing:.18em">${coupon.code}</div><p style="color:#f2e9e1">Válido únicamente hoy y para el correo que recibió este mensaje.</p></div></div>`,
    }),
  });
  return response.ok;
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
    const coupon = await getOrCreateBirthdayCoupon(subscriber.email, today.dateKey);
    if (coupon.emailedAt) continue;
    if (!(await sendBirthdayEmail(coupon))) continue;
    const emailedAt = new Date().toISOString();
    if (db) {
      await db.prepare("UPDATE birthday_coupons SET emailed_at = ? WHERE code = ?").bind(emailedAt, coupon.code).run();
    } else {
      memoryCoupons.set(coupon.code, { ...coupon, emailedAt });
    }
    sent += 1;
  }
  return { sent };
}

export async function validateBirthdayCouponInternal(input: z.infer<typeof couponValidationSchema>) {
  const email = input.email.trim().toLowerCase();
  const code = input.code.trim().toUpperCase();
  const today = getDominicanDateParts().dateKey;
  const db = await getDatabase();
  let coupon: BirthdayCoupon | null = null;
  if (db) {
    await ensurePublicFormsReady(db);
    const row = await db.prepare("SELECT code, email, valid_date, emailed_at, redeemed_at FROM birthday_coupons WHERE code = ?").bind(code).first<{ code: string; email: string; valid_date: string; emailed_at: string | null; redeemed_at: string | null }>();
    if (row) coupon = { code: row.code, email: row.email, validDate: row.valid_date, emailedAt: row.emailed_at, redeemedAt: row.redeemed_at };
  } else {
    coupon = memoryCoupons.get(code) ?? null;
  }
  if (!coupon || coupon.email !== email || coupon.validDate !== today || coupon.redeemedAt) {
    return { discount: 0, message: "El código no es válido para este correo o para el día de hoy.", ok: false as const };
  }
  const discount = Math.round(input.subtotal * 0.1 * 100) / 100;
  return { code, discount, message: "Código aplicado: 10% de descuento de cumpleaños.", ok: true as const };
}

export async function redeemBirthdayCouponInternal(code: string, email: string) {
  const normalized = code.trim().toUpperCase();
  const redeemedAt = new Date().toISOString();
  const db = await getDatabase();
  if (db) {
    await ensurePublicFormsReady(db);
    await db.prepare("UPDATE birthday_coupons SET redeemed_at = ? WHERE code = ? AND email = ? AND redeemed_at IS NULL").bind(redeemedAt, normalized, email.trim().toLowerCase()).run();
  } else {
    const coupon = memoryCoupons.get(normalized);
    if (coupon) memoryCoupons.set(normalized, { ...coupon, redeemedAt });
  }
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
      };
    }

    const result = await saveNewsletterSubscriber(data);
    if (result.ok) {
      await processBirthdayEmailsInternal(new Date(), data.email.trim().toLowerCase());
    }
    return result;
  });

export const validateBirthdayCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof couponValidationSchema>) => couponValidationSchema.parse(data))
  .handler(async ({ data }) => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", "private, no-store");
    return validateBirthdayCouponInternal(data);
  });
