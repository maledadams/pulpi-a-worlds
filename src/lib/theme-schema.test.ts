import { describe, expect, it } from "vitest";
import {
  isThemeColor,
  parseTheme,
  themeSchema,
  THEME_SLOT_IDS,
  STICKER_LIMITS,
} from "@/lib/theme-schema";
import { THEME_TOKENS, resolveTokenValues } from "@/lib/theme-tokens";

const fit = { x: 50, y: 50, w: 10, rot: 0 };
const sticker = (extra: Record<string, unknown> = {}) => ({
  asset: "a_1",
  anchor: "page",
  motion: "none",
  layer: "front",
  hideOnPhone: false,
  desktop: fit,
  mobile: fit,
  ...extra,
});

describe("theme colors", () => {
  it("accepts hex and rgb/rgba only", () => {
    for (const ok of [
      "#fff7f0",
      "#FFF7F0",
      "#fff7f080",
      "rgba(122, 16, 32, 0.5)",
      "rgb(1,2,3)",
      "rgba(0,0,0,1)",
    ]) {
      expect(isThemeColor(ok), ok).toBe(true);
    }
    for (const bad of [
      "red",
      "#fff",
      "url(javascript:alert(1))",
      "red;}body{display:none",
      "expression(alert(1))",
      "rgba(300,0,0,1)",
      "rgba(0,0,0,2)",
      "rgba(0,0,0,1);x",
      "var(--background)",
      "",
    ]) {
      expect(isThemeColor(bad), bad).toBe(false);
    }
  });
});

describe("parseTheme (read side, never throws)", () => {
  it("round-trips a valid document", () => {
    const doc = {
      schemaVersion: 1,
      name: "Navidad",
      colors: { background: "#fff7f0", "announcement.general.background": "#7a1020" },
      slots: {
        "logo.moon": { mode: "replace", asset: "a_123", desktop: fit, mobile: fit },
        "home.birthday.cakeLeft": { mode: "hide" },
      },
      stickers: { home: [sticker()] },
      heroEffect: {
        preset: "snow",
        particleAsset: null,
        density: "medium",
        speed: "slow",
        phone: true,
        heroes: { home: true, moon: false, sunshine: false, men: false },
      },
      homeBanners: [],
      tiendaBanners: [],
      favicon: null,
      shareImage: null,
      discountIds: ["bf-20"],
    };
    const theme = parseTheme(doc);
    expect(theme?.name).toBe("Navidad");
    expect(theme?.colors.background).toBe("#fff7f0");
    expect(theme?.slots["logo.moon"]?.mode).toBe("replace");
    expect(theme?.stickers.home).toHaveLength(1);
    expect(theme?.heroEffect?.preset).toBe("snow");
  });

  it("drops unknown tokens, unknown slots and bad colors instead of failing", () => {
    const theme = parseTheme({
      schemaVersion: 1,
      name: "X",
      colors: { background: "#ffffff", "moon.background": "#000000", foreground: "red;}body{x" },
      slots: { "not.a.slot": { mode: "hide" }, "contact.phoneLeft": { mode: "hide" } },
    });
    expect(theme).not.toBeNull();
    expect(theme!.colors).toEqual({ background: "#ffffff" });
    expect(Object.keys(theme!.slots)).toEqual(["contact.phoneLeft"]);
  });

  it("fills missing sections with empty defaults", () => {
    const theme = parseTheme({ schemaVersion: 1, name: "Vacío" });
    expect(theme).toMatchObject({
      colors: {},
      slots: {},
      stickers: {},
      heroEffect: null,
      homeBanners: [],
      tiendaBanners: [],
      favicon: null,
      shareImage: null,
      discountIds: [],
    });
  });

  it("returns null for garbage", () => {
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme("x")).toBeNull();
    expect(parseTheme({ name: "no version" })).toBeNull();
    expect(parseTheme({ schemaVersion: 2, name: "future" })).toBeNull();
  });

  it("drops a replace slot without an asset and a sticker with bad fields", () => {
    const theme = parseTheme({
      schemaVersion: 1,
      name: "X",
      slots: { "logo.men": { mode: "replace" } },
      stickers: { home: [sticker(), sticker({ motion: "explode" })] },
    });
    expect(theme!.slots).toEqual({});
    expect(theme!.stickers.home).toHaveLength(1);
  });

  it("keeps only the first stickers up to the caps", () => {
    const theme = parseTheme({
      schemaVersion: 1,
      name: "X",
      stickers: {
        home: Array.from({ length: 12 }, () => sticker({ hideOnPhone: true })),
        general: Array.from({ length: 12 }, () => sticker()),
        product: Array.from({ length: 5 }, () => sticker()),
      },
    });
    expect(theme!.stickers.home).toHaveLength(STICKER_LIMITS.desktop);
    expect(theme!.stickers.general).toHaveLength(STICKER_LIMITS.phone);
    expect(theme!.stickers.product).toHaveLength(STICKER_LIMITS.product);
  });
});

