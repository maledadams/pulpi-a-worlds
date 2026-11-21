// Theme engine color tokens (spec 2026-11-16-pulpina-theme-engine-design §5.1, §5.6, §5.7).
//
// Every color a theme may change, with today's exact value as its default. A
// theme only ever sets these variables on general pages (see theme-css.ts);
// Moon, Sunshine and Men colors are never tokens, except their announcement bar
// (the one exception Lucia approved).
//
// `follows`: Lucia (2026-11-19) - "things that have the same color scheme will
// always change to the color we change it to". A follower takes its leader's
// theme value whenever the theme doesn't set it itself, so changing the master
// background also changes the cards, panels, drawer, header and checkout that
// are the same white today. With no theme, nothing is emitted and every
// variable keeps its default.

export type ThemeTokenGroup =
  | "Fondo y texto"
  | "Menú de arriba"
  | "Tarjetas de producto"
  | "Botones"
  | "Hero de inicio"
  | "Botones de tiendas (teléfono)"
  | "Footer"
  | "Anuncios"
  | "Checkout";

export type ThemeToken = {
  id: string;
  label: string;
  /** One line under the label: what it paints. */
  hint?: string;
  group: ThemeTokenGroup;
  /** The CSS custom property the storefront reads. */
  cssVar: string;
  /** Today's value, exactly as the site renders it now (what the editor swatch shows). */
  default: string;
  /** Token whose theme value this one takes when the theme doesn't set it. */
  follows?: string;
  /**
   * Not declared in :root: every reader writes its own fallback, var(--t-x, <today>),
   * because "today" depends on where it sits (a sub-brand palette, a card's store).
   * The color lock resets it to `initial`, which brings that fallback back.
   */
  rootless?: true;
  /**
   * Emitted as "r, g, b" for readers that add their own alpha: rgba(var(--x, 0,0,0), 0.6)
   * keeps today's pixels exactly, where color-mix() would round differently.
   */
  rgbTriplet?: true;
  /** An implementation duplicate: always follows its leader, never shown in the editor. */
  hidden?: true;
  /** Where it applies: general pages and checkout, or one announcement bar. */
  scope:
    | "general"
    | "announcement-general"
    | "announcement-moon"
    | "announcement-sunshine"
    | "announcement-men";
};

const general = (token: Omit<ThemeToken, "scope">): ThemeToken => ({ ...token, scope: "general" });

const BLACK = "oklch(0.18 0 0)";
const WHITE = "oklch(1 0 0)";
const GRAY_TEXT = "oklch(0.45 0 0)";

