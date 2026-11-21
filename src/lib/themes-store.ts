// Theme storage on D1 (spec 2026-11-16-pulpina-theme-engine-design §4, §6, §7).
// Plain functions over a D1 database, so they run in vitest against SQLite;
// src/lib/themes.ts wraps them in admin-checked server functions.
//
// - Every save is a draft (`json`, `version`). The storefront only ever renders the
//   published copy (`published_json`), so editing a live theme changes nothing
//   until "Publicar". Admin preview renders the draft.
// - Saves carry the version they started from; a stale one is refused, nobody's
//   work is overwritten silently. The last THEME_VERSIONS_KEPT saves are kept.
// - Active theme: preview (admin only) → manual override → schedule → Tema general.
// - Tema general (DEFAULT_THEME_ID) is the default look, editable like any theme: it is
//   never scheduled, activated or deleted, and shows whenever nothing else is on. Until
//   it is published with changes it changes nothing (an empty theme emits no CSS).

import { parseTheme, themeSchema, type Theme, type ThemeDocument } from "@/lib/theme-schema";
import {
  activeEntryAt,
  toSantoDomingoInput,
  validateEntry,
  type ScheduleEntry,
} from "@/lib/theme-schedule";

export const THEME_VERSIONS_KEPT = 10;
const OVERRIDE_KEY = "theme_manual_override";
const STALE_MESSAGE = "Alguien más cambió este tema, recarga.";
const NOT_PUBLISHED_MESSAGE = "Publica el tema antes de programarlo o activarlo.";
export const DEFAULT_THEME_ID = "tema_general";
export const DEFAULT_THEME_NAME = "Tema general";
const DEFAULT_LOCKED_MESSAGE =
  "El Tema general es el predeterminado: se ve siempre que no haya otro tema, no se programa ni se activa.";