describe("themeSchema (save side, strict)", () => {
  it("refuses more stickers than the caps", () => {
    const result = themeSchema.safeParse({
      schemaVersion: 1,
      name: "X",
      stickers: { home: Array.from({ length: 9 }, () => sticker()) },
    });
    expect(result.success).toBe(false);
  });

  it("refuses more than 5 phone-visible stickers on one page", () => {
    const sixOnPhone = Array.from({ length: 6 }, () => sticker());
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", stickers: { home: sixOnPhone } })
        .success,
    ).toBe(false);
    const sixWithOneHidden = [
      ...Array.from({ length: 5 }, () => sticker()),
      sticker({ hideOnPhone: true }),
    ];
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", stickers: { home: sixWithOneHidden } })
        .success,
    ).toBe(true);
  });

  it("refuses a banner without alt text and a free-text link", () => {
    const banner = { desktopAsset: "a_1", mobileAsset: "a_2", alt: "", link: { kind: "tienda" } };
    expect(themeSchema.safeParse({ schemaVersion: 1, name: "X", homeBanners: [banner] }).success).toBe(
      false,
    );
    const freeLink = {
      ...banner,
      alt: "Black Friday",
      link: { kind: "url", href: "https://evil.example" },
    };
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", tiendaBanners: [freeLink] }).success,
    ).toBe(false);
    const ok = { ...banner, alt: "Black Friday 40% en todo" };
    expect(themeSchema.safeParse({ schemaVersion: 1, name: "X", homeBanners: [ok] }).success).toBe(
      true,
    );
    // A banner may link nowhere; at most five per page.
    const plain = { ...ok, link: { kind: "none" } };
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", tiendaBanners: [plain] }).success,
    ).toBe(true);
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", homeBanners: Array(11).fill(ok) }).success,
    ).toBe(false);
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", homeBanners: Array(10).fill(ok) }).success,
    ).toBe(true);
    // Banners replace "Elige tu Tienda" unless the theme keeps it.
    expect(parseTheme({ schemaVersion: 1, name: "X" })?.keepStorePicker).toBe(false);
    expect(parseTheme({ schemaVersion: 1, name: "X", keepStorePicker: true })?.keepStorePicker).toBe(
      true,
    );
  });

  it("reads a theme saved with the old single homeBanner as a one-banner list", () => {
    const ok = {
      desktopAsset: "a_1",
      mobileAsset: "a_2",
      alt: "Black Friday",
      link: { kind: "tienda" },
    };
    const theme = parseTheme({ schemaVersion: 1, name: "Viejo", homeBanner: ok });
    expect(theme?.homeBanners).toEqual([ok]);
    expect(theme?.tiendaBanners).toEqual([]);
  });

  it("refuses an unknown token or a bad color", () => {
    expect(
      themeSchema.safeParse({
        schemaVersion: 1,
        name: "X",
        colors: { "moon.background": "#000000" },
      }).success,
    ).toBe(false);
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", colors: { background: "blue" } })
        .success,
    ).toBe(false);
  });
});

describe("slots", () => {
  it("covers every image the spec and Lucia listed", () => {
    for (const id of [
      "home.storeTile.moon",
      "home.storeTile.sunshine",
      "home.storeTile.men",
      "home.birthday.partyHatLeft",
      "home.birthday.partyHatRight",
      "home.birthday.cakeLeft",
      "home.birthday.cakeRight",
      "contact.phoneLeft",
      "contact.phoneRight",
      "logo.moon",
      "logo.sunshine",
      "logo.men",
      "logo.footer.moon",
      "logo.footer.sunshine",
      "logo.footer.men",
      "pineapple.general",
      "pineapple.moon",
      "pineapple.sunshine",
      "pineapple.men",
      "subbrand.mood.moon",
      "subbrand.mood.sunshine",
      "subbrand.mood.men",
    ]) {
      expect(THEME_SLOT_IDS).toContain(id);
    }
  });
});

