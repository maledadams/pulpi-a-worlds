import { describe, expect, it } from "vitest";
import type { Product } from "@/data/products";
import { colorlessSizeClash, familyPageChoices } from "./product-families";

const member = (
  id: string,
  sizes: string[],
  color: string | null,
  motherId: string | null = null,
) =>
  ({
    id,
    name: id,
    motherId,
    sizes,
    colors: color ? [{ name: color, hex: "#000000" }] : [],
    options: [],
  }) as unknown as Product;

const mother = member("virgo", ["Virgo"], "Dorado");
const sagitario = member("sagitario", ["Sagitario"], null, "virgo");
const leo = member("leo", ["Leo"], null, "virgo");
const plata = member("plata", ["Virgo", "Leo"], "Plateado", "virgo");
const family = [mother, sagitario, leo, plata];

describe("colorlessSizeClash", () => {
  it("allows different sizes and ignores colored subs", () => {
    expect(colorlessSizeClash(family)).toBeNull();
  });
  it("finds a size repeated between the mother and a colorless sub, ignoring capitals", () => {
    expect(colorlessSizeClash([mother, member("dup", ["virgo"], null, "virgo")])).toEqual({
      size: "virgo",
      first: "virgo",
      second: "dup",
    });
  });
  it("finds a size repeated between two colorless subs", () => {
    expect(
      colorlessSizeClash([mother, sagitario, member("dup", ["Sagitario"], null, "virgo")])?.size,
    ).toBe("Sagitario");
  });
});

describe("familyPageChoices", () => {
  it("the mother's page lists her sizes, then her colorless subs' sizes", () => {
    const choices = familyPageChoices(mother, family);
    expect(choices.colorId).toBe("virgo");
    expect(choices.colored.map((entry) => entry.id)).toEqual(["virgo", "plata"]);
    expect(choices.sizes.map((entry) => [entry.size, entry.member.id])).toEqual([
      ["Virgo", "virgo"],
      ["Sagitario", "sagitario"],
      ["Leo", "leo"],
    ]);
  });
  it("a colorless sub's page shows the mother's color picked and the same sizes", () => {
    const choices = familyPageChoices(leo, family);
    expect(choices.colorId).toBe("virgo");
    expect(choices.sizes.map((entry) => entry.member.id)).toEqual(["virgo", "sagitario", "leo"]);
  });
  it("a colored sub's page shows only its own sizes", () => {
    const choices = familyPageChoices(plata, family);
    expect(choices.colorId).toBe("plata");
    expect(choices.sizes.map((entry) => entry.size)).toEqual(["Virgo", "Leo"]);
  });
  it("a family without colorless subs works as before", () => {
    const choices = familyPageChoices(mother, [mother, plata]);
    expect(choices.sizes.map((entry) => entry.size)).toEqual(["Virgo"]);
  });
});
