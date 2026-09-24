import { SITE_URL } from "@/lib/seo";

/**
 * Nightly proof that the live storefront can still report to GA4.
 *
 * Production silently served an Aug 1 build for six weeks. `wrangler deploy`
 * without --env targets a different worker than the one holding the
 * pulpinastore.com custom domain, so every deploy "succeeded" while the domain
 * kept serving the old build. Nothing threw, nothing logged, and the only
 * symptom was GA4 quietly going empty - which went unnoticed until the numbers
 * were questioned six weeks later.
 *
 * scripts/verify-deploy.mjs catches that at deploy time, but only for deploys
 * that actually go through `pnpm deploy:production`. This is the backstop for
 * every other way the live site can lose analytics without anyone touching
 * this repo: a deploy run by hand, a rollback from the Cloudflare dashboard,
 * the custom domain being repointed at another worker, an edited CSP. It
 * re-checks the real public URL once a night and emails the shop owner the
 * moment the page stops carrying a working Google tag, so the worst case
 * becomes one quiet day instead of six silent weeks.
 */

const GA_MEASUREMENT_ID = "G-N6LGC4Z2PN";

type WorkerEnv = {
  ORDER_NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
};

async function getWorkerEnv() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return ((workerModule as { env?: WorkerEnv }).env ?? {}) as WorkerEnv;
  } catch {
    return {} as WorkerEnv;
  }
}

function findProblems(html: string, csp: string) {
  const connectSrc = /connect-src([^;]*)/.exec(csp)?.[1] ?? "";
  const scriptSrc = /script-src([^;]*)/.exec(csp)?.[1] ?? "";
  const problems: string[] = [];

  if (!html.includes(GA_MEASUREMENT_ID)) {
    problems.push(`La página ya no contiene la etiqueta de GA4 (${GA_MEASUREMENT_ID}).`);
  }
  if (!html.includes("googletagmanager.com/gtag/js")) {
    problems.push("La página ya no carga gtag.js.");
  }
  if (!scriptSrc.includes("https://www.googletagmanager.com")) {
    problems.push("El CSP (script-src) ya no permite cargar gtag.js.");
  }
  // A CSP wildcard covers subdomains only - *.analytics.google.com does NOT
  // match the bare apex that GA4 routes a share of its hits to. That single
  // omission is what silently dropped events before, so it is checked by name.
  if (!connectSrc.includes("https://analytics.google.com")) {
    problems.push(
      "El CSP (connect-src) ya no permite analytics.google.com (el dominio raíz), así que GA4 no puede enviar eventos.",
    );
  }
  if (!connectSrc.includes("https://*.google-analytics.com")) {
    problems.push(
      "El CSP (connect-src) ya no permite *.google-analytics.com, así que GA4 no puede enviar eventos.",
    );
  }

  return problems;
}

async function sendAlert(problems: string[]) {
  const workerEnv = await getWorkerEnv();
  const apiKey = workerEnv.RESEND_API_KEY ?? process.env.RESEND_API_KEY ?? "";
  const from = workerEnv.RESEND_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "";
  const to = workerEnv.ORDER_NOTIFICATION_EMAIL ?? process.env.ORDER_NOTIFICATION_EMAIL ?? "";
  if (!apiKey || !from || !to) {
    console.error("[analytics-health] alert not sent - Resend env vars are not configured");
    return;
  }

  const items = problems.map((problem) => `<li style="margin-bottom:8px">${problem}</li>`).join("");
  const html = `
    <div style="background:#fbf4e8;padding:32px 16px;font-family:Arial,sans-serif">
      <div style="max-width:560px;margin:auto;background:#ffffff;border:1px solid #231717;border-radius:20px;padding:32px">
        <p style="letter-spacing:.18em;text-transform:uppercase;color:#6b5a55;font-size:12px;margin:0 0 4px">Pulpiña RD</p>
        <h1 style="font-size:24px;margin:0 0 12px;color:#231717">Google Analytics dejó de registrar</h1>
        <p style="font-size:14px;line-height:1.6;color:#231717;margin:0 0 16px">
          La revisión automática de <strong>${SITE_URL}</strong> encontró esto:
        </p>
        <ul style="font-size:14px;line-height:1.6;color:#231717;padding-left:20px;margin:0 0 20px">${items}</ul>
        <p style="font-size:13px;line-height:1.6;color:#6b5a55;margin:0">
          Casi siempre significa que el sitio quedó sirviendo una versión vieja. Volver a publicar con
          <code style="background:#f1e9dc;padding:2px 6px;border-radius:4px">pnpm deploy:production</code>
          lo corrige y verifica solo.
        </p>
      </div>
    </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "⚠️ Google Analytics dejó de registrar en pulpinastore.com",
      text: `La revisión automática de ${SITE_URL} encontró:\n\n${problems.map((p) => `- ${p}`).join("\n")}\n\nCasi siempre significa que el sitio quedó sirviendo una versión vieja. Volver a publicar con "pnpm deploy:production" lo corrige y verifica solo.`,
      html,
    }),
  });

  console.log(`[analytics-health] alert email -> ${response.status}`);
}

export async function checkAnalyticsHealth() {
  // Cache-bust so this grades what the worker renders now, not an edge copy.
  const url = `${SITE_URL}/?analytics-health=${Date.now()}`;

  let html: string;
  let csp: string;
  try {
    const response = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    if (!response.ok) {
      console.error(`[analytics-health] ${url} returned ${response.status}`);
      return;
    }
    html = await response.text();
    csp = response.headers.get("content-security-policy") ?? "";
  } catch (error) {
    // A network blip is not evidence that analytics broke, so this stays a log
    // rather than an email - a real outage will still be caught tomorrow.
    console.error("[analytics-health] check could not run", error);
    return;
  }

  const problems = findProblems(html, csp);
  if (problems.length === 0) {
    console.log("[analytics-health] ok - live site carries a working Google tag");
    return;
  }

  console.error(`[analytics-health] FAILING: ${problems.join(" | ")}`);
  await sendAlert(problems);
}