export async function ensureThemeTables(db: D1Database) {
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        json TEXT NOT NULL,
        version INTEGER NOT NULL,
        published_json TEXT,
        published_version INTEGER,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT NOT NULL
      )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS theme_versions (
        theme_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        json TEXT NOT NULL,
        saved_at TEXT NOT NULL,
        saved_by TEXT NOT NULL,
        PRIMARY KEY (theme_id, version)
      )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS theme_schedule (
        id TEXT PRIMARY KEY,
        theme_id TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        repeat_yearly INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS theme_assets (
        id TEXT PRIMARY KEY,
        r2_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        bytes INTEGER NOT NULL,
        variants_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      )`,
    ),
    db.prepare(
      "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    ),
  ]);
  // The theme's color in the admin calendar (Lucia, 2026-11-20). Added later: databases
  // made before it get the column here; one that already has it refuses, which is fine.
  for (const statement of [
    "ALTER TABLE themes ADD COLUMN calendar_color TEXT",
    // Versions have names, and the draft can sit on an older one without copying it
    // (Lucia, 2026-11-20).
    "ALTER TABLE theme_versions ADD COLUMN label TEXT",
    "ALTER TABLE themes ADD COLUMN based_on_version INTEGER",
  ]) {
    try {
      await db.exec(statement);
    } catch {
      // Already there.
    }
  }
}

type ThemeRow = {
  id: string;
  name: string;
  json: string;
  version: number;
  published_json: string | null;
  published_version: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string;
  calendar_color?: string | null;
  based_on_version?: number | null;
};

export type ThemeAssetVariant = { width: number; height: number; key: string };

type AssetRow = {
  id: string;
  r2_key: string;
  kind?: string;
  width: number;
  height: number;
  variants_json: string;
};

function parseVariants(json: string): ThemeAssetVariant[] {
  const value = safeJson(json);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is ThemeAssetVariant =>
      typeof entry?.key === "string" &&
      Number.isFinite(entry?.width) &&
      Number.isFinite(entry?.height),
  );
}

/** asset id -> themes using it, in their draft or their published copy. */
function assetUsage(
  themes: Array<{ id: string; name: string; json: string; published_json: string | null }>,
) {
  const usage = new Map<string, Array<{ id: string; name: string }>>();
  for (const theme of themes) {
    const ids = new Set<string>();
    for (const json of [theme.json, theme.published_json]) {
      const parsed = json ? parseTheme(safeJson(json)) : null;
      if (parsed) for (const id of themeAssetIds(parsed)) ids.add(id);
    }
    for (const id of ids)
      usage.set(id, [...(usage.get(id) ?? []), { id: theme.id, name: theme.name }]);
  }
  return usage;
}

type ScheduleRow = {
  id: string;
  theme_id: string;
  starts_at: string;
  ends_at: string;
  repeat_yearly: number;
};

export type ThemeOverride = { themeId: string; activatedAt: string; activatedBy: string };

export type ThemeSummary = {
  id: string;
  name: string;
  version: number;
  publishedVersion: number | null;
  updatedAt: string;
  updatedBy: string;
  isActive: boolean;
  isScheduled: boolean;
  hasUnpublishedChanges: boolean;
  /** Tema general: the default look, shown whenever no other theme is on. */
  isDefault: boolean;
  /** #rrggbb for the admin calendar; null = the editor picks one from its palette. */
  calendarColor: string | null;
};

export type ActiveTheme = {
  themeId: string;
  name: string;
  source: "preview" | "override" | "schedule" | "default";
  theme: Theme;
};

function emptyDocument(name: string): ThemeDocument {
  return themeSchema.parse({ schemaVersion: 1, name });
}

/** Strict validation for saves; throws the first problem in Spanish. */
function validateDocument(doc: unknown): ThemeDocument {
  const result = themeSchema.safeParse(doc);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "El tema no es válido.");
  return result.data;
}

const toEntry = (row: ScheduleRow): ScheduleEntry => ({
  id: row.id,
  themeId: row.theme_id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  repeatYearly: Boolean(row.repeat_yearly),
});

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function createThemeStore(
  db: D1Database,
  options: { ready: (db: D1Database) => Promise<void>; now?: () => number },
) {
  const now = options.now ?? Date.now;
  const iso = () => new Date(now()).toISOString();
  const ready = () => options.ready(db);

  async function row(id: string) {
    await ready();
    return db.prepare("SELECT * FROM themes WHERE id = ?").bind(id).first<ThemeRow>();
  }

  async function requireRow(id: string) {
    const found = await row(id);
    if (!found) throw new Error("El tema ya no existe.");
    return found;
  }

  async function getOverride(): Promise<ThemeOverride | null> {
    await ready();
    const found = await db
      .prepare("SELECT value_json FROM app_settings WHERE key = ?")
      .bind(OVERRIDE_KEY)
      .first<{ value_json: string }>();
    if (!found) return null;
    try {
      const value = JSON.parse(found.value_json) as ThemeOverride | null;
      return value && typeof value.themeId === "string" ? value : null;
    } catch {
      return null;
    }
  }

  async function listSchedule(): Promise<ScheduleEntry[]> {
    await ready();
    const { results } = await db
      .prepare(
        "SELECT id, theme_id, starts_at, ends_at, repeat_yearly FROM theme_schedule ORDER BY starts_at",
      )
      .all<ScheduleRow>();
    return (results ?? []).map(toEntry);
  }

  /** Writes a new draft version and trims history; refuses a stale base version. */
  async function writeDraft(
    id: string,
    doc: ThemeDocument,
    baseVersion: number,
    by: string,
    label?: string | null,
  ) {
    const version = baseVersion + 1;
    const at = iso();
    const json = JSON.stringify(doc);
    const result = await db
      .prepare(
        "UPDATE themes SET name = ?, json = ?, version = ?, based_on_version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?",
      )
      .bind(doc.name, json, version, version, at, by, id, baseVersion)
      .run();
    if (!result.meta?.changes) {
      if (!(await row(id))) throw new Error("El tema ya no existe.");
      throw new Error(STALE_MESSAGE);
    }
    await db.batch([
      db
        .prepare(
          "INSERT OR REPLACE INTO theme_versions (theme_id, version, json, saved_at, saved_by, label) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, version, json, at, by, label?.trim().slice(0, 60) || null),
      db
        .prepare(
          `DELETE FROM theme_versions WHERE theme_id = ? AND version NOT IN (
            SELECT version FROM theme_versions WHERE theme_id = ? ORDER BY version DESC LIMIT ?
          )`,
        )
        .bind(id, id, THEME_VERSIONS_KEPT),
    ]);
    return { version };
  }

  async function insertTheme(doc: ThemeDocument, by: string) {
    await ready();
    const id = newId("tema");
    const at = iso();
    const json = JSON.stringify(doc);
    await db.batch([
      db
        .prepare(
          "INSERT INTO themes (id, name, json, version, created_at, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?, ?)",
        )
        .bind(id, doc.name, json, at, at, by),
      db
        .prepare(
          "INSERT INTO theme_versions (theme_id, version, json, saved_at, saved_by) VALUES (?, 1, ?, ?, ?)",
        )
        .bind(id, json, at, by),
    ]);
    return { id, version: 1 };
  }

  /** Tema general always exists (created empty the first time anyone looks). */
  async function ensureDefaultTheme() {
    await ready();
    const at = iso();
    const json = JSON.stringify(emptyDocument(DEFAULT_THEME_NAME));
    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO themes (id, name, json, version, created_at, updated_at, updated_by) VALUES (?, ?, ?, 1, ?, ?, ?)",
        )
        .bind(DEFAULT_THEME_ID, DEFAULT_THEME_NAME, json, at, at, "sistema"),
      db
        .prepare(
          "INSERT OR IGNORE INTO theme_versions (theme_id, version, json, saved_at, saved_by) VALUES (?, 1, ?, ?, ?)",
        )
        .bind(DEFAULT_THEME_ID, json, at, "sistema"),
    ]);
  }

  async function requirePublished(themeId: string) {
    if (themeId === DEFAULT_THEME_ID) throw new Error(DEFAULT_LOCKED_MESSAGE);
    const found = await requireRow(themeId);
    if (!found.published_json) throw new Error(NOT_PUBLISHED_MESSAGE);
    return found;
  }

  return {
    async list(): Promise<ThemeSummary[]> {
      await ensureDefaultTheme();
      const [{ results }, override, schedule] = await Promise.all([
        db
          .prepare(
            "SELECT id, name, version, published_version, updated_at, updated_by, calendar_color FROM themes ORDER BY updated_at DESC",
          )
          .all<
            Pick<
              ThemeRow,
              | "id"
              | "name"
              | "version"
              | "published_version"
              | "updated_at"
              | "updated_by"
              | "calendar_color"
            >
          >(),
        getOverride(),
        listSchedule(),
      ]);
      const scheduledIds = new Set(schedule.map((entry) => entry.themeId));
      // Tema general first, then the rest, most recently edited first.
      const sorted = [...(results ?? [])].sort(
        (a, b) => Number(b.id === DEFAULT_THEME_ID) - Number(a.id === DEFAULT_THEME_ID),
      );
      return sorted.map((theme) => ({
        id: theme.id,
        name: theme.name,
        version: theme.version,
        publishedVersion: theme.published_version,
        updatedAt: theme.updated_at,
        updatedBy: theme.updated_by,
        isActive: override?.themeId === theme.id,
        isScheduled: scheduledIds.has(theme.id),
        hasUnpublishedChanges: theme.published_version !== theme.version,
        isDefault: theme.id === DEFAULT_THEME_ID,
        calendarColor: /^#[0-9a-f]{6}$/i.test(theme.calendar_color ?? "")
          ? theme.calendar_color!
          : null,
      }));
    },

    async get(id: string) {
      const found = await row(id);
      if (!found) return null;
      return {
        id: found.id,
        name: found.name,
        version: found.version,
        publishedVersion: found.published_version,
        publishedAt: found.published_at,
        /** The saved version the draft is (null on themes from before this existed). */
        basedOnVersion: found.based_on_version ?? null,
        updatedAt: found.updated_at,
        updatedBy: found.updated_by,
        // A draft that no longer parses strictly still opens: the lenient reader keeps what's valid.
        doc: (themeSchema.safeParse(safeJson(found.json)).data ??
          parseTheme(safeJson(found.json)) ??
          emptyDocument(found.name)) as ThemeDocument,
      };
    },

    create(name: string, by: string) {
      return insertTheme(validateDocument({ schemaVersion: 1, name }), by);
    },

    async duplicate(id: string, name: string, by: string) {
      const source = await requireRow(id);
      const doc = validateDocument({ ...(safeJson(source.json) as object), name });
      return insertTheme(doc, by);
    },

    async save(id: string, doc: unknown, baseVersion: number, by: string, label?: string | null) {
      await ready();
      const valid = validateDocument(doc);
      // Tema general keeps its name: it is how the list tells it apart.
      return writeDraft(
        id,
        id === DEFAULT_THEME_ID ? { ...valid, name: DEFAULT_THEME_NAME } : valid,
        baseVersion,
        by,
        label,
      );
    },

    async rename(id: string, name: string, baseVersion: number, by: string) {
      if (id === DEFAULT_THEME_ID) throw new Error("El Tema general no se puede renombrar.");
      const found = await requireRow(id);
      return writeDraft(
        id,
        validateDocument({ ...(safeJson(found.json) as object), name }),
        baseVersion,
        by,
      );
    },

    async publish(id: string, baseVersion: number, by: string) {
      await ready();
      const at = iso();
      const result = await db
        .prepare(
          "UPDATE themes SET published_json = json, published_version = version, published_at = ?, updated_by = ? WHERE id = ? AND version = ?",
        )
        .bind(at, by, id, baseVersion)
        .run();
      if (!result.meta?.changes) {
        if (!(await row(id))) throw new Error("El tema ya no existe.");
        throw new Error(STALE_MESSAGE);
      }
      return { publishedVersion: baseVersion };
    },

    /** The theme's calendar color; null goes back to the automatic one. */
    async setCalendarColor(id: string, color: string | null) {
      if (color !== null && !/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Color inválido.");
      await requireRow(id);
      await db
        .prepare("UPDATE themes SET calendar_color = ? WHERE id = ?")
        .bind(color?.toLowerCase() ?? null, id)
        .run();
    },

    async remove(id: string) {
      if (id === DEFAULT_THEME_ID) throw new Error("El Tema general no se puede borrar.");
      await requireRow(id);
      if ((await getOverride())?.themeId === id) {
        throw new Error("Este tema está activo ahora. Desactívalo antes de borrarlo.");
      }
      if ((await listSchedule()).some((entry) => entry.themeId === id)) {
        throw new Error("Este tema está programado. Quítalo del calendario antes de borrarlo.");
      }
      await db.batch([
        db.prepare("DELETE FROM theme_versions WHERE theme_id = ?").bind(id),
        db.prepare("DELETE FROM themes WHERE id = ?").bind(id),
      ]);
    },

    async versions(id: string) {
      await ready();
      const { results } = await db
        .prepare(
          "SELECT version, saved_at, saved_by, label FROM theme_versions WHERE theme_id = ? ORDER BY version DESC",
        )
        .bind(id)
        .all<{ version: number; saved_at: string; saved_by: string; label: string | null }>();
      return (results ?? []).map((entry) => ({
        version: entry.version,
        savedAt: entry.saved_at,
        savedBy: entry.saved_by,
        label: entry.label ?? null,
      }));
    },

    async getVersion(id: string, version: number) {
      await ready();
      const found = await db
        .prepare("SELECT json FROM theme_versions WHERE theme_id = ? AND version = ?")
        .bind(id, version)
        .first<{ json: string }>();
      return found ? parseTheme(safeJson(found.json)) : null;
    },

    /**
     * Goes back to a saved version (Lucia, 2026-11-20): the draft becomes that version's
     * content WITHOUT a new history entry; one is written only when it is changed and saved.
     * The draft's version number still moves on, so a stale editor elsewhere can't overwrite.
     */
    async restore(id: string, version: number, baseVersion: number, by: string) {
      await ready();
      const found = await db
        .prepare("SELECT json FROM theme_versions WHERE theme_id = ? AND version = ?")
        .bind(id, version)
        .first<{ json: string }>();
      if (!found) throw new Error("Esa versión ya no existe.");
      const current = await requireRow(id);
      // Going back brings back the content, never an old name over a rename.
      const doc = validateDocument({ ...(safeJson(found.json) as object), name: current.name });
      const result = await db
        .prepare(
          "UPDATE themes SET json = ?, version = ?, based_on_version = ?, updated_at = ?, updated_by = ? WHERE id = ? AND version = ?",
        )
        .bind(JSON.stringify(doc), baseVersion + 1, version, iso(), by, id, baseVersion)
        .run();
      if (!result.meta?.changes) throw new Error(STALE_MESSAGE);
      return { version: baseVersion + 1 };
    },

    async exportJson(id: string) {
      const found = await requireRow(id);
      return JSON.stringify(safeJson(found.json), null, 2);
    },

    /** A theme document from a theme file (images and discounts already re-pointed). */
    async importDocument(doc: unknown, by: string) {
      const parsed = parseTheme(doc);
      if (!parsed) throw new Error("Ese archivo no es un tema válido.");
      await ready();
      const taken = await db
        .prepare("SELECT 1 AS x FROM themes WHERE name = ? LIMIT 1")
        .bind(parsed.name)
        .first<{ x: number }>();
      const name = taken ? `${parsed.name} (importado)`.slice(0, 60) : parsed.name;
      return insertTheme(validateDocument({ ...parsed, name }), by);
    },

    async importJson(json: string, by: string) {
      const parsed = parseTheme(safeJson(json));
      if (!parsed) throw new Error("Ese archivo no es un tema válido.");
      return insertTheme(
        validateDocument({ ...parsed, name: `${parsed.name} (importado)`.slice(0, 60) }),
        by,
      );
    },

    listSchedule,

    async saveScheduleEntry(entry: ScheduleEntry) {
      const problem = validateEntry(entry);
      if (problem) throw new Error(problem);
      await requirePublished(entry.themeId);
      // Overlaps are allowed: the most recently started range shows (theme-schedule.ts).
      await db
        .prepare(
          `INSERT INTO theme_schedule (id, theme_id, starts_at, ends_at, repeat_yearly, created_at) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET theme_id = excluded.theme_id, starts_at = excluded.starts_at,
             ends_at = excluded.ends_at, repeat_yearly = excluded.repeat_yearly`,
        )
        .bind(
          entry.id,
          entry.themeId,
          entry.startsAt,
          entry.endsAt,
          entry.repeatYearly ? 1 : 0,
          iso(),
        )
        .run();
    },

    async removeScheduleEntry(id: string) {
      await ready();
      await db.prepare("DELETE FROM theme_schedule WHERE id = ?").bind(id).run();
    },

    getOverride,

    async activate(themeId: string, by: string) {
      await requirePublished(themeId);
      const value: ThemeOverride = { themeId, activatedAt: iso(), activatedBy: by };
      await db
        .prepare(
          `INSERT INTO app_settings (key, value_json, updated_at) VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
        )
        .bind(OVERRIDE_KEY, JSON.stringify(value), iso())
        .run();
    },

    async deactivate() {
      await ready();
      await db.prepare("DELETE FROM app_settings WHERE key = ?").bind(OVERRIDE_KEY).run();
    },

    async insertAsset(asset: {
      id: string;
      r2Key: string;
      kind: "image" | "icon";
      width: number;
      height: number;
      bytes: number;
      variants: ThemeAssetVariant[];
    }) {
      await ready();
      await db
        .prepare(
          "INSERT INTO theme_assets (id, r2_key, kind, width, height, bytes, variants_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(
          asset.id,
          asset.r2Key,
          asset.kind,
          asset.width,
          asset.height,
          asset.bytes,
          JSON.stringify(asset.variants),
          iso(),
        )
        .run();
    },

    /** The image library, newest first, with the themes (draft or published) that use each image. */
    async listAssets() {
      await ready();
      const [{ results: assets }, { results: themes }] = await Promise.all([
        db
          .prepare(
            "SELECT id, r2_key, kind, width, height, bytes, variants_json, created_at FROM theme_assets ORDER BY created_at DESC",
          )
          .all<AssetRow & { kind: string; bytes: number; created_at: string }>(),
        db
          .prepare("SELECT id, name, json, published_json FROM themes")
          .all<Pick<ThemeRow, "id" | "name" | "json" | "published_json">>(),
      ]);
      const usage = assetUsage(themes ?? []);
      return (assets ?? []).map((asset) => ({
        id: asset.id,
        r2Key: asset.r2_key,
        kind: asset.kind,
        width: asset.width,
        height: asset.height,
        bytes: asset.bytes,
        variants: parseVariants(asset.variants_json),
        createdAt: asset.created_at,
        usedBy: usage.get(asset.id) ?? [],
      }));
    },

    /**
     * Deletes an image record and returns its storage keys. Refuses while a theme uses it,
     * unless `force` (the library's "Borrar", Lucia 2026-11-20): then those themes simply
     * lose it. The live store falls back (original image, or nothing for a sticker or
     * banner) and the editor shows a placeholder where it was.
     */
    async removeAsset(id: string, options: { force?: boolean } = {}) {
      await ready();
      const asset = await db
        .prepare("SELECT r2_key, variants_json FROM theme_assets WHERE id = ?")
        .bind(id)
        .first<AssetRow>();
      if (!asset) throw new Error("Esa imagen ya no existe.");
      const { results: themes } = await db
        .prepare("SELECT id, name, json, published_json FROM themes")
        .all<Pick<ThemeRow, "id" | "name" | "json" | "published_json">>();
      const usedBy = assetUsage(themes ?? []).get(id) ?? [];
      if (usedBy.length && !options.force) {
        throw new Error(
          `Esta imagen se usa en: ${usedBy.map((theme) => theme.name).join(", ")}. Quítala de esos temas primero.`,
        );
      }
      await db.prepare("DELETE FROM theme_assets WHERE id = ?").bind(id).run();
      return [asset.r2_key, ...parseVariants(asset.variants_json).map((variant) => variant.key)];
    },

    /** discount id -> names of the PUBLISHED themes that list it (drafts don't own discounts yet). */
    async discountLinks() {
      await ready();
      const { results } = await db
        .prepare("SELECT name, published_json FROM themes WHERE published_json IS NOT NULL")
        .all<{ name: string; published_json: string }>();
      const links = new Map<string, string[]>();
      for (const row of results ?? []) {
        for (const id of parseTheme(safeJson(row.published_json))?.discountIds ?? []) {
          links.set(id, [...(links.get(id) ?? []), row.name]);
        }
      }
      return links;
    },

    /** Whether a banner's collection or product can still be opened (published / active and visible). */
    async linkTargetExists(link: { kind: string; slug?: string }) {
      if (link.kind !== "collection" && link.kind !== "product") return true;
      try {
        const sql =
          link.kind === "collection"
            ? "SELECT 1 AS ok FROM collections WHERE slug = ? AND is_published = 1 LIMIT 1"
            : "SELECT 1 AS ok FROM products WHERE slug = ? AND is_active = 1 AND hidden = 0 LIMIT 1";
        return Boolean(
          await db
            .prepare(sql)
            .bind(link.slug ?? "")
            .first<{ ok: number }>(),
        );
      } catch {
        // Missing table on a brand-new database, or anything else: treat as gone, link to /tienda.
        return false;
      }
    },

    /** Stored image records for these ids (unknown ids are skipped). */
    async assets(ids: string[]) {
      await ready();
      const unique = [...new Set(ids)].slice(0, 100);
      if (!unique.length) return [];
      const { results } = await db
        .prepare(
          `SELECT id, r2_key, kind, width, height, variants_json FROM theme_assets WHERE id IN (${unique.map(() => "?").join(", ")})`,
        )
        .bind(...unique)
        .all<AssetRow>();
      return (results ?? []).map((row) => ({ ...row, variants: parseVariants(row.variants_json) }));
    },

    /**
     * The theme to render at `instant`. Preview (admin only, checked by the caller) shows the
     * draft; everything else shows the published copy. Unparseable data means no theme.
     */
    async resolveActive(
      instant: number,
      options: { previewThemeId?: string; scheduleOnly?: boolean } = {},
    ): Promise<ActiveTheme | null> {
      if (options.previewThemeId) {
        const found = await row(options.previewThemeId);
        const theme = found ? parseTheme(safeJson(found.json)) : null;
        return found && theme
          ? { themeId: found.id, name: found.name, source: "preview", theme }
          : null;
      }
      // "Ver como el día…" looks at the calendar only, not today's "Activar ahora".
      const override = options.scheduleOnly ? null : await getOverride();
      const source: ActiveTheme["source"] | null = override ? "override" : null;
      const picked =
        override?.themeId ?? activeEntryAt(await listSchedule(), instant)?.themeId ?? null;
      const themeId = picked ?? DEFAULT_THEME_ID;
      const found = await row(themeId);
      const theme = found?.published_json ? parseTheme(safeJson(found.published_json)) : null;
      if (!found || !theme) return null;
      return {
        themeId,
        name: found.name,
        source: picked ? (source ?? "schedule") : "default",
        theme,
      };
    },
  };
}

function safeJson(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Every image id a theme points at (slots, stickers, effect particle, banner, favicon, share image). */
export function themeAssetIds(theme: Theme): string[] {
  const ids: string[] = [];
  for (const slot of Object.values(theme.slots)) if (slot?.mode === "replace") ids.push(slot.asset);
  for (const list of Object.values(theme.stickers))
    for (const sticker of list ?? []) ids.push(sticker.asset);
  if (theme.heroEffect?.particleAsset) ids.push(theme.heroEffect.particleAsset);
  for (const banner of [...theme.homeBanners, ...theme.tiendaBanners])
    ids.push(banner.desktopAsset, banner.mobileAsset);
  if (theme.favicon) ids.push(theme.favicon);
  if (theme.shareImage) ids.push(theme.shareImage);
  return [...new Set(ids)];
}
