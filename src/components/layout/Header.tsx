import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag, Search, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { MegaPortal } from "./MegaPortal";
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
};

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
  ...getAvailableMenuCategories(undefined, false).map((c) => ({
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

/* ── per-vibe mega panel styling ───────────────── */
type VibePanelStyle = {
  panelBg: string;
  text: string;
  muted: string;
  linkCls: string;
  tabActiveCls: string;
  tabIdleCls: string;
  logo: string;
  logoBlend: string;
};

const VIBE_PANEL: Partial<Record<MegaKey, VibePanelStyle>> = {
  moon: {
    panelBg: "linear-gradient(135deg,#0a0408 0%,#2a0a14 55%,#5a1420 100%)",
    text: "text-[#f5ece8]",
    muted: "text-[#c4a8a2]",
    linkCls: "border-white/10 bg-white/5 text-[#f5ece8] hover:bg-white/12",
    tabActiveCls: "bg-[#f5ece8] text-[#2a0a14]",
    tabIdleCls: "bg-white/10 text-[#f5ece8] hover:bg-white/18",
    logo: logoMoonImg,
    logoBlend: "mix-blend-screen",
  },
  sunshine: {
    panelBg: "linear-gradient(135deg,#ff8fc9 0%,#ffe66a 55%,#c5f56a 100%)",
    text: "text-[#3a0a14]",
    muted: "text-[#5a1828]",
    linkCls: "border-[#b86f8b] bg-[#5a1830]/10 text-[#3a0a14] hover:bg-[#5a1830]/18",
    tabActiveCls: "bg-[#3a0a14] text-[#fff1b8]",
    tabIdleCls: "bg-[#5a1830]/10 text-[#3a0a14] hover:bg-[#5a1830]/18",
    logo: logoSunImg,
    /* no blend — show logo naturally on the light gradient */
    logoBlend: "",
  },
  men: {
    panelBg: "linear-gradient(135deg,#0a0a0a 0%,#1c1010 55%,#3a0808 100%)",
    text: "text-[#f0e8e6]",
    muted: "text-[#b09898]",
    linkCls: "border-white/10 bg-white/5 text-[#f0e8e6] hover:bg-white/12",
    tabActiveCls: "bg-[#f0e8e6] text-[#3a0808]",
    tabIdleCls: "bg-white/10 text-[#f0e8e6] hover:bg-white/18",
    logo: logoMenImg,
    logoBlend: "mix-blend-screen",
  },
};

/* ── category circle ────────────────────────────── */
function CategoryCircle({
  item,
  textCls = "text-foreground",
  isVibe = false,
}: {
  item: MegaSection["categories"][number];
  textCls?: string;
  isVibe?: boolean;
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
            : { background: isVibe ? "rgba(255,255,255,0.15)" : "#f3ece2" }
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
          <span className={`font-display text-lg uppercase ${isVibe ? "text-white/80" : "text-foreground/55"}`}>
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
function getAnnouncementTheme(themeKey: AnnouncementThemeKey): AnnouncementTheme {
  if (themeKey === "sunshine") {
    return {
      background: "bg-[#ff4ea3]",
      border: "border-transparent",
      text: "text-white",
      badgeBackground: "bg-[#ff4ea3]",
      badgeText: "text-white",
    };
  }

  if (themeKey === "moon") {
    return {
      background: "bg-[#f3e7dc]",
      border: "border-transparent",
      text: "text-[#3a1c28]",
      badgeBackground: "bg-[#7b1832]",
      badgeText: "text-[#fff5f8]",
    };
  }

  if (themeKey === "men") {
    return {
      background: "bg-[#8f2015]",
      border: "border-transparent",
      text: "text-[#fff7f2]",
      badgeBackground: "bg-[#8f2015]",
      badgeText: "text-[#fff7f2]",
    };
  }

  return {
    background: "bg-[#c5475f]",
    border: "border-transparent",
    text: "text-white",
    badgeBackground: "bg-[#c5475f]",
    badgeText: "text-white",
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
      <div className="mx-auto max-w-7xl text-center">
        <div key={active.id} className="announcement-fade font-body text-sm leading-5 sm:text-[0.95rem]">
          {active.text}
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
  const announcementTheme = getAnnouncementTheme(activeThemeKey);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  const [renderedMega, setRenderedMega] = useState<MegaKey | null>(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCategoryPage(0);
  }, [renderedMega]);

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const update = () => setHeaderHeight(headerRef.current?.getBoundingClientRect().height ?? 0);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

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

  /* block page scroll while the mega dropdown is open/hovered, so it stays put */
  useEffect(() => {
    if (!activeMega) return;
    const preventScroll = (event: WheelEvent | TouchEvent) => event.preventDefault();
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, [activeMega]);

  const navItems = useMemo<NavItem[]>(() => {
    const buildChildren = (to: string, label: string, vibe?: Vibe) => [
      { to, label },
      { to, label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
      { to, label: "Oferta", search: { sale: "1" }, hash: "shop" },
      ...getAvailableMenuCategories(catalogProducts, vibe, vibe ? true : false).map((category) => ({
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
    const moonPool = publicProducts.filter((p) => p.vibe === "moon");
    const sunPool = publicProducts.filter((p) => p.vibe === "sunshine");
    const menPool = publicProducts.filter((p) => p.vibe === "men");
    const newPool = publicProducts.filter((p) => p.newArrival);
    const salePool = publicProducts.filter((p) => !!p.salePrice);

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
        getAvailableMenuCategories(publicProducts, undefined, false)),
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
      className="sticky top-0 z-40 bg-background/95 backdrop-blur transition-colors duration-300"
      onMouseLeave={handleMouseLeaveHeader}
    >
      {/* ── Top bar ── */}
      <div className="relative z-20 mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2 -mr-[2.2rem]">
          <StorePineapple
            theme={activeThemeKey}
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
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-1">
          <Link to="/tienda" className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => cart.setOpen(true)}
            className="relative rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Menú"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Desktop mega menu ── */}
      <AnnouncementBar announcements={announcements} theme={announcementTheme} />
      <MegaPortal top={headerHeight}>
        <div
          className={`left-0 right-0 hidden overflow-hidden shadow-xl transition-[max-height,opacity,transform] duration-250 md:block ${
            megaOpen
              ? "pointer-events-auto max-h-[34rem] translate-y-0 opacity-100"
              : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
          }`}
          style={{
            position: "fixed",
            background: currentMega
              ? (VIBE_PANEL[currentMega.key]?.panelBg ?? "var(--color-background)")
              : "var(--color-background)",
            /* thin white bottom border always visible on vibe panels */
            borderBottom: currentMega && VIBE_PANEL[currentMega.key]
              ? "1px solid rgba(255,255,255,0.18)"
              : "1px solid var(--color-border)",
            transition: "max-height 0.25s ease, opacity 0.25s ease, transform 0.25s ease",
            zIndex: 99999,
          }}
          onMouseEnter={handleMouseEnterPanel}
        >
          {currentMega && (() => {
          const vs = VIBE_PANEL[currentMega.key];
          const textCls  = vs?.text  ?? "text-foreground";
          const mutedCls = vs?.muted ?? "text-muted-foreground";
          const linkCls  = vs?.linkCls ?? "border-foreground/10 bg-card text-foreground hover:bg-muted";
          const tabActiveCls = vs?.tabActiveCls ?? "bg-foreground text-background";
          const tabIdleCls   = vs?.tabIdleCls   ?? "bg-muted text-muted-foreground hover:bg-foreground/8 hover:text-foreground";
          const borderDiv    = vs ? "border-white/12" : "border-foreground/8";

          return (
            <div className="mx-auto max-w-7xl px-4 py-5">
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
                    <img
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
                              isVibe={!!vs}
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
      </MegaPortal>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="border-t border-foreground/10 bg-background px-4 py-3 md:hidden">
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
                        active ? "bg-foreground text-background" : "hover:bg-muted"
                      }`}
                    >
                      {n.label}
                    </Link>
                    {n.children && (
                      <button
                        onClick={() => setMobileExpanded(expanded ? null : n.to)}
                        className="ui-nav-rounded ml-1 p-2 hover:bg-muted"
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
                          className="ui-nav-rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
