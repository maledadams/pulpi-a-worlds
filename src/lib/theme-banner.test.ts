import { describe, expect, it } from "vitest";
import { BANNER_MIN_WIDTH, bannerImageProblem, bannerPath } from "@/lib/theme-banner";

describe("bannerPath", () => {
  it("links the store pages directly", () => {
    expect(bannerPath({ kind: "tienda" }, true)).toBe("/tienda");
    expect(bannerPath({ kind: "moon" }, true)).toBe("/moon");
    expect(bannerPath({ kind: "sunshine" }, true)).toBe("/sunshine");
    expect(bannerPath({ kind: "men" }, true)).toBe("/men");
  });

  it("links a collection or product that still exists", () => {
    expect(bannerPath({ kind: "collection", slug: "black-friday" }, true)).toBe(
      "/coleccion/black-friday",
    );
    expect(bannerPath({ kind: "product", slug: "corset-luna" }, true)).toBe(
      "/producto/corset-luna",
    );
  });

  it("falls back to /tienda when the collection or product is gone", () => {
    expect(bannerPath({ kind: "collection", slug: "borrada" }, false)).toBe("/tienda");
    expect(bannerPath({ kind: "product", slug: "borrado" }, false)).toBe("/tienda");
  });

  it("encodes the slug", () => {
    expect(bannerPath({ kind: "product", slug: "a b/c" }, true)).toBe("/producto/a%20b%2Fc");
  });
});

describe("bannerImageProblem", () => {
  it("accepts images at least as wide as the device needs", () => {
    expect(bannerImageProblem(BANNER_MIN_WIDTH.desktop, "desktop")).toBeNull();
    expect(bannerImageProblem(4000, "desktop")).toBeNull();
    expect(bannerImageProblem(BANNER_MIN_WIDTH.phone, "phone")).toBeNull();
  });

  it("explains, with the exact width, why a narrow image is refused", () => {
    expect(bannerImageProblem(1920, "desktop")).toBe(
      `La imagen de computadora mide 1920 px de ancho; necesita al menos ${BANNER_MIN_WIDTH.desktop} px para verse nítida en pantallas grandes.`,
    );
    expect(bannerImageProblem(800, "phone")).toMatch(new RegExp(`${BANNER_MIN_WIDTH.phone} px`));
  });
});