describe("token table", () => {
  it("has unique ids and css variables, and every default is set", () => {
    const ids = THEME_TOKENS.map((token) => token.id);
    const vars = THEME_TOKENS.map((token) => token.cssVar);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(vars).size).toBe(vars.length);
    for (const token of THEME_TOKENS) {
      expect(token.default, token.id).toBeTruthy();
      expect(token.cssVar.startsWith("--"), token.id).toBe(true);
      if (token.follows) expect(ids, token.id).toContain(token.follows);
    }
  });

  it("never names a sub-brand css variable", () => {
    for (const token of THEME_TOKENS) {
      expect(token.cssVar).not.toMatch(/moon|sunshine|men\b/i);
    }
  });

  it("resolves followers from the master color only when they are not set", () => {
    expect(resolveTokenValues({})).toEqual({});
    const resolved = resolveTokenValues({ background: "#7a1020" });
    expect(resolved.background).toBe("#7a1020");
    expect(resolved.card).toBe("#7a1020");
    expect(resolved["dropdown-background"]).toBe("#7a1020");
    // Buttons never follow text (Lucia, 2026-11-19).
    expect(resolveTokenValues({ foreground: "#7a1020" })["checkout-submit"]).toBeUndefined();
    expect(resolveTokenValues({ "ink-strong": "#7a1020" })["checkout-submit"]).toBe("#7a1020");
    const withCard = resolveTokenValues({ background: "#7a1020", card: "#ffffff" });
    expect(withCard.card).toBe("#ffffff");
  });

  it("resolves chains (a follower of a follower)", () => {
    const resolved = resolveTokenValues({ foreground: "#2a1414" });
    expect(resolved["card-foreground"]).toBe("#2a1414");
    for (const token of THEME_TOKENS.filter((entry) => entry.follows === "card-foreground")) {
      expect(resolved[token.id]).toBe("#2a1414");
    }
  });
});

describe("hero effect particle color", () => {
  const effect = {
    preset: "hearts",
    particleAsset: null,
    density: "medium",
    speed: "slow",
    phone: true,
    heroes: { home: true, moon: false, sunshine: false, men: false },
  };

  it("reads an older effect as its own colors, solid", () => {
    const theme = parseTheme({ schemaVersion: 1, name: "Viejo", heroEffect: effect });
    expect(theme?.heroEffect).toMatchObject({ color: null, tint: 100, opacity: 100 });
  });

  it("keeps a chosen color, strength and opacity, and refuses anything that isn't a color", () => {
    const chosen = { ...effect, color: "#7a1020", tint: 40, opacity: 60 };
    expect(parseTheme({ schemaVersion: 1, name: "X", heroEffect: chosen })?.heroEffect).toMatchObject(
      { color: "#7a1020", tint: 40, opacity: 60 },
    );
    const bad = { ...effect, color: "red;}body{x" };
    expect(themeSchema.safeParse({ schemaVersion: 1, name: "X", heroEffect: bad }).success).toBe(false);
    const invisible = { ...effect, opacity: 0 };
    expect(themeSchema.safeParse({ schemaVersion: 1, name: "X", heroEffect: invisible }).success).toBe(
      false,
    );
  });
});

describe("built-in effect colors", () => {
  it("uses the theme's changes over the preset's own colors, position by position", async () => {
    const { effectColors, PRESET_COLORS } = await import("@/lib/hero-effect-colors");
    expect(effectColors("hearts", null)).toEqual(PRESET_COLORS.hearts);
    expect(effectColors("hearts", [null, "#000000"])).toEqual(["#ff4e8a", "#000000", "#ff9ec4"]);
    expect(effectColors("custom", ["#000000"])).toEqual([]);
  });
});

describe("hero wave", () => {
  it("is off by default, keeps line and fill, and fill null means the page background", () => {
    expect(parseTheme({ schemaVersion: 1, name: "X" })?.heroWave).toBeNull();
    expect(
      parseTheme({ schemaVersion: 1, name: "X", heroWave: { line: "#ff4ea3" } })?.heroWave,
    ).toEqual({ line: "#ff4ea3", fill: null });
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", heroWave: { line: "url(x)" } }).success,
    ).toBe(false);
  });
});

describe("hero gradient", () => {
  it("is empty (100% everywhere) by default and keeps only valid 0-100 values", () => {
    expect(parseTheme({ schemaVersion: 1, name: "X" })?.heroGradient).toEqual({});
    expect(
      parseTheme({
        schemaVersion: 1,
        name: "X",
        heroGradient: { moon: 0, sunshine: 140, men: "50", home: 20 },
      })?.heroGradient,
    ).toEqual({ moon: 0 });
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", heroGradient: { moon: 101 } }).success,
    ).toBe(false);
    expect(
      themeSchema.safeParse({ schemaVersion: 1, name: "X", heroGradient: { moon: 35 } }).success,
    ).toBe(true);
  });
});

describe("per-hero particle colors", () => {
  it("uses a hero's own look, else the shared one", async () => {
    const { particleLookFor } = await import("@/lib/theme-schema");
    const theme = parseTheme({
      schemaVersion: 1,
      name: "X",
      heroEffect: {
        preset: "hearts",
        particleAsset: null,
        density: "medium",
        speed: "slow",
        color: "#ff0000",
        tint: 50,
        phone: true,
        heroes: { home: true, moon: true, sunshine: true, men: true },
        perHero: { moon: { color: "#0000ff", tint: 80, opacity: 40 } },
      },
    })!;
    expect(particleLookFor(theme.heroEffect!, "moon")).toEqual({
      color: "#0000ff",
      tint: 80,
      presetColors: null,
      opacity: 40,
    });
    expect(particleLookFor(theme.heroEffect!, "men")).toEqual({
      color: "#ff0000",
      tint: 50,
      presetColors: null,
      opacity: 100,
    });
  });
});