export const THEME_TOKENS: ThemeToken[] = [
  // Fondo y texto - the base palette in styles.css :root.
  general({
    id: "background",
    label: "Fondo general",
    hint: "El fondo de todas las páginas generales. Arrastra todo lo que hoy es del mismo blanco.",
    group: "Fondo y texto",
    cssVar: "--background",
    default: WHITE,
  }),
  general({
    id: "foreground",
    label: "Texto general",
    hint: "Títulos y textos de las páginas.",
    group: "Fondo y texto",
    cssVar: "--foreground",
    default: BLACK,
  }),
  general({
    id: "muted-foreground",
    label: "Texto suave",
    hint: "Descripciones, conteos de filtros y precios tachados.",
    group: "Fondo y texto",
    cssVar: "--muted-foreground",
    default: GRAY_TEXT,
  }),
  general({
    id: "outline",
    label: "Bordes",
    hint: "Los bordes negros de Tienda: filtros, buscador y orden.",
    group: "Fondo y texto",
    cssVar: "--t-outline",
    default: BLACK,
    rootless: true,
  }),
  general({
    id: "border",
    label: "Líneas divisorias",
    hint: "Las líneas finas que separan secciones.",
    group: "Fondo y texto",
    cssVar: "--border",
    default: "oklch(0.18 0 0 / 0.10)",
  }),
  general({
    id: "muted",
    label: "Fondo gris",
    hint: "Chips de categorías y tallas, preguntas frecuentes.",
    group: "Fondo y texto",
    cssVar: "--muted",
    default: "oklch(0.94 0 0)",
  }),
  general({
    id: "text-strong",
    label: "Texto del carrito y la solicitud",
    group: "Fondo y texto",
    cssVar: "--t-text-strong",
    default: "#1b1b1b",
    follows: "foreground",
  }),
  general({
    id: "field-background",
    label: "Fondo de campos del formulario",
    hint: "Nombre, correo, teléfono y dirección en la solicitud.",
    group: "Fondo y texto",
    cssVar: "--t-field-bg",
    default: "#ffffff",
    follows: "background",
  }),
  general({
    id: "text-soft",
    label: "Texto suave del formulario",
    group: "Fondo y texto",
    cssVar: "--t-text-soft",
    default: "#6c6c6c",
    follows: "muted-foreground",
  }),
  general({
    id: "text-soft-2",
    label: "Texto suave de opciones",
    group: "Fondo y texto",
    cssVar: "--t-text-soft-2",
    default: "#5e5e5e",
    follows: "text-soft",
    hidden: true,
  }),

  // Menú de arriba - the header row, its icons and the dropdown panel.
  general({
    id: "header-background",
    label: "Menú: fondo",
    group: "Menú de arriba",
    cssVar: "--t-header-bg",
    default: WHITE,
    follows: "background",
    rootless: true,
  }),
  general({
    id: "header-text",
    label: "Menú: texto e íconos",
    hint: "Inicio, Tienda, Moon… y los íconos de buscar, carrito y menú.",
    group: "Menú de arriba",
    cssVar: "--t-header-text",
    default: GRAY_TEXT,
    rootless: true,
  }),
  general({
    id: "header-active-background",
    label: "Menú: pestaña activa",
    hint: "La pastilla de la página en la que estás.",
    group: "Menú de arriba",
    cssVar: "--t-header-active-bg",
    default: BLACK,
    follows: "ink-strong",
    rootless: true,
  }),
  general({
    id: "header-active-text",
    label: "Menú: texto de la pestaña activa",
    group: "Menú de arriba",
    cssVar: "--t-header-active-text",
    default: WHITE,
    follows: "ink-strong-text",
    rootless: true,
  }),
  general({
    id: "dropdown-background",
    label: "Menú desplegable: fondo",
    hint: "El panel que baja al pasar el mouse por Tienda.",
    group: "Menú de arriba",
    cssVar: "--t-dropdown-bg",
    default: WHITE,
    follows: "header-background",
    rootless: true,
  }),

  // Tarjetas de producto - every card on Inicio and Tienda, whatever its store.
  general({
    id: "card",
    label: "Tarjetas: fondo",
    group: "Tarjetas de producto",
    cssVar: "--card",
    default: WHITE,
    follows: "background",
  }),
  general({
    id: "card-foreground",
    label: "Tarjetas: texto",
    hint: "Nombre y precio del producto.",
    group: "Tarjetas de producto",
    cssVar: "--card-foreground",
    default: BLACK,
    follows: "foreground",
  }),
  general({
    id: "card-border",
    label: "Tarjetas: borde",
    group: "Tarjetas de producto",
    cssVar: "--t-card-border",
    default: BLACK,
    follows: "outline",
    rootless: true,
  }),
  general({
    id: "card-cart-background",
    label: "Tarjetas: botón del carrito",
    group: "Tarjetas de producto",
    cssVar: "--t-card-cart-bg",
    default: "#ffffff",
  }),
  general({
    id: "card-cart-icon",
    label: "Tarjetas: ícono del carrito",
    group: "Tarjetas de producto",
    cssVar: "--t-card-cart-icon",
    default: "#231717",
  }),
  general({
    id: "badge-sale-background",
    label: "Etiqueta Oferta: fondo",
    hint: "Hoy cada tienda tiene la suya; con el tema todas usan este.",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-sale-bg",
    default: "#121212",
    rootless: true,
  }),
  general({
    id: "badge-sale-text",
    label: "Etiqueta Oferta: texto",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-sale-text",
    default: "#ffffff",
    rootless: true,
  }),
  general({
    id: "badge-new-background",
    label: "Etiqueta Nuevo: fondo",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-new-bg",
    default: "#d9ff6f",
  }),
  general({
    id: "badge-new-text",
    label: "Etiqueta Nuevo: texto",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-new-text",
    default: "#243011",
  }),
  general({
    id: "badge-soldout-background",
    label: "Etiqueta Agotado: fondo",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-soldout-bg",
    default: "rgba(0, 0, 0, 0.7)",
    rootless: true,
  }),
  general({
    id: "badge-soldout-text",
    label: "Etiqueta Agotado: texto",
    group: "Tarjetas de producto",
    cssVar: "--t-badge-soldout-text",
    default: "#ffffff",
  }),
  general({
    id: "sale-price",
    label: "Precio en oferta",
    group: "Tarjetas de producto",
    cssVar: "--t-sale-price",
    default: "currentColor",
  }),

  // Botones - every dark button (Aplicar, Completar pedido, Volver a la tienda…).
  general({
    id: "ink-strong",
    label: "Botones: fondo",
    hint: "Aplicar, Completar pedido, Volver a la tienda, Ir a la solicitud.",
    group: "Botones",
    cssVar: "--t-ink-strong",
    default: "#121212",
  }),
  general({
    id: "ink-strong-hover",
    label: "Botones: fondo al pasar el mouse",
    group: "Botones",
    cssVar: "--t-ink-strong-hover",
    default: "#2b2b2b",
    follows: "ink-strong",
  }),
  general({
    id: "ink-strong-text",
    label: "Botones: texto",
    group: "Botones",
    cssVar: "--t-ink-strong-text",
    default: "#ffffff",
  }),
  general({
    id: "button-dark",
    label: "Botones (negro de la página)",
    group: "Botones",
    cssVar: "--t-btn-dark",
    default: BLACK,
    follows: "ink-strong",
    rootless: true,
    hidden: true,
  }),
  general({
    id: "button-dark-text",
    label: "Botones (texto sobre el negro de la página)",
    group: "Botones",
    cssVar: "--t-btn-dark-text",
    default: "#ffffff",
    follows: "ink-strong-text",
    rootless: true,
    hidden: true,
  }),

  // Hero de inicio ("Escoge tu tienda"), src/routes/index.tsx.
  general({
    id: "hero-start",
    label: "Hero: color de inicio",
    group: "Hero de inicio",
    cssVar: "--t-hero-start",
    default: "rgba(7, 7, 8, 0.99)",
  }),
  general({
    id: "hero-middle",
    label: "Hero: color del medio",
    group: "Hero de inicio",
    cssVar: "--t-hero-middle",
    default: "rgba(14, 14, 15, 0.98)",
  }),
  general({
    id: "hero-end",
    label: "Hero: color final",
    group: "Hero de inicio",
    cssVar: "--t-hero-end",
    default: "rgba(22, 22, 24, 0.98)",
  }),
  general({
    id: "hero-edge",
    label: "Hero: color base de las esquinas",
    hint: "La sombra oscura de las orillas y esquinas.",
    group: "Hero de inicio",
    cssVar: "--t-hero-edge-rgb",
    default: "#000000",
    rootless: true,
    rgbTriplet: true,
  }),
  general({
    id: "hero-glow-left",
    label: "Hero: brillo izquierdo",
    group: "Hero de inicio",
    cssVar: "--t-hero-glow-left",
    default: "rgba(116, 36, 62, 0.26)",
  }),
  general({
    id: "hero-glow-right",
    label: "Hero: brillo derecho",
    group: "Hero de inicio",
    cssVar: "--t-hero-glow-right",
    default: "rgba(146, 146, 152, 0.2)",
  }),

  // The three store buttons of "Elige tu Tienda" on phones (Lucia, 2026-11-21), each on its
  // own. Rootless: the button carries today's color as its fallback. Vars use a/b/c, like
  // the announcement bars, so no general token is named after a sub-brand.
  ...([
    ["moon", "Moon", "a", "#7b1832", "#fff5f8"],
    ["sunshine", "Sunshine", "b", "#ff4ea3", "#ffffff"],
    ["men", "Men", "c", "#615b5b", "#ffffff"],
  ] as const).flatMap(([id, name, letter, fill, text]) => [
    general({
      id: `store-button.${id}.background`,
      label: `Botón ${name}: fondo`,
      group: "Botones de tiendas (teléfono)",
      cssVar: `--t-store-${letter}-bg`,
      default: fill,
      rootless: true,
    }),
    general({
      id: `store-button.${id}.text`,
      label: `Botón ${name}: texto`,
      group: "Botones de tiendas (teléfono)",
      cssVar: `--t-store-${letter}-text`,
      default: text,
      rootless: true,
    }),
    general({
      id: `store-button.${id}.outline`,
      label: `Botón ${name}: borde`,
      group: "Botones de tiendas (teléfono)",
      cssVar: `--t-store-${letter}-outline`,
      default: "#ffffff",
      rootless: true,
    }),
  ]),

  // Footer on general pages (Footer.tsx, base palette).
  general({
    id: "footer-background",
    label: "Footer: fondo",
    group: "Footer",
    cssVar: "--t-footer-bg",
    default: "#131313",
  }),
  general({
    id: "footer-text",
    label: "Footer: texto",
    group: "Footer",
    cssVar: "--t-footer-text",
    default: "#f0f0f0",
  }),

  // Checkout (/carrito, /solicitud) - the cream surfaces already follow the master.
  general({
    id: "checkout-lines",
    label: "Líneas de los lados",
    group: "Checkout",
    cssVar: "--t-checkout-lines",
    default: "rgb(100, 74, 74)",
  }),
  general({
    id: "checkout-submit",
    label: "Botón Completar pedido",
    group: "Checkout",
    cssVar: "--t-checkout-submit",
    default: BLACK,
    follows: "ink-strong",
  }),
  general({
    id: "checkout-error",
    label: "Avisos de error",
    group: "Checkout",
    cssVar: "--t-checkout-error",
    default: "#9a233d",
  }),
  general({
    id: "checkout-success",
    label: "Avisos de éxito",
    group: "Checkout",
    cssVar: "--t-checkout-success",
    default: "#1f7a43",
  }),

  // Anuncios: general bar plus each sub-brand bar (the approved exception).
  {
    id: "announcement.general.background",
    label: "Barra general: fondo",
    group: "Anuncios",
    cssVar: "--t-ann-general-bg",
    default: "#121212",
    scope: "announcement-general",
  },
  {
    id: "announcement.general.text",
    label: "Barra general: texto",
    group: "Anuncios",
    cssVar: "--t-ann-general-text",
    default: "#ffffff",
    scope: "announcement-general",
  },
  {
    id: "announcement.general.badge",
    label: "Barra general: contador del carrito",
    group: "Anuncios",
    cssVar: "--t-ann-general-badge",
    default: "#121212",
    follows: "announcement.general.background",
    scope: "announcement-general",
  },
  {
    id: "announcement.general.badgeText",
    label: "Barra general: texto del contador",
    group: "Anuncios",
    cssVar: "--t-ann-general-badge-text",
    default: "#ffffff",
    follows: "announcement.general.text",
    scope: "announcement-general",
  },
  {
    id: "announcement.moon.background",
    label: "Barra Moon: fondo",
    group: "Anuncios",
    cssVar: "--t-ann-a-bg",
    default: "#f3e7dc",
    scope: "announcement-moon",
  },
  {
    id: "announcement.moon.text",
    label: "Barra Moon: texto",
    group: "Anuncios",
    cssVar: "--t-ann-a-text",
    default: "#3a1c28",
    scope: "announcement-moon",
  },
  {
    id: "announcement.moon.badge",
    label: "Barra Moon: contador del carrito",
    group: "Anuncios",
    cssVar: "--t-ann-a-badge",
    default: "#7b1832",
    scope: "announcement-moon",
  },
  {
    id: "announcement.moon.badgeText",
    label: "Barra Moon: texto del contador",
    group: "Anuncios",
    cssVar: "--t-ann-a-badge-text",
    default: "#fff5f8",
    scope: "announcement-moon",
  },
  {
    id: "announcement.sunshine.background",
    label: "Barra Sunshine: fondo",
    group: "Anuncios",
    cssVar: "--t-ann-b-bg",
    default: "#ff4ea3",
    scope: "announcement-sunshine",
  },
  {
    id: "announcement.sunshine.text",
    label: "Barra Sunshine: texto",
    group: "Anuncios",
    cssVar: "--t-ann-b-text",
    default: "#ffffff",
    scope: "announcement-sunshine",
  },
  {
    id: "announcement.sunshine.badge",
    label: "Barra Sunshine: contador del carrito",
    group: "Anuncios",
    cssVar: "--t-ann-b-badge",
    default: "#ff4ea3",
    follows: "announcement.sunshine.background",
    scope: "announcement-sunshine",
  },
  {
    id: "announcement.sunshine.badgeText",
    label: "Barra Sunshine: texto del contador",
    group: "Anuncios",
    cssVar: "--t-ann-b-badge-text",
    default: "#ffffff",
    follows: "announcement.sunshine.text",
    scope: "announcement-sunshine",
  },
  {
    id: "announcement.men.background",
    label: "Barra Men: fondo",
    group: "Anuncios",
    cssVar: "--t-ann-c-bg",
    default: "#8f2015",
    scope: "announcement-men",
  },
  {
    id: "announcement.men.text",
    label: "Barra Men: texto",
    group: "Anuncios",
    cssVar: "--t-ann-c-text",
    default: "#fff7f2",
    scope: "announcement-men",
  },
  {
    id: "announcement.men.badge",
    label: "Barra Men: contador del carrito",
    group: "Anuncios",
    cssVar: "--t-ann-c-badge",
    default: "#8f2015",
    follows: "announcement.men.background",
    scope: "announcement-men",
  },
  {
    id: "announcement.men.badgeText",
    label: "Barra Men: texto del contador",
    group: "Anuncios",
    cssVar: "--t-ann-c-badge-text",
    default: "#fff7f2",
    follows: "announcement.men.text",
    scope: "announcement-men",
  },
];

export const THEME_TOKEN_IDS = THEME_TOKENS.map((token) => token.id);
const TOKENS_BY_ID = new Map(THEME_TOKENS.map((token) => [token.id, token]));

export function getThemeToken(id: string) {
  return TOKENS_BY_ID.get(id);
}

/**
 * The theme's own values plus every follower whose leader (directly or through
 * a chain) the theme set. Tokens the theme leaves alone are absent, so they
 * keep their defaults.
 */
export function resolveTokenValues(colors: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};
  const valueOf = (id: string, seen: Set<string>): string | undefined => {
    if (colors[id]) return colors[id];
    const leader = TOKENS_BY_ID.get(id)?.follows;
    if (!leader || seen.has(leader)) return undefined;
    seen.add(leader);
    return valueOf(leader, seen);
  };
  for (const token of THEME_TOKENS) {
    const value = valueOf(token.id, new Set([token.id]));
    if (value) resolved[token.id] = value;
  }
  return resolved;
}
