import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security-headers";
import { maybeHandleBirthdayConfirmRequest, processBirthdayEmailsInternal } from "./lib/public-forms";
import { maybeHandleOrderConfirmRequest } from "./lib/manual-orders";
import { submitSitemapToIndexNow } from "./lib/indexnow";
import { checkAnalyticsHealth } from "./lib/analytics-health";

/** Midnight in the Dominican Republic (UTC-4, no DST). */
const MIDNIGHT_RD_CRON = "0 4 * * *";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

function withRequestSeoHeaders(request: Request, response: Response) {
  // The portfolio deployment noindexes every single page (it's a demo
  // mirror, not a second real storefront Google should ever list) -
  // everywhere else only admin/cart/checkout pages get noindexed.
  const noindexEverything = typeof process !== "undefined" && process.env.PORTFOLIO_NOINDEX_ALL === "true";
  const pathname = new URL(request.url).pathname;
  if (!noindexEverything && !/^\/(?:admin(?:\/|$)|acceso-admin$|carrito$|solicitud$)/.test(pathname)) {
    return response;
  }
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

function finalizeResponse(request: Request, response: Response) {
  return withSecurityHeaders(withRequestSeoHeaders(request, response));
}

// Old product slugs Google indexed before a rename/merge, redirected to
// where that product actually lives now - keeps whatever search ranking
// those old URLs had instead of just handing back a 404. Two of these
// (mano-esqueleto, adorno-de-3-calaveras) were duplicate listings merged
// into their surviving sibling earlier; the rest are straightforward
// slug changes from a product being renamed to its real name.
const PRODUCT_SLUG_REDIRECTS: Record<string, string> = {
  "correa-negra-con-relieve-calaveras": "correa-negra-con-relieve-y-hebilla-de-calaveras",
  "correa-negra-con-logo-kiss-y-tachuelas-redondas": "correa-negra-con-hebilla-kiss-y-tachuelas-redondas",
  "pulsera-de-cuerina-con-adorno-de-3-calaveras": "pulsera-de-cuerina-con-adorno-calavera",
  "pulsera-de-cuerina-con-mano-esqueleto": "pulsera-de-cuerina-con-tachuela-esqueleto",
  "bisu-rosario-negro-con-cruz-plat-y-punto-negro": "rosario-negro-con-cruz-plateada-y-punto-negro",
  "correa-negra-con-tachuelas-circulares-calaveras": "correa-negra-con-tachuelas-circulares-y-hebilla-de-calaveras",
  "bisu-rosario-negro-con-luna-plat-y-piedra-magica": "rosario-negro-con-luna-plateada-y-piedra-m-gica",
  "botas-negras-sencillas-dr-martins": "botas-martins",
};

function getProductSlugRedirect(pathname: string): string | null {
  const match = /^\/producto\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const newSlug = PRODUCT_SLUG_REDIRECTS[match[1]];
  return newSlug ? `/producto/${newSlug}` : null;
}

// Every page under here is the same for every anonymous visitor - no
// cookies, no per-request personalization (cart lives in localStorage on
// the client, never touches SSR). Admin/checkout/server-fn traffic is
// excluded so nothing session-specific ever risks getting cached.
const EDGE_CACHEABLE_PATH = /^\/(?!admin(?:\/|$)|acceso-admin$|carrito$|solicitud$|_serverFn)/;

function isEdgeCacheable(request: Request, pathname: string) {
  return request.method === "GET" && EDGE_CACHEABLE_PATH.test(pathname);
}

async function renderAndFinalize(request: Request, env: unknown, ctx: unknown) {
  const handler = await getServerEntry();
  const response = await handler.fetch(request, env, ctx);
  return finalizeResponse(request, await normalizeCatastrophicSsrResponse(response));
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname === "www.pulpinastore.com") {
        requestUrl.hostname = "pulpinastore.com";
        return finalizeResponse(request, Response.redirect(requestUrl, 308));
      }

      const redirectedProductPath = getProductSlugRedirect(requestUrl.pathname);
      if (redirectedProductPath) {
        requestUrl.pathname = redirectedProductPath;
        return finalizeResponse(request, Response.redirect(requestUrl, 301));
      }

      const orderConfirmResponse = await maybeHandleOrderConfirmRequest(request);
      if (orderConfirmResponse) {
        return finalizeResponse(request, orderConfirmResponse);
      }

      const birthdayConfirmResponse = await maybeHandleBirthdayConfirmRequest(request);
      if (birthdayConfirmResponse) {
        return finalizeResponse(request, birthdayConfirmResponse);
      }

      if (!isEdgeCacheable(request, requestUrl.pathname)) {
        return await renderAndFinalize(request, env, ctx);
      }

      const cache = caches.default;
      const cacheKey = new Request(requestUrl.toString(), request);
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      const finalResponse = await renderAndFinalize(request, env, ctx);
      if (finalResponse.status === 200 && finalResponse.headers.get("Cache-Control")?.includes("max-age")) {
        (ctx as { waitUntil(promise: Promise<unknown>): void }).waitUntil(
          cache.put(cacheKey, finalResponse.clone()),
        );
      }
      return finalResponse;
    } catch (error) {
      console.error(error);
      return finalizeResponse(request, brandedErrorResponse());
    }
  },
  async scheduled(
    controller: { cron?: string },
    _env: unknown,
    ctx: { waitUntil(promise: Promise<unknown>): void },
  ) {
    // 04:00 UTC is midnight in the Dominican Republic, which stays on UTC-4
    // year round - no daylight saving to drift against.
    if (controller?.cron === MIDNIGHT_RD_CRON) {
      ctx.waitUntil(submitSitemapToIndexNow());
      // Backstop for analytics silently dying between deploys - see
      // lib/analytics-health.ts for why one quiet night is the worst case now.
      ctx.waitUntil(checkAnalyticsHealth());
      return;
    }
    ctx.waitUntil(processBirthdayEmailsInternal());
  },
};
