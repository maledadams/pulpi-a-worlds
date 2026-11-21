import { formatCountdown, splitCountdownText } from "@/lib/announcement-schedule";
import { Link, useLocation } from "@tanstack/react-router";
import { ThemeAreaStickers } from "@/components/theme/ThemeStickers";
import { ThemeImage } from "@/components/theme/ThemeImage";
import { ShoppingBag, Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StorePineapple } from "@/components/branding/StorePineapple";
import { useCart } from "@/context/cart";
import {
  getCategoryImage,
  type Product,
  type ProductImage,
  type Vibe,
} from "@/data/products";
import { useCatalogProducts } from "@/context/catalog";
import logoMoonImg from "@/assets/logo-moon.png";
import logoSunImg from "@/assets/logo-sunshine.png";
import logoMenImg from "@/assets/logo-men.png";
import { collapseFamilies } from "@/lib/product-families";
import {
  getAvailableMenuCategories,
  getDepartmentCategoryLinkSearch,
  getCategoryLinkSearch,
  getProductCategories,
  type CatalogSearch,
} from "@/lib/store-filters";
type StoreAnnouncement = {
  id: string;
  text: string;
  /** Countdown target (UTC ISO), set in Temas › Anuncios. */
  countdownTo?: string | null;
};

/** "Termina en 2d 14:03:09": the clock ticks every second, in place of {cuenta} or at the end. */
function CountdownText({ text, target }: { text: string; target: string }) {
  const end = Date.parse(target);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const [before, after] = splitCountdownText(text);
  return (
    <>
      {before}
      {/* Server and browser render a second apart; the browser's tick takes over. */}
      <span className="font-bold tabular-nums" suppressHydrationWarning>
        {formatCountdown(end - now)}
      </span>
      {after}
    </>
  );
}

type AnnouncementTheme = {
  background: string;
  border: string;
  text: string;
  badgeBackground: string;
  badgeText: string;
};

type AnnouncementThemeKey = "store" | "moon" | "sunshine" | "men";

/* ── types ─────────────────────────────────────── */
type MegaKey = "tienda" | "moon" | "sunshine" | "men" | "nuevo" | "oferta";

type NavChild = {
  to: string;
  label: string;
  search?: CatalogSearch;
  hash?: string;
};

type MegaSection = {
  key: MegaKey;
  label: string;
  to: string;
  search?: CatalogSearch;
  hash?: string;
  overview: string;
  quickLinks: NavChild[];
  categories: Array<NavChild & { image: ProductImage | null; product: Product | null }>;
};

/* ── helpers ────────────────────────────────────── */
function initials(v: string) {
  return v
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function hashSeed(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Picks a stable "random" product to represent a category circle - stable
// meaning the same pick for every visitor on every request, not just cached
// per-browser, and it never changes on its own over time. The seed is built
// from the exact set of matching product ids, so the pick only changes when
// a product is actually added to or removed from the category (never just
// because time passed or someone reloaded the page), and it deliberately
// does not favor whichever product happens to be newest.
function getCategoryPreviewProduct(pool: Product[], categoryId: string) {
  const matches = pool
    .filter((p) => getProductCategories(p).includes(categoryId))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (matches.length === 0) return null;
  const seed = `${categoryId}:${matches.map((p) => p.id).join(",")}`;
  return matches[hashSeed(seed) % matches.length]!;
}

/* ── quick-link children ───────────────────────── */
const STORE_CHILDREN: NavChild[] = [
  { to: "/tienda", label: "Ver todo" },
  { to: "/tienda", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/tienda", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories().map((c) => ({
    to: "/tienda",
    label: c.label,
    search: getCategoryLinkSearch(c.id),
  })),
];

const MOON_CHILDREN: NavChild[] = [
  { to: "/moon", label: "Todo Moon" },
  { to: "/moon", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/moon", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("moon").map((c) => ({
    to: "/moon",
    label: c.label,
    search: getDepartmentCategoryLinkSearch("moon", c.id),
  })),
];

