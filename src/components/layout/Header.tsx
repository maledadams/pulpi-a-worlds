import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/cart";
import { PRODUCTS, getCategoryLabel, type Product } from "@/data/products";
import {
  getAvailableMenuCategories,
  getDepartmentCategoryLinkSearch,
  getCategoryLinkSearch,
  getProductCategories,
  type CatalogSearch,
} from "@/lib/store-filters";
import logo from "@/assets/logo-pulpina.png";

type MegaKey = "tienda" | "moon" | "sunshine" | "men" | "nuevo" | "oferta";

type NavChild = {
  to: string;
  label: string;
  search?: CatalogSearch;
  hash?: string;
};

type NavItem = {
  to: string;
  label: string;
  mega?: MegaKey;
  children?: NavChild[];
};

type MegaSection = {
  key: MegaKey;
  label: string;
  to: string;
  search?: CatalogSearch;
  hash?: string;
  overview: string;
  quickLinks: NavChild[];
  categories: Array<
    NavChild & {
      product: Product | null;
    }
  >;
};

function initials(value: string) {
  return value
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getCategoryPreviewProduct(pool: Product[], categoryId: string) {
  return (
    pool.find((product) => product.featured && getProductCategories(product).includes(categoryId)) ??
    pool.find((product) => product.newArrival && getProductCategories(product).includes(categoryId)) ??
    pool.find((product) => getProductCategories(product).includes(categoryId)) ??
    null
  );
}

const STORE_CHILDREN: NavChild[] = [
  { to: "/tienda", label: "Ver todo" },
  { to: "/tienda", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/tienda", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories(undefined, false).map((category) => ({
    to: "/tienda",
    label: category.label,
    search: getCategoryLinkSearch(category.id),
  })),
];

const MOON_CHILDREN: NavChild[] = [
  { to: "/moon", label: "Todo Moon" },
  { to: "/moon", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/moon", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("moon").map((category) => ({
    to: "/moon",
    label: category.label,
    search: getDepartmentCategoryLinkSearch("moon", category.id),
  })),
];

const SUNSHINE_CHILDREN: NavChild[] = [
  { to: "/sunshine", label: "Todo Sunshine" },
  { to: "/sunshine", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/sunshine", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("sunshine").map((category) => ({
    to: "/sunshine",
    label: category.label,
    search: getDepartmentCategoryLinkSearch("sunshine", category.id),
  })),
];

const MEN_CHILDREN: NavChild[] = [
  { to: "/men", label: "Todo Men" },
  { to: "/men", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
  { to: "/men", label: "Oferta", search: { sale: "1" }, hash: "shop" },
  ...getAvailableMenuCategories("men").map((category) => ({
    to: "/men",
    label: category.label,
    search: getDepartmentCategoryLinkSearch("men", category.id),
  })),
];

const NAV: NavItem[] = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda", mega: "tienda", children: STORE_CHILDREN },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
];

