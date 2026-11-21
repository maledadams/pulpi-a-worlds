import { z } from "zod";
import { THEME_TOKEN_IDS } from "@/lib/theme-tokens";

// Theme document (spec 2026-11-16-pulpina-theme-engine-design §4.3).
// Two readers:
// - themeSchema: strict, used when saving. Anything wrong is refused with a message.
// - parseTheme: lenient, used when rendering. Bad entries are dropped one by one
//   and only a hopeless document returns null, so a theme can never break the page.

/** Hex (#rrggbb or #rrggbbaa) or rgb()/rgba() with in-range numbers. Nothing else ever reaches CSS. */
export function isThemeColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) return true;
  const match =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+|1\.0+)\s*)?\)$/i.exec(
      value,
    );
  if (!match) return false;
  return [match[1], match[2], match[3]].every((channel) => Number(channel) <= 255);
}

const colorSchema = z
  .string()
  .refine(isThemeColor, "Color inválido: usa #rrggbb o rgba(r, g, b, a).");

export const THEME_SLOT_IDS = [
  "home.storeTile.moon",
  "home.storeTile.sunshine",
  "home.storeTile.men",
  "home.birthday.partyHatLeft",
  "home.birthday.cakeLeft",
  "home.birthday.cakeRight",
  "home.birthday.partyHatRight",
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
] as const;
export type ThemeSlotId = (typeof THEME_SLOT_IDS)[number];

export const STICKER_AREAS = [
  "home",
  "general",
  "moon",
  "sunshine",
  "men",
  "collection",
  "product",
  "checkout",
  "footer",
  "dropdown",
] as const;
export type StickerArea = (typeof STICKER_AREAS)[number];

/** Per page: 8 on desktop, 5 visible on phones; product pages share one set of 3 (spec §5.2, §5.5). */
export const STICKER_LIMITS = { desktop: 8, phone: 5, product: 3 } as const;

export const HERO_EFFECT_PRESETS = [
  "snow",
  "hearts",
  "clovers",
  "fireworks",
  "pride",
  "confetti",
  "sparkles",
  "leaves",
  "petals",
  "custom",
] as const;

export const BANNER_LINK_KINDS = [
  "tienda",
  "moon",
  "sunshine",
  "men",
  "collection",
  "product",
] as const;

const assetId = z.string().regex(/^[a-z0-9_-]{1,64}$/i, "Imagen inválida.");

/** Position in % of the area (x, y = center), width in % of the area, rotation in degrees. */
const fitSchema = z.object({
  x: z.number().min(-50).max(150),
  y: z.number().min(-50).max(150),
  w: z.number().min(1).max(100),
  rot: z.number().min(-180).max(180),
});
export type ThemeFit = z.infer<typeof fitSchema>;

const slotSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("keep") }),
  z.object({ mode: z.literal("hide") }),
  z.object({
    mode: z.literal("replace"),
    asset: assetId,
    desktop: fitSchema.optional(),
    mobile: fitSchema.optional(),
  }),
]);
export type ThemeSlot = z.infer<typeof slotSchema>;

const stickerSchema = z.object({
  asset: assetId,
  anchor: z.enum(["page", "viewport"]),
  motion: z.enum(["none", "float", "sway", "drift", "fall", "bounce", "spin", "pulse", "wiggle"]),
  layer: z.enum(["behind", "front"]),
  hideOnPhone: z.boolean(),
  desktop: fitSchema,
  mobile: fitSchema,
});
export type ThemeSticker = z.infer<typeof stickerSchema>;

/**
 * How the particles look: their colors, the color filter and opacity (Lucia, 2026-11-20).
 * Set once for every hero, or per hero (perHero) so Moon, Sunshine and Men can differ.
 */