const SUNSHINE_CHILDREN: NavChild[] = [
  { to: "/sunshine", label: "Todo Sunshine" },
  { to: "/sunshine", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/sunshine", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("sunshine").map((c) => ({
    to: "/sunshine",
    label: c.label,
    search: getDepartmentCategoryLinkSearch("sunshine", c.id),
  })),
];

const MEN_CHILDREN: NavChild[] = [
  { to: "/men", label: "Todo Men" },
  { to: "/men", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/men", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("men").map((c) => ({
    to: "/men",
    label: c.label,
    search: getDepartmentCategoryLinkSearch("men", c.id),
  })),
];

/* ── nav items ─────────────────────────────────── */
type NavItem = {
  to: string;
  label: string;
  mega?: MegaKey;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda", mega: "tienda", children: STORE_CHILDREN },
  { to: "/moon", label: "Moon", mega: "moon", children: MOON_CHILDREN },
  { to: "/sunshine", label: "Sunshine", mega: "sunshine", children: SUNSHINE_CHILDREN },
  { to: "/men", label: "Men", mega: "men", children: MEN_CHILDREN },
  { to: "/contacto", label: "Contacto" },
];

/* ── per-vibe mega panel ───────────────────────── */
// Each store's preview takes its background and text from that store's own
// theme (data-vibe on the panel); its pills and square buttons are these.
type VibePanelStyle = {
  linkCls: string;
  tabActiveCls: string;
  tabIdleCls: string;
  logo: string;
  logoBlend: string;
};

const VIBE_PANEL: Partial<Record<MegaKey, VibePanelStyle>> = {
  moon: {
    linkCls: "border-white/10 bg-white/5 text-[#f5ece8] hover:bg-white/12",
    tabActiveCls: "bg-foreground text-background",
    tabIdleCls: "bg-white/10 text-[#f5ece8] hover:bg-white/18",
    logo: logoMoonImg,
    logoBlend: "mix-blend-screen",
  },
  sunshine: {
    linkCls: "border-[#b86f8b] bg-[#5a1830]/10 text-[#3a0a14] hover:bg-[#5a1830]/18",
    tabActiveCls: "bg-foreground text-background",
    tabIdleCls: "bg-[#5a1830]/10 text-[#3a0a14] hover:bg-[#5a1830]/18",
    logo: logoSunImg,
    /* no blend — show logo naturally on the light background */
    logoBlend: "",
  },
  men: {
    // White text on Men's buttons (owner, 2026-11-18).
    linkCls: "border-white/10 bg-white/5 text-white hover:bg-white/12",
    tabActiveCls: "bg-foreground text-background",
    tabIdleCls: "bg-white/10 text-white hover:bg-white/18",
    logo: logoMenImg,
    logoBlend: "mix-blend-screen",
  },
};

