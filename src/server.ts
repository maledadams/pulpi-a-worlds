import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { withSecurityHeaders } from "./lib/security-headers";
import { maybeHandleBirthdayConfirmRequest, processBirthdayEmailsInternal } from "./lib/public-forms";
import { maybeHandleOrderConfirmRequest } from "./lib/manual-orders";

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

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return finalizeResponse(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return finalizeResponse(request, brandedErrorResponse());
    }
  },
  async scheduled(_controller: unknown, _env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    ctx.waitUntil(processBirthdayEmailsInternal());
  },
};