const particleLookShape = {
  /** Filter color; null = the preset's own colors (or the image's). */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Color inválido.")
    .nullable()
    .default(null),
  /** How strongly that color tints the particles, like a filter: 0-100 (%). Never see-through. */
  tint: z.number().int().min(0).max(100).default(100),
  /**
   * The built-in effect's own colors, changed one by one (by position, see
   * hero-effect-colors.ts); null at a position = that default. null = all defaults.
   */
  presetColors: z
    .array(z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido.").nullable())
    .max(8)
    .nullable()
    .default(null),
  /** How see-through the particles are: 5-100 (%), 100 = solid. */
  opacity: z.number().int().min(5).max(100).default(100),
};
const particleLookSchema = z.object(particleLookShape);
export type ParticleLook = z.infer<typeof particleLookSchema>;
export const HERO_IDS = ["home", "moon", "sunshine", "men"] as const;

const heroEffectSchema = z
  .object({
    preset: z.enum(HERO_EFFECT_PRESETS),
    particleAsset: assetId.nullable(),
    density: z.enum(["low", "medium", "high"]),
    speed: z.enum(["slow", "medium", "fast"]),
    ...particleLookShape,
    /** A hero's own look, over the one above; editing the shared look clears these. */
    perHero: z
      .object({
        home: particleLookSchema.optional(),
        moon: particleLookSchema.optional(),
        sunshine: particleLookSchema.optional(),
        men: particleLookSchema.optional(),
      })
      .default({}),
    phone: z.boolean(),
    heroes: z.object({
      home: z.boolean(),
      moon: z.boolean(),
      sunshine: z.boolean(),
      men: z.boolean(),
    }),
  })
  .refine(
    (effect) => effect.preset !== "custom" || effect.particleAsset,
    "El efecto personalizado necesita una imagen.",
  );
export type ThemeHeroEffect = z.infer<typeof heroEffectSchema>;

/** The look one hero draws with: its own if it has one, else the shared one. */
export function particleLookFor(
  effect: ThemeHeroEffect,
  hero: (typeof HERO_IDS)[number],
): ParticleLook {
  return (
    effect.perHero?.[hero] ?? {
      color: effect.color ?? null,
      tint: effect.tint ?? 100,
      presetColors: effect.presetColors ?? null,
      opacity: effect.opacity ?? 100,
    }
  );
}

/**
 * The sub-stores' moving wave, under the Inicio hero (Lucia, 2026-11-20). `fill` is the
 * color under the wave line (null = the page background, whatever the theme makes it);
 * `line` is its outline.
 */
const heroWaveSchema = z.object({
  line: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido."),
  fill: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Color inválido.")
    .nullable()
    .default(null),
});
export type ThemeHeroWave = z.infer<typeof heroWaveSchema>;

const bannerSchema = z.object({
  desktopAsset: assetId,
  mobileAsset: assetId,
  alt: z.string().trim().min(1, "Escribe el texto alternativo del banner.").max(160),
  link: z.discriminatedUnion("kind", [
    z.object({ kind: z.enum(["none", "tienda", "moon", "sunshine", "men"]) }),
    z.object({ kind: z.enum(["collection", "product"]), slug: z.string().trim().min(1).max(120) }),
  ]),
});
export type ThemeHomeBanner = z.infer<typeof bannerSchema>;

/**
 * A promotion's own banner (Lucia, 2026-11-20): shown while the promotion is on, with or
 * without a theme; on Inicio it replaces "Elige tu Tienda" like a theme banner does.
 */
export const PROMO_BANNER_PLACEMENTS = ["home", "tienda", "both"] as const;
export const promoBannerSchema = bannerSchema.extend({
  placement: z.enum(PROMO_BANNER_PLACEMENTS),
});
export type PromoBanner = z.infer<typeof promoBannerSchema>;
/** As it is being filled in (Promociones autosaves): images and alt may still be missing. */
export type PromoBannerDraft = {
  placement: PromoBanner["placement"];
  desktopAsset: string | null;
  mobileAsset: string | null;
  alt: string;
  link: PromoBanner["link"];
};

/** Keeps only well-formed parts of a banner draft; null when there is no banner. */
export function sanitizePromoBannerDraft(input: unknown): PromoBannerDraft | null {
  if (!isRecord(input)) return null;
  const asset = (value: unknown) => (assetId.safeParse(value).success ? (value as string) : null);
  const link = bannerSchema.shape.link.safeParse(input.link);
  return {
    placement: (PROMO_BANNER_PLACEMENTS as readonly unknown[]).includes(input.placement)
      ? (input.placement as PromoBanner["placement"])
      : "home",
    desktopAsset: asset(input.desktopAsset),
    mobileAsset: asset(input.mobileAsset),
    alt: typeof input.alt === "string" ? input.alt.slice(0, 160) : "",
    link: link.success ? link.data : { kind: "none" },
  };
}
/** Banners per page; more than one take turns on their own (Lucia, 2026-11-19). */
export const MAX_BANNERS = 10;
const bannerListSchema = z.array(bannerSchema).max(MAX_BANNERS, `Máximo ${MAX_BANNERS} banners.`);

function stickerListSchema(area: StickerArea) {
  const max = area === "product" ? STICKER_LIMITS.product : STICKER_LIMITS.desktop;
  return z
    .array(stickerSchema)
    .max(max, `Máximo ${max} stickers en esta página.`)
    .refine(
      (list) => list.filter((sticker) => !sticker.hideOnPhone).length <= STICKER_LIMITS.phone,
      `Máximo ${STICKER_LIMITS.phone} stickers visibles en teléfono por página.`,
    );
}

const tokenIds = new Set<string>(THEME_TOKEN_IDS);
const slotIds = new Set<string>(THEME_SLOT_IDS);

export const themeSchema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().trim().min(1, "Ponle un nombre al tema.").max(60),
  colors: z
    .record(z.string(), colorSchema)
    .refine(
      (colors) => Object.keys(colors).every((id) => tokenIds.has(id)),
      "Hay un color que no existe.",
    )
    .default({}),
  slots: z
    .record(z.string(), slotSchema)
    .refine(
      (slots) => Object.keys(slots).every((id) => slotIds.has(id)),
      "Hay una imagen que no existe.",
    )
    .default({}),
  stickers: z
    .object(
      Object.fromEntries(
        STICKER_AREAS.map((area) => [area, stickerListSchema(area).optional()]),
      ) as {
        [K in StickerArea]: z.ZodOptional<ReturnType<typeof stickerListSchema>>;
      },
    )
    .strict()
    .default({}),
  heroEffect: heroEffectSchema.nullable().default(null),
  heroWave: heroWaveSchema.nullable().default(null),
  homeBanners: bannerListSchema.default([]),
  /**
   * Inicio banners show above "Elige tu Tienda" instead of replacing it (Lucia,
   * 2026-11-20). Off (the default) = they replace it, as before. Promotion banners follow it.
   */
  keepStorePicker: z.boolean().default(false),
  tiendaBanners: bannerListSchema.default([]),
  favicon: assetId.nullable().default(null),
  shareImage: assetId.nullable().default(null),
  discountIds: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

export type ThemeDocument = z.infer<typeof themeSchema>;
export type Theme = {
  schemaVersion: 1;
  name: string;
  colors: Record<string, string>;
  slots: Partial<Record<ThemeSlotId, ThemeSlot>>;
  stickers: Partial<Record<StickerArea, ThemeSticker[]>>;
  heroEffect: ThemeHeroEffect | null;
  heroWave: ThemeHeroWave | null;
  homeBanners: ThemeHomeBanner[];
  keepStorePicker: boolean;
  tiendaBanners: ThemeHomeBanner[];
  favicon: string | null;
  shareImage: string | null;
  discountIds: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Lenient read: drops bad entries one by one; null only when the document itself is unusable. */
export function parseTheme(input: unknown): Theme | null {
  if (!isRecord(input) || input.schemaVersion !== 1) return null;
  const name =
    typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 60) : null;
  if (!name) return null;

  const colors: Record<string, string> = {};
  if (isRecord(input.colors)) {
    for (const [id, value] of Object.entries(input.colors)) {
      if (tokenIds.has(id) && isThemeColor(value)) colors[id] = value;
    }
  }

  const slots: Theme["slots"] = {};
  if (isRecord(input.slots)) {
    for (const [id, value] of Object.entries(input.slots)) {
      const parsed = slotSchema.safeParse(value);
      if (slotIds.has(id) && parsed.success) slots[id as ThemeSlotId] = parsed.data;
    }
  }

  const stickers: Theme["stickers"] = {};
  if (isRecord(input.stickers)) {
    for (const area of STICKER_AREAS) {
      const list = input.stickers[area];
      if (!Array.isArray(list)) continue;
      const max = area === "product" ? STICKER_LIMITS.product : STICKER_LIMITS.desktop;
      const valid: ThemeSticker[] = [];
      let onPhone = 0;
      for (const entry of list) {
        if (valid.length >= max) break;
        const parsed = stickerSchema.safeParse(entry);
        if (!parsed.success) continue;
        if (!parsed.data.hideOnPhone) {
          if (onPhone >= STICKER_LIMITS.phone) continue;
          onPhone++;
        }
        valid.push(parsed.data);
      }
      if (valid.length) stickers[area] = valid;
    }
  }

  const heroEffect = heroEffectSchema.safeParse(input.heroEffect);
  const heroWave = heroWaveSchema.safeParse(input.heroWave);
  const banners = (list: unknown) =>
    (Array.isArray(list) ? list : [])
      .flatMap((entry) => {
        const parsed = bannerSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      })
      .slice(0, MAX_BANNERS);
  // Themes saved before banner lists had one homeBanner.
  const homeBanners = banners(input.homeBanners ?? (input.homeBanner ? [input.homeBanner] : []));
  const tiendaBanners = banners(input.tiendaBanners);
  const favicon = assetId.safeParse(input.favicon);
  const shareImage = assetId.safeParse(input.shareImage);
  const discountIds = Array.isArray(input.discountIds)
    ? input.discountIds
        .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        .slice(0, 20)
    : [];

  return {
    schemaVersion: 1,
    name,
    colors,
    slots,
    stickers,
    heroEffect: heroEffect.success ? heroEffect.data : null,
    heroWave: heroWave.success ? heroWave.data : null,
    homeBanners,
    keepStorePicker: input.keepStorePicker === true,
    tiendaBanners,
    favicon: favicon.success ? favicon.data : null,
    shareImage: shareImage.success ? shareImage.data : null,
    discountIds,
  };
}
