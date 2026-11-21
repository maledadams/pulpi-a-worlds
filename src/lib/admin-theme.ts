import { createServerFn } from "@tanstack/react-start";
import { useEffect, useSyncExternalStore } from "react";
import { getAdminAccountEmail } from "@/lib/admin-access";

// Admin light/dark mode. Saved per admin account (one app_settings row per
// email) so it follows you across devices, and cached in localStorage so the
// page opens in the right mode before the server answers (see the inline
// script in __root.tsx). styles.css reads data-admin-theme on <html>.

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

const settingsKey = (email: string) => `admin_theme:${email}`;

async function getDatabase() {
  try {
    const workerSpecifier = "cloudflare:workers";
    const workerModule = await import(workerSpecifier);
    return (workerModule as { env?: { DB?: D1Database } }).env?.DB ?? null;
  } catch {
    return null;
  }
}

export const getAdminTheme = createServerFn({ method: "GET" }).handler(async (): Promise<AdminTheme | null> => {
  const email = await getAdminAccountEmail();
  const { setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseHeader("Cache-Control", "private, no-store");
  const db = await getDatabase();
  if (!db) return null;
  try {
    const row = await db
      .prepare("SELECT value_json FROM app_settings WHERE key = ? LIMIT 1")
      .bind(settingsKey(email))
      .first<{ value_json: string }>();
    if (!row) return null;
    return JSON.parse(row.value_json) === "dark" ? "dark" : "light";
  } catch {
    return null;
  }
});

export const saveAdminTheme = createServerFn({ method: "POST" })
  .inputValidator((theme: AdminTheme): AdminTheme => (theme === "dark" ? "dark" : "light"))
  .handler(async ({ data }) => {
    const email = await getAdminAccountEmail();
    const db = await getDatabase();
    if (!db) return;
    await db
      .prepare(`
        INSERT INTO app_settings (key, value_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = CURRENT_TIMESTAMP
      `)
      .bind(settingsKey(email), JSON.stringify(data))
      .run();
  });

export function applyAdminTheme(theme: AdminTheme) {
  document.documentElement.setAttribute("data-admin-theme", theme);
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode etc.: the account setting still applies on the next load.
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-admin-theme"] });
  return () => observer.disconnect();
}

const readTheme = (): AdminTheme =>
  document.documentElement.getAttribute("data-admin-theme") === "dark" ? "dark" : "light";

/** The current mode; re-renders when it changes. */
export function useAdminTheme() {
  return useSyncExternalStore(subscribe, readTheme, () => "light" as AdminTheme);
}

let syncedWithAccount = false;

/** Once per page load, adopt the mode saved on this admin's account. */
export function useAdminThemeSync() {
  useEffect(() => {
    if (syncedWithAccount) return;
    syncedWithAccount = true;
    getAdminTheme()
      .then((theme) => {
        if (theme) applyAdminTheme(theme);
      })
      .catch(() => {});
  }, []);
}
