type AgentationWebhookPayload = {
  sessionId?: string;
  annotations?: unknown[];
  output?: string;
  timestamp?: string;
};

type StoredAgentationWebhook = {
  id: string;
  receivedAt: string;
  payload: AgentationWebhookPayload;
};

const AGENTATION_WEBHOOK_PATH = "/api/agentation/webhook";
const MAX_STORED_WEBHOOKS = 50;
const webhookEvents: StoredAgentationWebhook[] = [];

async function appendWebhookToFile(entry: StoredAgentationWebhook) {
  try {
    const [{ appendFile, mkdir }, pathModule] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const outputDir = pathModule.join(process.cwd(), "output");
    const filePath = pathModule.join(outputDir, "agentation-webhooks.ndjson");
    await mkdir(outputDir, { recursive: true });
    await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // File persistence is best-effort only. Local Agentation still works without it.
  }
}

async function readWebhooksFromFile() {
  try {
    const [{ readFile }, pathModule] = await Promise.all([
      import("node:fs/promises"),
      import("node:path"),
    ]);
    const filePath = pathModule.join(process.cwd(), "output", "agentation-webhooks.ndjson");
    const raw = await readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as StoredAgentationWebhook)
      .slice(-MAX_STORED_WEBHOOKS)
      .reverse();
  } catch {
    return null;
  }
}

function buildHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  };
}

function normalizeWebhookPayload(raw: unknown): AgentationWebhookPayload | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const payload = raw as Record<string, unknown>;
  return {
    sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    annotations: Array.isArray(payload.annotations) ? payload.annotations : undefined,
    output: typeof payload.output === "string" ? payload.output : undefined,
    timestamp: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
  };
}

async function storeWebhook(payload: AgentationWebhookPayload) {
  const entry: StoredAgentationWebhook = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    payload,
  };

  webhookEvents.unshift(entry);
  if (webhookEvents.length > MAX_STORED_WEBHOOKS) {
    webhookEvents.length = MAX_STORED_WEBHOOKS;
  }

  console.info("[agentation-webhook] received", {
    id: entry.id,
    sessionId: payload.sessionId ?? null,
    annotationCount: payload.annotations?.length ?? 0,
  });

  await appendWebhookToFile(entry);
  return entry;
}

export async function maybeHandleAgentationWebhook(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== AGENTATION_WEBHOOK_PATH) {
    return null;
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: buildHeaders(),
    });
  }

  if (request.method === "GET") {
    const persistedEvents = await readWebhooksFromFile();
    const events = persistedEvents ?? webhookEvents;
    return Response.json(
      {
        ok: true,
        count: events.length,
        events,
      },
      {
        headers: buildHeaders(),
      },
    );
  }

  if (request.method !== "POST") {
    return Response.json(
      {
        ok: false,
        error: "Method not allowed",
      },
      {
        status: 405,
        headers: buildHeaders(),
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid JSON body",
      },
      {
        status: 400,
        headers: buildHeaders(),
      },
    );
  }

  const payload = normalizeWebhookPayload(rawBody);
  if (!payload?.sessionId || !Array.isArray(payload.annotations)) {
    return Response.json(
      {
        ok: false,
        error: "Invalid Agentation webhook payload",
      },
      {
        status: 400,
        headers: buildHeaders(),
      },
    );
  }

  const entry = await storeWebhook(payload);
  return Response.json(
    {
      ok: true,
      stored: entry,
      count: webhookEvents.length,
    },
    {
      headers: buildHeaders(),
    },
  );
}

export function getAgentationWebhookPath() {
  return AGENTATION_WEBHOOK_PATH;
}
