import { beforeEach, describe, expect, it } from "vitest";
import { createTestD1 } from "@/lib/d1-sqlite.test-helper";
import { fromSantoDomingoInput } from "@/lib/theme-schedule";
import { DEFAULT_THEME_ID, createThemeStore, ensureThemeTables, THEME_VERSIONS_KEPT } from "@/lib/themes-store";

const at = (local: string) => fromSantoDomingoInput(local)!;
let now = Date.parse(at("2026-11-20T12:00"));
let store: ReturnType<typeof createThemeStore>;
let db: D1Database;

beforeEach(() => {
  now = Date.parse(at("2026-11-20T12:00"));
  db = createTestD1();
  store = createThemeStore(db, { ready: ensureThemeTables, now: () => now });
});

async function publishedTheme(
  name: string,
  colors: Record<string, string> = { background: "#7a1020" },
) {
  const { id } = await store.create(name, "lucia");
  const theme = (await store.get(id))!;
  const { version } = await store.save(id, { ...theme.doc, colors }, theme.version, "lucia");
  await store.publish(id, version, "lucia");
  return id;
}

describe("themes", () => {
  it("creates an empty theme, then lists it as unpublished", async () => {
    const { id } = await store.create("Black Friday", "lucia");
    const theme = await store.get(id);
    expect(theme).toMatchObject({ name: "Black Friday", version: 1, publishedVersion: null });
    expect(theme!.doc).toMatchObject({ schemaVersion: 1, name: "Black Friday", colors: {} });
    const [general, summary] = await store.list();
    expect(general).toMatchObject({ id: DEFAULT_THEME_ID, name: "Tema general", isDefault: true });
    expect(summary).toMatchObject({
      id,
      name: "Black Friday",
      isActive: false,
      isScheduled: false,
      hasUnpublishedChanges: true,
      isDefault: false,
    });
  });

  it("keeps Tema general as the default: shown when nothing else is on, never scheduled or deleted", async () => {
    await store.list();
    // Never published: changes nothing.
    expect(await store.resolveActive(Date.now())).toBeNull();
    const base = (await store.get(DEFAULT_THEME_ID))!;
    const saved = await store.save(
      DEFAULT_THEME_ID,
      { ...base.doc, name: "Otro nombre", colors: { background: "#fff4dc" } },
      base.version,
      "lucia",
    );
    await store.publish(DEFAULT_THEME_ID, saved.version, "lucia");
    const active = await store.resolveActive(Date.now());
    expect(active).toMatchObject({ themeId: DEFAULT_THEME_ID, source: "default" });
    expect(active!.theme.colors.background).toBe("#fff4dc");
    expect((await store.get(DEFAULT_THEME_ID))!.name).toBe("Tema general");
    await expect(store.activate(DEFAULT_THEME_ID, "lucia")).rejects.toThrow(/predeterminado/);
    await expect(
      store.saveScheduleEntry({
        id: "s1",
        themeId: DEFAULT_THEME_ID,
        startsAt: "2026-12-01T04:00:00.000Z",
        endsAt: "2026-12-02T04:00:00.000Z",
        repeatYearly: false,
      }),
    ).rejects.toThrow(/predeterminado/);
    await expect(store.remove(DEFAULT_THEME_ID)).rejects.toThrow(/no se puede borrar/);
    // Another theme switched on wins over it.
    const { id } = await store.create("BF", "lucia");
    await store.publish(id, 1, "lucia");
    await store.activate(id, "lucia");
    expect((await store.resolveActive(Date.now()))?.themeId).toBe(id);
  });

  it("refuses a save that started from an old version", async () => {
    const { id } = await store.create("BF", "lucia");
    await store.save(
      id,
      { ...(await store.get(id))!.doc, colors: { background: "#000000" } },
      1,
      "a",
    );
    await expect(
      store.save(id, { ...(await store.get(id))!.doc, colors: { background: "#ffffff" } }, 1, "b"),
    ).rejects.toThrow("Alguien más cambió este tema, recarga.");
    expect((await store.get(id))!.doc.colors).toEqual({ background: "#000000" });
  });

  it("refuses an invalid document with a readable message", async () => {
    const { id } = await store.create("BF", "lucia");
    const doc = (await store.get(id))!.doc;
    await expect(
      store.save(id, { ...doc, colors: { background: "red" } }, 1, "lucia"),
    ).rejects.toThrow(/Color inválido/);
  });

  it("keeps the last versions; going back to one copies nothing until it is changed", async () => {
    const { id } = await store.create("BF", "lucia");
    let version = 1;
    for (let index = 0; index < THEME_VERSIONS_KEPT + 3; index++) {
      const doc = (await store.get(id))!.doc;
      ({ version } = await store.save(
        id,
        { ...doc, colors: { background: `#00000${index % 10}` } },
        version,
        "lucia",
      ));
    }
    const versions = await store.versions(id);
    expect(versions).toHaveLength(THEME_VERSIONS_KEPT);
    expect(versions[0]!.version).toBe(version);
    const older = versions[versions.length - 1]!;
    const olderColors = (await store.getVersion(id, older.version))!.colors;
    const restored = await store.restore(id, older.version, version, "lucia");
    expect(restored.version).toBe(version + 1);
    const draft = (await store.get(id))!;
    expect(draft.doc.colors).toEqual(olderColors);
    expect(draft.basedOnVersion).toBe(older.version);
    // Going back copies nothing (Lucia): no new entry, the oldest one stays.
    const after = await store.versions(id);
    expect(after).toHaveLength(THEME_VERSIONS_KEPT);
    expect(after.map((entry) => entry.version)).toEqual(versions.map((entry) => entry.version));
    // Changing it and saving is what makes a new, named version.
    const saved = await store.save(
      id,
      { ...draft.doc, colors: { background: "#123456" } },
      restored.version,
      "lucia",
      "Con fondo azul",
    );
    const latest = (await store.versions(id))[0]!;
    expect(latest).toMatchObject({ version: saved.version, label: "Con fondo azul" });
    expect((await store.get(id))!.basedOnVersion).toBe(saved.version);
  });

  it("duplicates a theme with a new name and no history", async () => {
    const source = await publishedTheme("Black Friday");
    const { id } = await store.duplicate(source, "Cyber Monday", "lucia");
    const copy = (await store.get(id))!;
    expect(copy).toMatchObject({ name: "Cyber Monday", version: 1, publishedVersion: null });
    expect(copy.doc.colors).toEqual({ background: "#7a1020" });
  });

  it("exports and imports a theme as JSON", async () => {
    const source = await publishedTheme("Navidad", { background: "#0b3a10" });
    const json = await store.exportJson(source);
    const { id } = await store.importJson(json, "lucia");
    const imported = (await store.get(id))!;
    expect(imported.name).toBe("Navidad (importado)");
    expect(imported.doc.colors).toEqual({ background: "#0b3a10" });
    await expect(store.importJson("{nope", "lucia")).rejects.toThrow(/no es un tema/);
  });
});

