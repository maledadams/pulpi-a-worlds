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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname === "www.pulpinastore.com") {
        requestUrl.hostname = "pulpinastore.com";
        return finalizeResponse(request, Response.redirect(requestUrl, 308));
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
