import { describe, expect, it } from "vitest";
import { activeThemeSnippet, analyticsCoupon } from "@/lib/analytics";

describe("theme and discount reporting", () => {
  it("never sends a birthday code (they are per person), only shared codes", () => {
    expect(analyticsCoupon("FELIZ-ANA-8K2", "birthday")).toBe("CUMPLEANOS");
    expect(analyticsCoupon(" bf40 ", "general")).toBe("BF40");
    expect(analyticsCoupon("", "general")).toBeUndefined();
  });

  it("sets the theme before the first page_view, and a name can't break out of the script", () => {
    expect(activeThemeSnippet(null)).toBe(`gtag('set', {active_theme: "Sin tema"});`);
    const evil = activeThemeSnippet('</script><script>alert(1)</script>"');
    expect(evil).not.toContain("<");
    expect(evil).toContain('\\u003c/script>');
  });
});