describe("schedule and activation", () => {
  it("refuses to schedule or activate a theme that was never published", async () => {
    const { id } = await store.create("BF", "lucia");
    await expect(
      store.saveScheduleEntry({
        id: "s1",
        themeId: id,
        startsAt: at("2026-11-27T00:00"),
        endsAt: at("2026-11-28T00:00"),
        repeatYearly: false,
      }),
    ).rejects.toThrow(/Publica/);
    await expect(store.activate(id, "lucia")).rejects.toThrow(/Publica/);
  });

  it("allows overlapping ranges: the most recently started one shows", async () => {
    const month = await publishedTheme("Noviembre");
    const bf = await publishedTheme("Black Friday");
    await store.saveScheduleEntry({
      id: "s1",
      themeId: month,
      startsAt: at("2026-11-01T00:00"),
      endsAt: at("2026-12-01T00:00"),
      repeatYearly: false,
    });
    await store.saveScheduleEntry({
      id: "s2",
      themeId: bf,
      startsAt: at("2026-11-27T00:00"),
      endsAt: at("2026-11-28T00:00"),
      repeatYearly: false,
    });
    expect((await store.resolveActive(Date.parse(at("2026-11-27T10:00"))))?.themeId).toBe(bf);
    expect((await store.resolveActive(Date.parse(at("2026-11-28T10:00"))))?.themeId).toBe(month);
  });

  it("stores each theme's calendar color", async () => {
    const id = await publishedTheme("San Valentín");
    await store.setCalendarColor(id, "#FF5A8A");
    expect((await store.list()).find((theme) => theme.id === id)?.calendarColor).toBe("#ff5a8a");
    await expect(store.setCalendarColor(id, "red;}")).rejects.toThrow(/inválido/);
    await store.setCalendarColor(id, null);
    expect((await store.list()).find((theme) => theme.id === id)?.calendarColor).toBeNull();
  });

  it("picks preview, then the manual override, then the schedule, else none", async () => {
    const bf = await publishedTheme("Black Friday", { background: "#111111" });
    const other = await publishedTheme("Otro", { background: "#222222" });
    await store.saveScheduleEntry({
      id: "s1",
      themeId: bf,
      startsAt: at("2026-11-27T00:00"),
      endsAt: at("2026-11-28T00:00"),
      repeatYearly: false,
    });

    expect(await store.resolveActive(Date.parse(at("2026-11-26T23:59")))).toBeNull();
    expect(await store.resolveActive(Date.parse(at("2026-11-27T00:00")))).toMatchObject({
      themeId: bf,
      source: "schedule",
    });

    await store.activate(other, "lucia");
    expect(await store.resolveActive(Date.parse(at("2026-11-27T10:00")))).toMatchObject({
      themeId: other,
      source: "override",
    });

    const preview = await store.resolveActive(Date.parse(at("2026-11-27T10:00")), {
      previewThemeId: bf,
    });
    expect(preview).toMatchObject({ themeId: bf, source: "preview" });

    await store.deactivate();
    expect(await store.resolveActive(Date.parse(at("2026-11-27T10:00")))).toMatchObject({
      themeId: bf,
      source: "schedule",
    });
  });

  it("renders the published version, not unpublished edits; preview shows the draft", async () => {
    const id = await publishedTheme("BF", { background: "#111111" });
    await store.activate(id, "lucia");
    const draft = (await store.get(id))!;
    await store.save(
      id,
      { ...draft.doc, colors: { background: "#999999" } },
      draft.version,
      "lucia",
    );
    expect((await store.resolveActive(now))!.theme.colors).toEqual({ background: "#111111" });
    expect((await store.resolveActive(now, { previewThemeId: id }))!.theme.colors).toEqual({
      background: "#999999",
    });
  });

  it("blocks deleting a theme that is active or scheduled, allows it otherwise", async () => {
    const active = await publishedTheme("Activo");
    const scheduled = await publishedTheme("Programado");
    const free = await publishedTheme("Libre");
    await store.activate(active, "lucia");
    await store.saveScheduleEntry({
      id: "s1",
      themeId: scheduled,
      startsAt: at("2026-12-20T00:00"),
      endsAt: at("2026-12-26T00:00"),
      repeatYearly: true,
    });
    await expect(store.remove(active)).rejects.toThrow(/activo/);
    await expect(store.remove(scheduled)).rejects.toThrow(/programado/);
    await store.remove(free);
    expect(await store.get(free)).toBeNull();
    expect(await store.versions(free)).toEqual([]);
  });

  it("treats a stored theme that no longer parses as no theme", async () => {
    const id = await publishedTheme("Roto");
    await store.activate(id, "lucia");
    await db
      .prepare("UPDATE themes SET published_json = ? WHERE id = ?")
      .bind("{not json", id)
      .run();
    expect(await store.resolveActive(now)).toBeNull();
  });

  it("shows the active and scheduled flags in the list", async () => {
    const active = await publishedTheme("Activo");
    const scheduled = await publishedTheme("Programado");
    await store.activate(active, "lucia");
    await store.saveScheduleEntry({
      id: "s1",
      themeId: scheduled,
      startsAt: at("2026-12-20T00:00"),
      endsAt: at("2026-12-26T00:00"),
      repeatYearly: false,
    });
    const list = await store.list();
    expect(list.find((theme) => theme.id === active)).toMatchObject({
      isActive: true,
      hasUnpublishedChanges: false,
    });
    expect(list.find((theme) => theme.id === scheduled)).toMatchObject({
      isActive: false,
      isScheduled: true,
    });
  });
});

