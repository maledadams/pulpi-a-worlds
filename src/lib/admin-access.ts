import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";

function parseCsv(raw: string) {
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function getServerEnv(name: string) {
  return typeof process !== "undefined" ? process.env[name] ?? "" : "";
}

function parseServerAllowedHosts() {
  return parseCsv(getServerEnv("ADMIN_ALLOWED_HOSTS"));
}

function parseServerAllowedEmails() {
  return parseCsv(getServerEnv("ADMIN_ALLOWED_EMAILS"));
}

function parseServerAllowedEmailDomains() {
  return parseCsv(getServerEnv("ADMIN_ALLOWED_EMAIL_DOMAINS")).map((entry) =>
    entry.startsWith("@") ? entry : `@${entry}`,
  );
}

function parsePublicAllowedHosts() {
  return parseCsv(
    getServerEnv("ADMIN_ALLOWED_HOSTS") ||
      getServerEnv("VITE_ADMIN_ALLOWED_HOSTS") ||
      import.meta.env.VITE_ADMIN_ALLOWED_HOSTS ||
      "",
  );
}

function emailMatchesAllowlist(email: string, allowedEmails: Set<string>, allowedDomains: string[]) {
  if (allowedEmails.has(email)) return true;
  return allowedDomains.some((domain) => email.endsWith(domain));
}

const assertAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader, getRequestHost, setResponseHeaders } = await import("@tanstack/react-start/server");

  setResponseHeaders({
    "Cache-Control": "private, no-store",
    Vary: "Cookie, Cf-Access-Authenticated-User-Email, Cf-Access-Jwt-Assertion",
  });

  const host = getRequestHost({ xForwardedHost: true }).toLowerCase().split(":")[0];
  if (LOCAL_HOSTS.has(host)) return;

  const allowedHosts = new Set(parseServerAllowedHosts());
  if (allowedHosts.size > 0 && !allowedHosts.has(host)) {
    throw notFound();
  }

  const email = getRequestHeader(ACCESS_EMAIL_HEADER)?.trim().toLowerCase();
  const accessJwt = getRequestHeader(ACCESS_JWT_HEADER);
  if (!email || !accessJwt) {
    throw notFound();
  }

  const allowedEmails = new Set(parseServerAllowedEmails());
  const allowedDomains = parseServerAllowedEmailDomains();
  const hasAppAllowlist = allowedEmails.size > 0 || allowedDomains.length > 0;
  if (hasAppAllowlist && !emailMatchesAllowlist(email, allowedEmails, allowedDomains)) {
    throw notFound();
  }
});

export function shouldShowAdminAccessNotice() {
  if (import.meta.env.DEV) return false;
  return parsePublicAllowedHosts().length > 0;
}

export async function enforceAdminAccess() {
  if (import.meta.env.DEV) return;
  await assertAdminAccess();
}
