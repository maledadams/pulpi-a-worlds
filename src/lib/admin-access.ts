import { notFound } from "@tanstack/react-router";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function parseAllowedHosts() {
  const raw =
    (typeof process !== "undefined" ? process.env.ADMIN_ALLOWED_HOSTS : "") ||
    (typeof process !== "undefined" ? process.env.VITE_ADMIN_ALLOWED_HOSTS : "") ||
    import.meta.env.VITE_ADMIN_ALLOWED_HOSTS ||
    "";

  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

async function getCurrentHostname() {
  if (typeof window !== "undefined") {
    return window.location.hostname.toLowerCase();
  }

  const dynamicImport = (0, eval)(
    'specifier => import(specifier)',
  ) as (specifier: string) => Promise<{ getRequestHost: (opts?: { xForwardedHost?: boolean }) => string }>;
  const { getRequestHost } = await dynamicImport("@tanstack/start-server-core");
  return getRequestHost({ xForwardedHost: true }).toLowerCase();
}

export function shouldShowAdminAccessNotice() {
  if (import.meta.env.DEV) return false;
  return parseAllowedHosts().length > 0;
}

export async function enforceAdminAccess() {
  if (import.meta.env.DEV) return;

  const host = (await getCurrentHostname()).split(":")[0];
  if (LOCAL_HOSTS.has(host)) return;

  const allowedHosts = new Set(parseAllowedHosts());
  if (!allowedHosts.has(host)) {
    throw notFound();
  }
}