describe("image library", () => {
  const asset = (id: string) => ({
    id,
    r2Key: `themes/${id}/full.webp`,
    kind: "image" as const,
    width: 1200,
    height: 800,
    bytes: 1234,
    variants: [{ width: 640, height: 427, key: `themes/${id}/640.webp` }],
  });

  it("lists images with the themes that use them, in the draft or the published copy", async () => {
    await store.insertAsset(asset("img_a"));
    await store.insertAsset(asset("img_b"));
    const { id } = await store.create("BF", "lucia");
    const theme = (await store.get(id))!;
    const saved = await store.save(id, { ...theme.doc, favicon: "img_a" }, theme.version, "lucia");
    await store.publish(id, saved.version, "lucia");
    // The draft moves on to another image; the published copy still uses img_a.
    const draft = (await store.get(id))!;
    await store.save(
      id,
      { ...draft.doc, favicon: null, shareImage: "img_b" },
      draft.version,
      "lucia",
    );

    const library = await store.listAssets();
    expect(library.find((entry) => entry.id === "img_a")!.usedBy).toEqual([{ id, name: "BF" }]);
    expect(library.find((entry) => entry.id === "img_b")!.usedBy).toEqual([{ id, name: "BF" }]);
    expect(library[0]!.variants).toEqual([
      { width: 640, height: 427, key: expect.stringContaining("640") },
    ]);
  });

  it("refuses to delete an image in use and returns all storage keys when it is free", async () => {
    await store.insertAsset(asset("img_used"));
    await store.insertAsset(asset("img_free"));
    const { id } = await store.create("Navidad", "lucia");
    const theme = (await store.get(id))!;
    await store.save(id, { ...theme.doc, shareImage: "img_used" }, theme.version, "lucia");

    await expect(store.removeAsset("img_used")).rejects.toThrow(/Navidad/);
    expect(await store.removeAsset("img_free")).toEqual([
      "themes/img_free/full.webp",
      "themes/img_free/640.webp",
    ]);
    expect((await store.listAssets()).map((entry) => entry.id)).toEqual(["img_used"]);
    await expect(store.removeAsset("img_free")).rejects.toThrow(/ya no existe/);
  });

  it("deletes an image a theme uses only when forced, and the theme just loses it", async () => {
    await store.insertAsset(asset("img_used"));
    const { id } = await store.create("Navidad", "lucia");
    const theme = (await store.get(id))!;
    await store.save(id, { ...theme.doc, shareImage: "img_used" }, theme.version, "lucia");

    await expect(store.removeAsset("img_used")).rejects.toThrow(/Navidad/);
    expect(await store.removeAsset("img_used", { force: true })).toEqual([
      "themes/img_used/full.webp",
      "themes/img_used/640.webp",
    ]);
    expect(await store.listAssets()).toEqual([]);
    expect(await store.assets(["img_used"])).toEqual([]);
    // The theme still opens; its reference just points at nothing now.
    expect((await store.get(id))!.doc.shareImage).toBe("img_used");
  });

  it("returns stored size variants with asset lookups", async () => {
    await store.insertAsset(asset("img_v"));
    const [row] = await store.assets(["img_v", "missing"]);
    expect(row).toMatchObject({ id: "img_v", width: 1200, variants: [{ width: 640 }] });
  });
});