/* ── category circle ────────────────────────────── */
function CategoryCircle({
  item,
  textCls = "text-foreground",
}: {
  item: MegaSection["categories"][number];
  textCls?: string;
}) {
  const p = item.product;
  const image = item.image ?? p?.featuredImage ?? null;

  return (
    <Link
      to={item.to}
      search={item.search}
      hash={item.hash}
      className="group flex flex-col items-center gap-1.5 text-center outline-none focus-visible:outline-none"
    >
      <div
        className="ui-circle flex h-[3.8rem] w-[3.8rem] items-center justify-center overflow-hidden shadow-none ring-0 transition-transform duration-200 group-hover:-translate-y-1 sm:h-[4.2rem] sm:w-[4.2rem]"
        style={
          p
            ? { background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1]})` }
            : { background: "var(--muted)" }
        }
      >
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? item.label}
            loading="lazy"
            decoding="async"
            className="ui-circle h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-lg uppercase text-foreground/55">
            {initials(p?.name ?? item.label)}
          </span>
        )}
      </div>
      <span className={`line-clamp-2 text-[11px] font-semibold leading-tight ${textCls}`}>
        {item.label}
      </span>
    </Link>
  );
}

/* ── Header ─────────────────────────────────────── */
// Bar colors are theme variables (src/lib/theme-tokens.ts, "Anuncios"); their
// defaults in styles.css are the colors these classes had.
function getAnnouncementTheme(themeKey: AnnouncementThemeKey): AnnouncementTheme {
  if (themeKey === "sunshine") {
    return {
      background: "bg-[color:var(--t-ann-b-bg)]",
      border: "border-transparent",
      text: "text-[color:var(--t-ann-b-text)]",
      badgeBackground: "bg-[color:var(--t-ann-b-badge)]",
      badgeText: "text-[color:var(--t-ann-b-badge-text)]",
    };
  }

  if (themeKey === "moon") {
    return {
      background: "bg-[color:var(--t-ann-a-bg)]",
      border: "border-transparent",
      text: "text-[color:var(--t-ann-a-text)]",
      badgeBackground: "bg-[color:var(--t-ann-a-badge)]",
      badgeText: "text-[color:var(--t-ann-a-badge-text)]",
    };
  }

  if (themeKey === "men") {
    return {
      background: "bg-[color:var(--t-ann-c-bg)]",
      border: "border-transparent",
      text: "text-[color:var(--t-ann-c-text)]",
      badgeBackground: "bg-[color:var(--t-ann-c-badge)]",
      badgeText: "text-[color:var(--t-ann-c-badge-text)]",
    };
  }

  return {
    background: "bg-[color:var(--t-ann-general-bg)]",
    border: "border-transparent",
    text: "text-[color:var(--t-ann-general-text)]",
    badgeBackground: "bg-[color:var(--t-ann-general-badge)]",
    badgeText: "text-[color:var(--t-ann-general-badge-text)]",
  };
}

function AnnouncementBar({ announcements, theme }: { announcements: StoreAnnouncement[]; theme: AnnouncementTheme }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [announcements]);

  useEffect(() => {
    if (announcements.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % announcements.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [announcements]);

  if (announcements.length === 0) {
    return null;
  }

  // Only the active announcement is ever in the DOM - stacking every
  // announcement in the same grid cell (even hidden ones) made the bar's
  // height match whichever announcement was tallest, so a one-line message
  // still reserved two lines of space whenever any other rotating message
  // wrapped to two lines. Rendering just the active one lets the bar's
  // height follow its own line count instead.
  const active = announcements[activeIndex] ?? announcements[0]!;

  return (
    <div className={`px-4 py-2 ${theme.background} ${theme.border} ${theme.text}`}>
      {/* Fixed to exactly two lines' height on mobile (overflow-hidden clips
          anything past that) so a longer rotating message never grows the
          bar and shoves the rest of the page down - it just crops instead. */}
      <div className="mx-auto max-h-10 max-w-7xl overflow-hidden text-center sm:max-h-none">
        <div key={active.id} className="announcement-fade font-body text-sm leading-5 sm:text-[0.95rem]">
          {active.countdownTo && Number.isFinite(Date.parse(active.countdownTo)) ? (
            <CountdownText text={active.text} target={active.countdownTo} />
          ) : (
            active.text
          )}
        </div>
      </div>
    </div>
  );
}

export function Header({
  announcements = [],
  announcementThemeOverride,
}: {
  announcements?: StoreAnnouncement[];
  announcementThemeOverride?: AnnouncementThemeKey;
}) {
  const cart = useCart();
  const catalogProducts = useCatalogProducts();
  const loc = useLocation();
  const activeThemeKey =
    announcementThemeOverride ??
      (loc.pathname.startsWith("/sunshine")
        ? "sunshine"
        : loc.pathname.startsWith("/moon")
          ? "moon"
          : loc.pathname.startsWith("/men")
            ? "men"
            : "store");
  // Base theme = not Moon, Sunshine or Men. Header links hover in each
  // theme's own muted color: light gray in the base theme; the sub-stores
  // keep their original hover.
  const isBaseTheme = activeThemeKey === "store";
  const hoverCls = "hover:bg-muted hover:text-foreground";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  // Hovering Moon, Sunshine or Men switches the whole header to that store's
  // theme while its preview is open; hovering off returns to the page's theme.
  // Tienda/Nuevo/Oferta never switch it. No color animation (owner,
  // 2026-11-18): see .site-header in styles.css.
  const hoverStore = activeMega && VIBE_PANEL[activeMega] ? (activeMega as "moon" | "sunshine" | "men") : null;
  const headerThemeKey = hoverStore ?? activeThemeKey;
  const announcementTheme = getAnnouncementTheme(headerThemeKey);
  const [renderedMega, setRenderedMega] = useState<MegaKey | null>(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Publishes how much of the header is still on screen, in CSS px, as
  // --site-header-visible: its full height at the top of the page, down to 0
  // once it has scrolled away (the header scrolls with the page). The tienda
  // filter box uses it to sit right under it and fill the rest of the screen.
  // Rects are in zoomed px (html has a per-breakpoint zoom); dividing by
  // rect.height / offsetHeight brings them back to CSS px.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    let frame = 0;
    let last = "";
    const publish = () => {
      frame = 0;
      const rect = header.getBoundingClientRect();
      const scale = rect.height / header.offsetHeight || 1;
      const visible = `${Math.round(Math.max(0, rect.bottom) / scale)}px`;
      if (visible === last) return;
      last = visible;
      root.style.setProperty("--site-header-visible", visible);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(publish);
    };
    publish();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(header);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setCategoryPage(0);
  }, [renderedMega]);

  /* close mobile on route change */
  useEffect(() => {
    setMobileOpen(false);
    setMobileExpanded(null);
    setActiveMega(null);
    setRenderedMega(null);
  }, [loc.pathname]);

  /* delayed hide so user can move mouse into the panel */
  const handleMouseLeaveHeader = () => {
    leaveTimer.current = setTimeout(() => setActiveMega(null), 180);
  };
  const handleMouseEnterPanel = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  };

  useEffect(() => {
    if (activeMega) {
      setRenderedMega(activeMega);
    } else {
      const t = setTimeout(() => setRenderedMega(null), 250);
      return () => clearTimeout(t);
    }
  }, [activeMega]);

  /* scrolling the page closes the mega dropdown */
  useEffect(() => {
    if (!activeMega) return;
    const close = () => setActiveMega(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [activeMega]);

  const navItems = useMemo<NavItem[]>(() => {
    const buildChildren = (to: string, label: string, vibe?: Vibe) => [
      { to, label },
      { to, label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
      { to, label: "Oferta", search: { sale: "1" }, hash: "shop" },
      ...getAvailableMenuCategories(catalogProducts, vibe).map((category) => ({
        to,
        label: category.label,
        search: vibe
          ? getDepartmentCategoryLinkSearch(vibe, category.id)
          : getCategoryLinkSearch(category.id),
      })),
    ];

    return [
      { to: "/", label: "Inicio" },
      { to: "/tienda", label: "Tienda", mega: "tienda", children: buildChildren("/tienda", "Ver todo") },
      { to: "/moon", label: "Moon", mega: "moon", children: buildChildren("/moon", "Todo Moon", "moon") },
      { to: "/sunshine", label: "Sunshine", mega: "sunshine", children: buildChildren("/sunshine", "Todo Sunshine", "sunshine") },
      { to: "/men", label: "Men", mega: "men", children: buildChildren("/men", "Todo Men", "men") },
      { to: "/contacto", label: "Contacto" },
    ];
  }, [catalogProducts]);

  /* build mega sections */
  const megaSections = useMemo<Record<MegaKey, MegaSection>>(() => {
    const publicProducts = catalogProducts;
    // One card per product family (sub-products in other colors).
    const pool = (keep: (p: Product) => boolean) => collapseFamilies(publicProducts.filter(keep), publicProducts);
    const moonPool = pool((p) => p.vibe === "moon" || p.secondaryVibe === "moon");
    const sunPool = pool((p) => p.vibe === "sunshine" || p.secondaryVibe === "sunshine");
    const menPool = pool((p) => p.vibe === "men" || p.secondaryVibe === "men");
    const newPool = pool((p) => p.newArrival);
    const salePool = pool((p) => !!p.salePrice);

    const build = (
      key: MegaKey,
      label: string,
      to: string,
      overview: string,
      pool: Product[],
      quickLinks: NavChild[],
      cats: ReturnType<typeof getAvailableMenuCategories>,
      baseSearch?: CatalogSearch,
    ): MegaSection => ({
      key, label, to,
      search: baseSearch,
      hash: key === "nuevo" || key === "oferta" ? "shop" : undefined,
      overview,
      quickLinks,
      categories: cats.map((c) => ({
        to,
        label: c.label,
        hash: "shop",
        search:
          key === "tienda" ? getCategoryLinkSearch(c.id)
          : key === "moon" || key === "sunshine" || key === "men"
            ? getDepartmentCategoryLinkSearch(key, c.id)
            : baseSearch ? { ...baseSearch, category: c.id } : undefined,
        product: getCategoryPreviewProduct(pool, c.id),
        image:
          key === "moon" || key === "sunshine" || key === "men"
            ? getCategoryImage(c.id, key)
            : null,
      })),
    });

    return {
      tienda: build("tienda","General","/tienda","Toda la tienda en un solo lugar.",publicProducts,
        [{to:"/tienda",label:"Ver todo"},{to:"/tienda",label:"Nuevo",search:{fresh:"1"},hash:"shop"},{to:"/tienda",label:"Oferta",search:{sale:"1"},hash:"shop"}],
        getAvailableMenuCategories(publicProducts)),
      moon: build("moon","Moon","/moon","Oscuro, dramático, gótico y alternativo.",moonPool,
        [{to:"/moon",label:"Todo Moon"},{to:"/moon",label:"Nuevo",search:{fresh:"1"},hash:"shop"},{to:"/moon",label:"Oferta",search:{sale:"1"},hash:"shop"}],
        getAvailableMenuCategories(publicProducts, "moon")),
      sunshine: build("sunshine","Sunshine","/sunshine","Glossy, bright, playful y hyper-femenino.",sunPool,
        [{to:"/sunshine",label:"Todo Sunshine"},{to:"/sunshine",label:"Nuevo",search:{fresh:"1"},hash:"shop"},{to:"/sunshine",label:"Oferta",search:{sale:"1"},hash:"shop"}],
        getAvailableMenuCategories(publicProducts, "sunshine")),
      men: build("men","Men","/men","Punk, underground y alternativo.",menPool,
        [{to:"/men",label:"Todo Men"},{to:"/men",label:"Nuevo",search:{fresh:"1"},hash:"shop"},{to:"/men",label:"Oferta",search:{sale:"1"},hash:"shop"}],
        getAvailableMenuCategories(publicProducts, "men")),
      nuevo: build("nuevo","Nuevo","/tienda","Lo último que entró al catálogo.",newPool,
        [{to:"/tienda",label:"Todo lo nuevo",search:{fresh:"1"},hash:"shop"},{to:"/moon",label:"Moon nuevo",search:{fresh:"1"},hash:"shop"},{to:"/sunshine",label:"Sunshine nuevo",search:{fresh:"1"},hash:"shop"},{to:"/men",label:"Men nuevo",search:{fresh:"1"},hash:"shop"}],
        getAvailableMenuCategories(newPool),
        {fresh:"1"}),
      oferta: build("oferta","Oferta","/tienda","Piezas rebajadas en toda la tienda.",salePool,
        [{to:"/tienda",label:"Ver ofertas",search:{sale:"1"},hash:"shop"},{to:"/moon",label:"Moon en oferta",search:{sale:"1"},hash:"shop"},{to:"/sunshine",label:"Sunshine en oferta",search:{sale:"1"},hash:"shop"},{to:"/men",label:"Men en oferta",search:{sale:"1"},hash:"shop"}],
        getAvailableMenuCategories(salePool),
        {sale:"1"}),
    };
  }, [catalogProducts]);

  const currentMega = renderedMega ? megaSections[renderedMega] : null;
  const megaOpen = !!activeMega;

  return (
    <header
      ref={headerRef}
      data-vibe={hoverStore ?? undefined}
      className={`site-header sticky top-0 bg-[color:var(--t-header-bg,var(--background))] text-foreground ${
        renderedMega ? "z-[99999]" : "z-40"
      }`}
      onMouseLeave={handleMouseLeaveHeader}
    >
      {/* ── Top bar ── */}
      {/* Full-width, with the header's own background: the mega panel's extra
          strip (below) tucks behind this row, out of sight. */}
      <div className="relative z-20 bg-[color:var(--t-header-bg,var(--background))]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 -mr-[2.2rem]">
          <StorePineapple
            theme={headerThemeKey}
            className="h-6 w-6 shrink-0 object-contain sm:h-9"
          />
          <span
            className="brand-wordmark font-display text-xl tracking-wide sm:text-2xl"
          >
            Pulpiña RD
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((n) => {
            const active = n.to === "/" ? loc.pathname === "/" : loc.pathname === n.to || loc.pathname.startsWith(`${n.to}/`);
            const megaActive = n.mega && activeMega === n.mega;
            return (
              <Link
                key={n.to}
                to={n.to}
                onMouseEnter={() => {
                  if (n.mega) {
                    setRenderedMega(n.mega);
                    setActiveMega(n.mega);
                  } else {
                    setActiveMega(null);
                  }
                }}
                className={`ui-nav-rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active || megaActive
                    ? "bg-[color:var(--t-header-active-bg,var(--foreground))] text-[color:var(--t-header-active-text,var(--background))]"
                    : `text-[color:var(--t-header-text,var(--muted-foreground))] ${hoverCls}`
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-1">
          <Link to="/tienda" className="rounded-full p-2 text-[color:var(--t-header-text,var(--muted-foreground))]" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => cart.setOpen(true)}
            className="relative rounded-full p-2 text-[color:var(--t-header-text,var(--muted-foreground))]"
            aria-label="Carrito"
          >
            <ShoppingBag className="h-5 w-5" />
            {cart.count > 0 && (
              <span
                className={`ui-circle absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center text-[9px] font-black ${announcementTheme.badgeBackground} ${announcementTheme.badgeText}`}
              >
                {cart.count}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`rounded-full p-2 text-[color:var(--t-header-text,var(--muted-foreground))] md:hidden ${hoverCls}`}
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      </div>

      {/* ── Desktop mega menu ── */}
      {/* The announcement keeps the page's own color while a store preview is
          hovered; it only changes when the page itself changes (owner, 2026-11-18). */}
      <AnnouncementBar announcements={announcements} theme={getAnnouncementTheme(activeThemeKey)} />
      {/* Hangs off the bottom of the nav row (top-14 = its h-14), so it covers
          the announcement bar instead of opening below it. Pure CSS on
          purpose: html has a per-breakpoint `zoom` (styles.css), and JS
          measurements under zoom disagree between Safari and Chrome. */}
      <div
          // Starts 1rem above the nav row's bottom (top-10, not top-14) so a
          // strip of its own background sits behind the header; pt-9 below
          // keeps the content exactly where it was. While it slides, that
          // strip covers the gap (owner, 2026-11-18). Opens coming down out of
          // the header (mega-in), closes going back up behind it (mega-out).
          className={`absolute inset-x-0 top-10 hidden max-h-[35rem] overflow-hidden shadow-xl md:block ${
            megaOpen
              ? "pointer-events-auto opacity-100 [animation:mega-in_250ms_ease]"
              : renderedMega
                ? "pointer-events-none opacity-0 [animation:mega-out_250ms_ease]"
                : "pointer-events-none opacity-0"
          }`}
          // Moon, Sunshine and Men previews wear their own store's palette on
          // every page (owner, 2026-11-18); General/Nuevo/Oferta follow the
          // page you are on. Raw var(--...) here, not --color-*, so they
          // resolve against this data-vibe.
          data-vibe={currentMega && VIBE_PANEL[currentMega.key] ? currentMega.key : undefined}
          style={{
            background: "var(--t-dropdown-bg, var(--background))",
            borderBottom: "1px solid var(--border)",
            // Under the nav row (z-20) so the extra strip hides behind it,
            // over the announcement bar.
            zIndex: 10,
          }}
          onMouseEnter={handleMouseEnterPanel}
        >
          {currentMega && (() => {
          const vs = VIBE_PANEL[currentMega.key];
          // Text colors resolve against the panel's data-vibe above.
          const textCls  = "text-foreground";
          const mutedCls = "text-muted-foreground";
          // General/Nuevo/Oferta panels: light gray buttons in the base theme;
          // on the Moon and Sunshine pages, that store's own preview pills and
          // square buttons; on the Men page their own style with white text
          // (owner, 2026-11-18).
          const pageVs =
            activeThemeKey === "moon" || activeThemeKey === "sunshine" ? VIBE_PANEL[activeThemeKey] : undefined;
          const isMenPage = activeThemeKey === "men";
          const linkCls  = vs?.linkCls ?? pageVs?.linkCls ?? (isBaseTheme
            ? "border-foreground/15 bg-muted text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
            : `border-foreground/10 bg-card ${isMenPage ? "text-white" : "text-foreground"} hover:bg-muted`);
          const tabActiveCls = vs?.tabActiveCls ?? pageVs?.tabActiveCls ?? "bg-foreground text-background";
          const tabIdleCls   = vs?.tabIdleCls   ?? pageVs?.tabIdleCls   ?? (isMenPage
            ? "bg-muted text-white hover:bg-foreground/8"
            : "bg-muted text-muted-foreground hover:bg-foreground/8 hover:text-foreground");
          const borderDiv    = "border-foreground/8";

          return (
            <div className="mx-auto max-w-7xl px-4 pb-5 pt-9">
              {/* Theme stickers: only the general panel on general pages (spec §2). */}
              {!vs && isBaseTheme ? <ThemeAreaStickers area="dropdown" /> : null}
              {/* ── Section tabs ── */}
              <div className={`mb-5 flex flex-wrap items-center gap-1.5 border-b pb-4 ${borderDiv}`}>
                {(["tienda","moon","sunshine","men","nuevo","oferta"] as MegaKey[]).map((key) => {
                  const s = megaSections[key];
                  return (
                    <Link
                      key={key}
                      to={s.to}
                      search={s.search}
                      hash={s.hash}
                      onMouseEnter={() => {
                        setRenderedMega(key);
                        setActiveMega(key);
                      }}
                      className={`ui-nav-rounded px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-colors ${
                        currentMega.key === key ? tabActiveCls : tabIdleCls
                      }`}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>

              {/* ── Body: logo col | info col | categories col ── */}
              <div
                className={`relative grid gap-6 ${
                  vs
                    ? "vibe-mega-grid lg:grid-cols-[12rem_13rem_1fr]"
                    : "lg:grid-cols-[13rem_1fr]"
                }`}
              >

                {/* 1 — Vibe logo (left column, only for vibe sections) */}
                {vs && (
                  <div className="vibe-mega-logo flex items-center justify-start pl-2">
                    <ThemeImage
                      slot={`logo.${currentMega.key as "moon" | "sunshine" | "men"}`}
                      src={vs.logo}
                      alt={currentMega.label}
                      loading="lazy"
                      decoding="async"
                      className={`max-h-[180px] w-auto max-w-full object-contain drop-shadow-2xl ${vs.logoBlend}`}
                    />
                  </div>
                )}

                {/* 2 — Title + quick links (no description) */}
                <div>
                  <h3
                    className={`${vs ? "" : "font-display"} text-2xl ${textCls}`}
                    style={{
                      fontFamily:
                        currentMega.key === "moon"
                          ? "var(--font-gothic)"
                          : currentMega.key === "sunshine"
                            ? "var(--font-sunshine)"
                            : currentMega.key === "men"
                              ? '"IM FELL Great Primer SC", serif'
                              : "var(--font-display)",
                      fontWeight: currentMega.key === "sunshine" ? 400 : undefined,
                    }}
                  >
                    {currentMega.label}
                  </h3>
                  <div className="mt-3 grid gap-1.5">
                    {currentMega.quickLinks.map((l) => (
                      <Link
                        key={`${currentMega.key}-${l.label}`}
                        to={l.to}
                        search={l.search}
                        hash={l.hash}
                        className={`rounded-lg border px-3.5 py-2.5 text-sm font-semibold transition-colors ${linkCls}`}
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 3 — Categories */}
                <div>
                  {(() => {
                    const CATEGORY_PAGE_SIZE = 12;
                    const totalPages = Math.max(1, Math.ceil(currentMega.categories.length / CATEGORY_PAGE_SIZE));
                    const safePage = Math.min(categoryPage, totalPages - 1);
                    const paged = currentMega.categories.slice(
                      safePage * CATEGORY_PAGE_SIZE,
                      safePage * CATEGORY_PAGE_SIZE + CATEGORY_PAGE_SIZE,
                    );
                    return (
                      <>
                        <div className="mb-3 flex items-center justify-between">
                          <span className={`text-xs font-black uppercase tracking-wider ${mutedCls}`}>
                            Categorías
                          </span>
                          {totalPages > 1 ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Categorías anteriores"
                                onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                                disabled={safePage === 0}
                                className={`rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-30 ${mutedCls}`}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Más categorías"
                                onClick={() => setCategoryPage((p) => Math.min(totalPages - 1, p + 1))}
                                disabled={safePage >= totalPages - 1}
                                className={`rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-30 ${mutedCls}`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                          {paged.map((item) => (
                            <CategoryCircle
                              key={`${currentMega.key}-${item.label}`}
                              item={item}
                              textCls={textCls}
                            />
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="border-t border-foreground/10 bg-[color:var(--t-header-bg,var(--background))] px-4 py-3 md:hidden">
          <nav className="grid gap-0.5">
            {navItems.map((n) => {
              const active = n.to === "/" ? loc.pathname === "/" : loc.pathname === n.to || loc.pathname.startsWith(`${n.to}/`);
              const expanded = mobileExpanded === n.to;
              return (
                <div key={n.to}>
                  <div className="flex items-center">
                    <Link
                      to={n.to}
                      onClick={() => !n.children && setMobileOpen(false)}
                      className={`ui-nav-rounded flex-1 px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[color:var(--t-header-active-bg,var(--foreground))] text-[color:var(--t-header-active-text,var(--background))]"
                          : hoverCls
                      }`}
                    >
                      {n.label}
                    </Link>
                    {n.children && (
                      <button
                        onClick={() => setMobileExpanded(expanded ? null : n.to)}
                        className={`ui-nav-rounded ml-1 p-2 ${hoverCls}`}
                      >
                        <span className={`block h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}>
                          ›
                        </span>
                      </button>
                    )}
                  </div>
                  {n.children && expanded && (
                    <div className="mt-0.5 mb-1 grid gap-0.5 pl-3">
                      {n.children.slice(0, 6).map((child) => (
                        <Link
                          key={`${n.to}-${child.label}`}
                          to={child.to}
                          search={child.search}
                          onClick={() => setMobileOpen(false)}
                          className={`ui-nav-rounded px-3 py-2 text-sm text-muted-foreground ${hoverCls}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