function CategoryPreview({
  item,
}: {
  item: MegaSection["categories"][number];
}) {
  const product = item.product;

  return (
      <Link to={item.to} search={item.search} hash={item.hash} className="group flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-foreground/10 shadow-sm transition duration-200 group-hover:-translate-y-1 sm:h-24 sm:w-24"
        style={
          product
            ? {
                background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
              }
            : { background: "#f3ece2" }
        }
      >
        {product?.featuredImage ? (
          <img
            src={product.featuredImage.url}
            alt={product.featuredImage.altText ?? item.label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-2xl uppercase text-foreground/70">
            {initials(product?.name ?? item.label)}
          </span>
        )}
      </div>
      <span className="line-clamp-2 text-xs font-semibold leading-tight sm:text-sm">{item.label}</span>
    </Link>
  );
}

export function Header() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [activeMega, setActiveMega] = useState<MegaKey | null>(null);
  const [renderedMega, setRenderedMega] = useState<MegaKey | null>(null);
  const loc = useLocation();

  const megaSections = useMemo<Record<MegaKey, MegaSection>>(() => {
    const moonProducts = PRODUCTS.filter((product) => product.vibe === "moon");
    const sunshineProducts = PRODUCTS.filter((product) => product.vibe === "sunshine");
    const menProducts = PRODUCTS.filter((product) => product.vibe === "men");
    const saleProducts = PRODUCTS.filter((product) => !!product.salePrice);
    const newProducts = PRODUCTS.filter((product) => product.newArrival);

    const buildSection = (
      key: MegaKey,
      label: string,
      to: string,
      overview: string,
      pool: Product[],
      quickLinks: NavChild[],
      categories: ReturnType<typeof getAvailableMenuCategories>,
      baseSearch?: CatalogSearch,
    ): MegaSection => ({
      key,
      label,
      to,
      search: baseSearch,
      hash: key === "nuevo" || key === "oferta" ? "shop" : undefined,
      overview,
      quickLinks,
      categories: categories.map((category) => ({
        to,
        label: category.label,
        search:
          key === "tienda"
            ? getCategoryLinkSearch(category.id)
            : key === "moon" || key === "sunshine" || key === "men"
              ? getDepartmentCategoryLinkSearch(key, category.id)
              : baseSearch
                ? { ...baseSearch, category: category.id }
                : undefined,
        product: getCategoryPreviewProduct(pool, category.id),
      })),
    });

    return {
      tienda: buildSection(
        "tienda",
        "General",
        "/tienda",
        "Toda la tienda en un solo lugar.",
        PRODUCTS,
        [
          { to: "/tienda", label: "Ver todo" },
          { to: "/tienda", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/tienda", label: "Oferta", search: { sale: "1" }, hash: "shop" },
        ],
        getAvailableMenuCategories(undefined, false),
      ),
      moon: buildSection(
        "moon",
        "Moon",
        "/moon",
        "Oscuro, dramatico, gotico y alternativo.",
        moonProducts,
        [
          { to: "/moon", label: "Todo Moon" },
          { to: "/moon", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/moon", label: "Oferta", search: { sale: "1" }, hash: "shop" },
        ],
        getAvailableMenuCategories("moon"),
      ),
      sunshine: buildSection(
        "sunshine",
        "Sunshine",
        "/sunshine",
        "Glossy, bright, playful y hyper-feminino.",
        sunshineProducts,
        [
          { to: "/sunshine", label: "Todo Sunshine" },
          { to: "/sunshine", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/sunshine", label: "Oferta", search: { sale: "1" }, hash: "shop" },
        ],
        getAvailableMenuCategories("sunshine"),
      ),
      men: buildSection(
        "men",
        "Men",
        "/men",
        "Punk, underground y alternativo.",
        menProducts,
        [
          { to: "/men", label: "Todo Men" },
          { to: "/men", label: "Nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/men", label: "Oferta", search: { sale: "1" }, hash: "shop" },
        ],
        getAvailableMenuCategories("men"),
      ),
      nuevo: buildSection(
        "nuevo",
        "Nuevo",
        "/tienda",
        "Lo ultimo que entro al catalogo.",
        newProducts,
        [
          { to: "/tienda", label: "Todo lo nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/moon", label: "Moon nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/sunshine", label: "Sunshine nuevo", search: { fresh: "1" }, hash: "shop" },
          { to: "/men", label: "Men nuevo", search: { fresh: "1" }, hash: "shop" },
        ],
        Array.from(new Set(newProducts.flatMap((product) => getProductCategories(product)))).map((id) => ({
          id,
          label: getCategoryLabel(id),
        })),
        { fresh: "1" },
      ),
      oferta: buildSection(
        "oferta",
        "Oferta",
        "/tienda",
        "Piezas rebajadas en toda la tienda.",
        saleProducts,
        [
          { to: "/tienda", label: "Ver ofertas", search: { sale: "1" }, hash: "shop" },
          { to: "/moon", label: "Moon en oferta", search: { sale: "1" }, hash: "shop" },
          { to: "/sunshine", label: "Sunshine en oferta", search: { sale: "1" }, hash: "shop" },
          { to: "/men", label: "Men en oferta", search: { sale: "1" }, hash: "shop" },
        ],
        Array.from(new Set(saleProducts.flatMap((product) => getProductCategories(product)))).map((id) => ({
          id,
          label: getCategoryLabel(id),
        })),
        { sale: "1" },
      ),
    };
  }, []);

  useEffect(() => {
    if (activeMega) {
      setRenderedMega(activeMega);
      return;
    }

    const timeout = window.setTimeout(() => setRenderedMega(null), 220);
    return () => window.clearTimeout(timeout);
  }, [activeMega]);

  const currentMega = renderedMega ? megaSections[renderedMega] : null;
  const megaOpen = !!activeMega;

  return (
    <header
      className="sticky top-0 z-40 border-b-2 border-foreground bg-background/95 backdrop-blur transition-[background-color,border-color,color] duration-300"
      onMouseLeave={() => setActiveMega(null)}
    >
      <div className="relative z-20 mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 wobble">
          <img src={logo} alt="Pulpina" className="h-10 w-10 object-contain" />
          <span className="truncate font-display text-xl tracking-wide">Pulpina RD</span>
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = loc.pathname === n.to;
            const megaActive = n.mega && activeMega === n.mega;
            return (
              <Link
                key={n.to}
                to={n.to}
                onMouseEnter={() => (n.mega ? setActiveMega(n.mega) : setActiveMega(null))}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-[background-color,color] duration-300 ${
                  active || megaActive ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Link to="/tienda" className="rounded-full p-2 hover:bg-muted" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => cart.setOpen(true)}
            className="relative rounded-full p-2 hover:bg-muted"
            aria-label="Carrito"
          >
            <ShoppingBag className="h-5 w-5" />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {cart.count}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full p-2 hover:bg-muted md:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+1px)] z-10 hidden overflow-hidden border-b-2 border-foreground bg-background shadow-[0_16px_40px_-24px_rgba(0,0,0,0.45)] transition-[max-height,opacity,transform,background-color,border-color,color] duration-300 md:block ${
          megaOpen ? "pointer-events-auto max-h-[34rem] translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-2 opacity-0"
        }`}
        onMouseEnter={() => renderedMega && setActiveMega(renderedMega)}
      >
        {currentMega && (
          <div className="mx-auto max-w-7xl px-4 py-5 transition-[background-color,color,border-color] duration-300">
            <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-foreground/10 pb-4">
              {(["tienda", "moon", "sunshine", "men", "nuevo", "oferta"] as MegaKey[]).map((key) => {
                const section = megaSections[key];
                return (
                  <Link
                    key={key}
                    to={section.to}
                    search={section.search}
                    hash={section.hash}
                    onMouseEnter={() => setActiveMega(key)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition-[background-color,color] duration-300 ${
                      currentMega.key === key ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-foreground/10"
                    }`}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </div>

            <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
              <div>
                <h3 className="font-display text-3xl">{currentMega.label}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{currentMega.overview}</p>
                <div className="mt-5 grid gap-2">
                  {currentMega.quickLinks.map((link) => (
                    <Link
                      key={`${currentMega.key}-${link.label}`}
                      to={link.to}
                      search={link.search}
                      hash={link.hash}
                      className="rounded-2xl border border-foreground/10 bg-card px-4 py-3 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-300 hover:-translate-y-0.5 hover:border-foreground/30"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
                    Categorias
                  </div>
                  <Link
                    to={currentMega.to}
                    search={currentMega.search}
                    hash={currentMega.hash}
                    className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground underline underline-offset-4"
                  >
                    Ver todo
                  </Link>
                </div>
                <div className="grid grid-cols-6 gap-4">
                  {currentMega.categories.slice(0, 12).map((item) => (
                    <CategoryPreview key={`${currentMega.key}-${item.label}`} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {open && (
        <div className="border-t-2 border-foreground bg-background md:hidden">
          <div className="grid gap-1 px-4 py-3">
            {NAV.map((n) => (
              <div key={n.to}>
                <Link
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold uppercase hover:bg-muted"
                >
                  {n.label}
                </Link>
                {n.children && (
                  <div className="grid gap-1 pl-3 pt-1">
                    {n.children.map((child) => (
                      <Link
                        key={`${n.to}-${child.label}-mobile`}
                        to={child.to}
                        search={child.search}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