describe("banner link targets", () => {
  it("knows published collections and visible active products, and nothing else", async () => {
    await db.exec(
      "CREATE TABLE collections (slug TEXT, is_published INTEGER); CREATE TABLE products (slug TEXT, is_active INTEGER, hidden INTEGER);",
    );
    await db.exec(
      "INSERT INTO collections VALUES ('bf', 1), ('draft', 0); INSERT INTO products VALUES ('corset', 1, 0), ('off', 0, 0), ('secret', 1, 1);",
    );
    expect(await store.linkTargetExists({ kind: "collection", slug: "bf" })).toBe(true);
    expect(await store.linkTargetExists({ kind: "collection", slug: "draft" })).toBe(false);
    expect(await store.linkTargetExists({ kind: "collection", slug: "nope" })).toBe(false);
    expect(await store.linkTargetExists({ kind: "product", slug: "corset" })).toBe(true);
    expect(await store.linkTargetExists({ kind: "product", slug: "off" })).toBe(false);
    expect(await store.linkTargetExists({ kind: "product", slug: "secret" })).toBe(false);
    expect(await store.linkTargetExists({ kind: "tienda" })).toBe(true);
  });

  it("treats a missing table as a missing target", async () => {
    expect(await store.linkTargetExists({ kind: "product", slug: "x" })).toBe(false);
  });
});

describe("discount links", () => {
  it("lists the discounts each published theme owns; draft-only links don't count", async () => {
    const bf = await publishedTheme("Black Friday");
    const cm = await publishedTheme("Cyber Monday");
    for (const [id, discountIds] of [
      [bf, ["bf20", "envio"]],
      [cm, ["envio"]],
    ] as const) {
      const theme = (await store.get(id))!;
      const saved = await store.save(
        id,
        { ...theme.doc, discountIds: [...discountIds] },
        theme.version,
        "lucia",
      );
      await store.publish(id, saved.version, "lucia");
    }
    const draftOnly = await store.create("Navidad", "lucia");
    const draft = (await store.get(draftOnly.id))!;
    await store.save(
      draftOnly.id,
      { ...draft.doc, discountIds: ["nav10"] },
      draft.version,
      "lucia",
    );

    const links = await store.discountLinks();
    expect(links.get("bf20")).toEqual(["Black Friday"]);
    expect(links.get("envio")?.sort()).toEqual(["Black Friday", "Cyber Monday"]);
    expect(links.has("nav10")).toBe(false);
  });
});
