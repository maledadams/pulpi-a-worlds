import { describe, expect, it } from "vitest";
import { buildThemeCss, themeScopeForPath } from "@/lib/theme-css";
import { parseTheme } from "@/lib/theme-schema";
import { THEME_TOKENS } from "@/lib/theme-tokens";

const theme = (colors: Record<string, string>) =>
  parseTheme({ schemaVersion: 1, name: "T", colors })!;

/** Splits "sel{decls}sel{decls}" into [selector, declarations] pairs. */
function rules(css: string) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
    (match) => [match[1]!.trim(), match[2]!] as const,
  );
}

describe("themeScopeForPath", () => {
  it("themes general pages and checkout", () => {
    for (const path of [
      "/",
      "/tienda",
      "/pulpina",
      "/nosotros",
      "/contacto",
      "/politicas",
      "/carrito",
      "/solicitud",
    ]) {
      expect(themeScopeForPath(path), path).toBe("general");
    }
  });

  it("never themes sub-brand pages, product pages or admin", () => {
    for (const path of [
      "/moon",
      "/sunshine",
      "/men",
      "/moon/",
      "/producto/x",
      "/admin",
      "/admin/temas",
      "/acceso-admin",
    ]) {
      expect(themeScopeForPath(path), path).toBeNull();
    }
  });

  it("themes a collection only when it belongs to the general store", () => {
    expect(themeScopeForPath("/coleccion/ofertas", "store")).toBe("general");
    expect(themeScopeForPath("/coleccion/goth", "moon")).toBeNull();
    expect(themeScopeForPath("/coleccion/x")).toBeNull();
  });
});

describe("buildThemeCss", () => {
  it("emits nothing without a theme or without colors", () => {
    expect(buildThemeCss(null)).toBe("");
    expect(buildThemeCss(theme({}))).toBe("");
  });

  it("puts general colors under the general-page scope only, with followers resolved", () => {
    const css = buildThemeCss(theme({ background: "#7a1020" }));
    const generalRule = rules(css).find(
      ([selector]) => selector === 'html[data-theme-scope="general"]',
    );
    expect(generalRule).toBeTruthy();
    expect(generalRule![1]).toContain("--background:#7a1020");
    expect(generalRule![1]).toContain("--card:#7a1020");
    expect(generalRule![1]).toContain("--t-header-bg:#7a1020");
    expect(generalRule![1]).toContain("--t-dropdown-bg:#7a1020");
    expect(generalRule![1]).not.toContain("--foreground:");
  });

  it("puts announcement colors on html:root so they outweigh the :root defaults", () => {
    const css = buildThemeCss(theme({ "announcement.moon.background": "#3a1c28" }));
    expect(rules(css)).toEqual([["html:root", "--t-ann-a-bg:#3a1c28;"]]);
  });

  it("locks sub-brand elements on general pages back to the defaults, at zero specificity", () => {
    const css = buildThemeCss(theme({ background: "#7a1020", foreground: "#ffffff" }));
    const lock = rules(css).find(([selector]) => selector.startsWith(":where("));
    expect(lock![0]).toBe(':where(html[data-theme-scope="general"] :is([data-vibe], .theme-lock))');
    const background = THEME_TOKENS.find((token) => token.id === "background")!;
    expect(lock![1]).toContain(`--background:${background.default}`);
    expect(lock![1]).toContain("--card:oklch(1 0 0)");
    // Rootless tokens go back to their readers' own fallbacks.
    expect(lock![1]).toContain("--t-header-bg:initial");
  });

  it("only ever emits the three allowed selectors (the color lock)", () => {
    const everything = Object.fromEntries(THEME_TOKENS.map((token) => [token.id, "#123456"]));
    const css = buildThemeCss(theme(everything));
    for (const [selector, declarations] of rules(css)) {
      expect([
        'html[data-theme-scope="general"]',
        "html:root",
        ':where(html[data-theme-scope="general"] :is([data-vibe], .theme-lock))',
      ]).toContain(selector);
      if (selector === "html:root") {
        for (const declaration of declarations.split(";").filter(Boolean)) {
          expect(declaration.startsWith("--t-ann-"), declaration).toBe(true);
        }
      }
    }
    expect(css).not.toMatch(/data-vibe="/);
    expect(css).not.toMatch(/[<>]/);
  });
});

describe("styles.css defaults match the token table", () => {
  it("declares every token in :root with its exact default", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const root = /:root\s*\{([^}]*)\}/.exec(css)![1]!;
    const declared = new Map(
      [...root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(
        (match) => [match[1]!, match[2]!.trim()] as const,
      ),
    );
    const resolve = (value: string): string => {
      const reference = /^var\((--[\w-]+)\)$/.exec(value);
      return reference ? resolve(declared.get(reference[1]!) ?? value) : value;
    };
    for (const token of THEME_TOKENS.filter(
      (entry) => !entry.rootless && (entry.scope === "general" || entry.cssVar.startsWith("--t-")),
    )) {
      expect(declared.has(token.cssVar), token.cssVar).toBe(true);
      expect(resolve(declared.get(token.cssVar)!), token.cssVar).toBe(token.default);
    }
  });
});

describe("rootless tokens", () => {
  it("are never declared in :root (their readers carry the fallback)", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    const root = /:root\s*\{([^}]*)\}/.exec(css)![1]!;
    for (const token of THEME_TOKENS.filter((entry) => entry.rootless)) {
      expect(root, token.cssVar).not.toContain(`${token.cssVar}:`);
    }
  });
});

describe("cssColorToRgbTriplet", () => {
  it("reads hex and rgb(a), and refuses anything else", async () => {
    const { cssColorToRgbTriplet } = await import("@/lib/theme-css");
    expect(cssColorToRgbTriplet("rgb(100, 74, 74)")).toBe("100, 74, 74");
    expect(cssColorToRgbTriplet(" #7a1020 ")).toBe("122, 16, 32");
    expect(cssColorToRgbTriplet("#7a102080")).toBe("122, 16, 32");
    expect(cssColorToRgbTriplet("rgba(1,2,3,0.5)")).toBe("1, 2, 3");
    expect(cssColorToRgbTriplet("")).toBeNull();
    expect(cssColorToRgbTriplet("red")).toBeNull();
    expect(cssColorToRgbTriplet("rgb(300,0,0)")).toBeNull();
  });
});

describe("stickerAreasForPath", () => {
  it("gives each page its sticker areas, never the header bar", async () => {
    const { stickerAreasForPath } = await import("@/lib/theme-css");
    expect(stickerAreasForPath("/")).toEqual(["home", "general", "footer", "dropdown"]);
    expect(stickerAreasForPath("/tienda")).toEqual(["general", "footer", "dropdown"]);
    expect(stickerAreasForPath("/coleccion/ofertas", "store")).toEqual([
      "general",
      "footer",
      "dropdown",
    ]);
    expect(stickerAreasForPath("/coleccion/goth", "moon")).toEqual(["collection", "dropdown"]);
    expect(stickerAreasForPath("/moon")).toEqual(["moon", "dropdown"]);
    expect(stickerAreasForPath("/sunshine")).toEqual(["sunshine", "dropdown"]);
    expect(stickerAreasForPath("/men")).toEqual(["men", "dropdown"]);
    expect(stickerAreasForPath("/producto/x")).toEqual(["product", "dropdown"]);
    expect(stickerAreasForPath("/carrito")).toEqual(["checkout", "dropdown"]);
    expect(stickerAreasForPath("/solicitud")).toEqual(["checkout", "dropdown"]);
    expect(stickerAreasForPath("/admin/temas")).toEqual([]);
  });
});
