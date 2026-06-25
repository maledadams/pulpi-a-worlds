import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);
const ACCESS_EMAIL_HEADER = "cf-access-authenticated-user-email";
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
const ACCESS_AUD_ENV = "CF_ACCESS_AUD";
const ACCESS_TEAM_DOMAIN_ENV = "CF_ACCESS_TEAM_DOMAIN";
const SETTINGS_KEY = "admin_settings";
const accessJwksCache = new Map<string, unknown>();

function parseCsv(raw: string) {
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function getServerEnv(name: string) {
  return typeof process !== "undefined" ? process.env[name] ?? "" : "";
}

function normalizeTeamDomain(raw: string) {
  const value = raw.trim();
  if (!value) return "";

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.origin;
  } catch {
    return "";
  }
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

function normalizeHost(raw: string) {
  return raw.trim().toLowerCase().split(":")[0];
}

function getAllowedAdminHosts() {
  return parsePublicAllowedHosts().filter((host) => !LOCAL_HOSTS.has(host));
}

async function getWorkerEnv() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return ((workerModule as { env?: { DB?: D1Database } }).env ?? {}) as { DB?: D1Database };
  } catch {
    return {} as { DB?: D1Database };
  }
}

async function getPersistedAdminAllowedEmails() {
  const workerEnv = await getWorkerEnv();
  const db = workerEnv.DB;
  if (!db) return [] as string[];

  try {
    const row = await db
      .prepare("SELECT value_json FROM app_settings WHERE key = ? LIMIT 1")
      .bind(SETTINGS_KEY)
      .first<{ value_json: string }>();

    if (!row?.value_json) return [] as string[];

    const parsed = JSON.parse(row.value_json) as {
      adminAllowedEmails?: unknown;
    };

    return Array.isArray(parsed.adminAllowedEmails)
      ? parsed.adminAllowedEmails
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean)
      : [];
  } catch {
    return [] as string[];
  }
}

function emailMatchesAllowlist(email: string, allowedEmails: Set<string>, allowedDomains: string[]) {
  if (allowedEmails.has(email)) return true;
  return allowedDomains.some((domain) => email.endsWith(domain));
}

function getAccessVerificationConfig() {
  return {
    aud: getServerEnv(ACCESS_AUD_ENV).trim(),
    teamDomain: normalizeTeamDomain(getServerEnv(ACCESS_TEAM_DOMAIN_ENV)),
  };
}

async function getAccessJwks(teamDomain: string) {
  const { createRemoteJWKSet } = await import("jose");
  const cached = accessJwksCache.get(teamDomain);
  if (cached) return cached;

  const next = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
  accessJwksCache.set(teamDomain, next);
  return next;
}

async function verifyAccessJwt(token: string, expectedEmail: string) {
  const { aud, teamDomain } = getAccessVerificationConfig();
  if (!aud || !teamDomain) {
    return false;
  }

  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, await getAccessJwks(teamDomain), {
      audience: aud,
      issuer: teamDomain,
    });

    const jwtEmail =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return !jwtEmail || jwtEmail === expectedEmail;
  } catch {
    return false;
  }
}

const assertAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader, getRequestHost, setResponseHeader } = await import("@tanstack/react-start/server");

  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie, Cf-Access-Authenticated-User-Email, Cf-Access-Jwt-Assertion");

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

  if (!(await verifyAccessJwt(accessJwt, email))) {
    throw notFound();
  }

  const persistedAllowedEmails = await getPersistedAdminAllowedEmails();
  const allowedEmails = new Set([...parseServerAllowedEmails(), ...persistedAllowedEmails]);
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

export function isAdminRoutePath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isConfiguredAdminHost(host: string) {
  const normalizedHost = normalizeHost(host);
  if (!normalizedHost || LOCAL_HOSTS.has(normalizedHost)) return false;
  return getAllowedAdminHosts().includes(normalizedHost);
}

export function getPrimaryAdminHost() {
  return getAllowedAdminHosts()[0] ?? "";
}

export async function enforceAdminAccess() {
  if (import.meta.env.DEV) return;
  await assertAdminAccess();
}
