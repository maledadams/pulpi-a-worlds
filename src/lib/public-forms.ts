import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { getStorefrontSettingsInternal } from "@/lib/admin-content";
import { verifyTurnstileToken } from "@/lib/turnstile";

type WorkerEnv = {
  DB?: D1Database;
};

const contactSchema = z.object({
  email: z.string().email(),
  message: z.string().trim().min(10).max(2000),
  name: z.string().trim().min(2).max(120),
  turnstileToken: z.string().trim().min(1),
});

const newsletterSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().trim().min(1),
});

const memoryContacts: Array<{ createdAt: string; email: string; message: string; name: string }> = [];
const memorySubscribers = new Map<string, { createdAt: string; email: string }>();
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

async function saveNewsletterSubscriber(input: z.infer<typeof newsletterSchema>) {
  const email = input.email.trim().toLowerCase();
  const db = await getDatabase();
  if (!db) {
    memorySubscribers.set(email, {
      createdAt: new Date().toISOString(),
      email,
    });
    return;
  }

  await ensurePublicFormsReady(db);
  await db
    .prepare(`
      INSERT INTO newsletter_subscribers (email, status, source, created_at, updated_at)
      VALUES (?, 'subscribed', 'site', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(email) DO UPDATE SET
        status = 'subscribed',
        source = 'site',
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(email)
    .run();
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

    await saveNewsletterSubscriber(data);

    return {
      message: "Suscripcion guardada. Te avisaremos cuando haya novedades, drops u ofertas.",
      ok: true as const,
    };
  });
