import { TiendaBanner } from "@/components/theme/HomeBanner";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { useCatalogProducts } from "@/context/catalog";
import { familyIdOf, isFamilyVisible, mothersById } from "@/lib/product-families";
import { getCategoryLabel, type Product, type SubstoreVibe, type Vibe } from "@/data/products";
import { trackSearch } from "@/lib/analytics";
import {
  CATALOG_SORTS,
  PRICE_BUCKETS,
  buildCatalogSearch,
  filterCatalogProducts,
  getApparelSizeOptions,
  getCategoryOptions,
  getColorOptions,
  getDepartmentOptions,
  getShoeSizeOptions,
  orderForSubstore,
  parseCatalogSearch,
  sizeLabel,
  toggleSet,
  type CatalogFilters,
  type CatalogSearch,
} from "@/lib/store-filters";

/* ── Sidebar checkbox row ── */
function CheckboxRow({
  checked,
  label,
  count,
  onChange,
}: {
  checked: boolean;
  label: string;
  count?: number;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-3.5 w-3.5 rounded border-foreground/30 accent-foreground"
        />
        <span className="font-medium">{label}</span>
      </span>
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </label>
  );
}

/* ── Sidebar collapsible group ── */
function FilterGroup({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-foreground/10 pb-4 last:border-b-0 last:pb-0"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <span>{title}</span>
        <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/* ── Horizontal filter pill with dropdown ── */
function HorizontalFilter({
  title,
  open,
  onToggle,
  activeCount = 0,
  theme = "default",
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  theme?: "default" | "moon" | "sunshine";
  children: ReactNode;
}) {
  const isMoon = theme === "moon";
  const isSunshine = theme === "sunshine";

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-bold tracking-wide transition-colors ${
          open || activeCount > 0
            ? isMoon
              ? "border-[#8f2015] bg-[#8f2015] text-[#fff7f2]"
              : "border-foreground bg-foreground text-background"
            : isMoon
              ? "border-[#f2e9e1]/10 bg-[#111111] text-[#f2e9e1] hover:border-[#f2e9e1]/22"
              : isSunshine
                ? "border-[#d2a0ca] bg-white text-[#3a0a14] hover:border-[#bb82b2]"
                : "border-foreground/25 bg-card text-foreground hover:border-foreground/60"
        }`}
      >
        <span>{title}</span>
        {activeCount > 0 && (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black ${
              open || activeCount > 0
                ? isMoon
                  ? "bg-[#111111] text-[#f2e9e1]"
                  : "bg-background text-foreground"
                : "bg-foreground text-background"
            }`}
          >
            {activeCount}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute left-0 top-[calc(100%+6px)] z-30 min-w-[220px] rounded-xl border p-4 shadow-xl ${
            isMoon
              ? "border-[#f2e9e1]/10 bg-[#111111] text-[#f2e9e1] [&_input]:accent-[#8f2015] [&_input]:border-[#f2e9e1]/18"
              : isSunshine
                ? "border-[#d2a0ca] bg-white text-[#3a0a14] [&_input]:accent-[#d2a0ca]"
                : "border-foreground/20 bg-background"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

type CatalogBrowserProps = {
  products: Product[];
  search: CatalogSearch;
  onSearchChange: (next: CatalogSearch) => void;
  mode?: "sidebar" | "horizontal";
  tone?: "store" | "vibe";
  soldOutMode?: "standard" | "vibe";
  showDepartmentFilter?: boolean;
  departmentTitle?: string;
  emptyTitle?: string;
  emptyCtaLabel?: string;
  vibeScope?: Vibe;
  themeVibe?: Vibe;
  resetFiltersOnQuery?: boolean;
  searchPlaceholderClassName?: string;
  wideResults?: boolean;
  wideResultsTitle?: string;
  wideProductResultsOnly?: boolean;
  // Sub-store pages only: the full public catalog. When present together with
  // vibeScope, a category filter or search shows this store's matches first and
  // then every other store's in-stock matches (orderForSubstore).
  crossStoreCatalog?: Product[];
};

export function CatalogBrowser({
  products: productsProp,
  search,
  onSearchChange,
  mode = "sidebar",
  tone = "store",
  soldOutMode = "standard",
  showDepartmentFilter = false,
  departmentTitle = "Tienda",
  emptyTitle = "Nada por aquí",
  emptyCtaLabel = "Limpiar filtros",
  vibeScope,
  themeVibe,
  resetFiltersOnQuery = false,
  searchPlaceholderClassName,
  wideResults = false,
  wideResultsTitle,
  wideProductResultsOnly = false,
  crossStoreCatalog,
}: CatalogBrowserProps) {
  // A hidden mother hides her whole family; checked against the full catalog,
  // since a list (a collection, a sub-store) may hold a sub without its mother.
  const catalog = useCatalogProducts();
  const familyMothers = useMemo(() => mothersById(catalog), [catalog]);
  const products = useMemo(
    () => productsProp.filter((product) => isFamilyVisible(product, familyMothers)),
    [productsProp, familyMothers],
  );
  const [drawer, setDrawer] = useState(false);
  const [openHorizontalFilter, setOpenHorizontalFilter] = useState<string | null>(null);
  const filters = useMemo(() => parseCatalogSearch(search), [search]);
  // The URL only stores the trimmed query, so the input keeps its own text
  // (trailing spaces included) and pushes to the URL after a short pause.
  const [queryInput, setQueryInput] = useState(filters.q);
  const queryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    setQueryInput((current) => (current.trim() === filters.q.trim() ? current : filters.q));
  }, [filters.q]);
  useEffect(() => () => clearTimeout(queryTimerRef.current), []);
  const isMoonVibe = (themeVibe ?? vibeScope) === "moon";
  const isSunshineVibe = (themeVibe ?? vibeScope) === "sunshine";
  const scopedVibe = vibeScope ?? themeVibe;
  const emptyTitleFontFamily =
    scopedVibe === "moon"
      ? "var(--font-gothic)"
      : scopedVibe === "sunshine"
        ? "var(--font-sunshine)"
        : scopedVibe === "men"
          ? '"IM FELL Great Primer SC", serif'
          : "var(--font-display)";
  // Facet option counts must reflect every OTHER active filter (department, category,
  // size, color, price, status) so a selected category actually narrows what the other
  // facets show/count - otherwise a badge like "Talla unica (41)" stays global-catalog-wide
  // no matter which category is selected, making it look like that size ignores category.
  const departmentOptions = useMemo(
    () => getDepartmentOptions(filterCatalogProducts(products, { ...filters, departments: new Set() })),
    [filters, products],
  );
  const crossStoreVibe: SubstoreVibe | null =
    crossStoreCatalog && vibeScope && vibeScope !== "pulpina" ? vibeScope : null;
  const categoryOptions = useMemo(() => {
    const options = getCategoryOptions(
      filterCatalogProducts(products, { ...filters, categories: new Set() }),
    );
    if (!crossStoreVibe || !crossStoreCatalog) return options;
    return options.map((option) => ({
      ...option,
      count: new Set(
        orderForSubstore(crossStoreCatalog, { ...filters, categories: new Set([option.id]) }, crossStoreVibe).map(familyIdOf),
      ).size,
    }));
  }, [filters, products, crossStoreCatalog, crossStoreVibe]);
  const sizeOptions = useMemo(
    () => getApparelSizeOptions(filterCatalogProducts(products, { ...filters, apparelSizes: new Set() })),
    [filters, products],
  );
  const shoeSizeOptions = useMemo(
    () => getShoeSizeOptions(filterCatalogProducts(products, { ...filters, shoeSizes: new Set() })),
    [filters, products],
  );
  const colorOptions = useMemo(
    () => getColorOptions(filterCatalogProducts(products, { ...filters, colors: new Set() })),
    [filters, products],
  );
  const priceFacetProducts = useMemo(
    () => filterCatalogProducts(products, { ...filters, priceBuckets: new Set() }),
    [filters, products],
  );
  const filtered = useMemo(
    () =>
      crossStoreVibe && crossStoreCatalog
        ? orderForSubstore(crossStoreCatalog, filters, crossStoreVibe, { collapseWith: catalog })
        : filterCatalogProducts(products, filters, { collapseWith: catalog }),
    [catalog, crossStoreCatalog, crossStoreVibe, filters, products],
  );

  const activeFilterCount =
    filters.departments.size +
    filters.categories.size +
    filters.apparelSizes.size +
    filters.shoeSizes.size +
    filters.colors.size +
    filters.priceBuckets.size +
    Number(filters.onlyAvail) +
    Number(filters.onlySale) +
    Number(filters.onlyNew);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const setFilters = (next: CatalogFilters) => onSearchChange(buildCatalogSearch(next));

  const clearFilters = () => {
    clearTimeout(queryTimerRef.current);
    setQueryInput("");
    setFilters({
      q: "",
      departments: new Set(vibeScope ? [vibeScope] : []),
      categories: new Set(),
      apparelSizes: new Set(),
      shoeSizes: new Set(),
      colors: new Set(),
      priceBuckets: new Set(),
      onlyAvail: false,
      onlySale: false,
      onlyNew: false,
      sort: "featured",
    });
  };

  const setQuery = (value: string) => {
    const filters = filtersRef.current;
    if (resetFiltersOnQuery && value.trim()) {
      setFilters({
        q: value,
        departments: new Set(vibeScope ? [vibeScope] : []),
        categories: new Set(),
          apparelSizes: new Set(),
        shoeSizes: new Set(),
        colors: new Set(),
        priceBuckets: new Set(),
        onlyAvail: false,
        onlySale: false,
        onlyNew: false,
        sort: filters.sort,
      });
      return;
    }
    setFilters({ ...filters, q: value });
  };

  const toggle = (key: string) =>
    setOpenHorizontalFilter((c) => (c === key ? null : key));

  const moonSurfaceClass = "bg-[#111111]";
  const moonBorderClass = "border-[#f2e9e1]/10";
  const moonBorderHoverClass = "hover:border-[#f2e9e1]/22";
  const moonTextClass = "text-[#f2e9e1]";
  const moonMutedTextClass = "text-[#f2e9e1]/66";
  const moonActiveClass = "border-[#8f2015] bg-[#8f2015] text-[#fff7f2]";
  // Tienda (base theme): selectable filter chips look like the header
  // dropdown's tabs - light gray, and black with white text when chosen.
  const isTiendaLook = wideResults && !isMoonVibe;
  const chipOnClass = "border-foreground bg-foreground text-background";
  const chipOffClass = isTiendaLook
    ? "border-transparent bg-muted text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
    : "border-foreground/20 bg-background text-foreground hover:border-foreground/50";
  const searchControlFrameClass = isMoonVibe
    ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} focus:border-[#f2e9e1]/22`
    : isSunshineVibe
      ? "border-[#d2a0ca] bg-white text-[#3a0a14] focus:border-[#bb82b2]"
      : isTiendaLook
        ? "!border-2 border-[color:var(--t-outline,var(--foreground))] bg-card"
        : "border-foreground/20 bg-card focus:border-foreground";
  // Moon page: the toolbar's outlines take the Moon footer's hue (styles.css,
  // .moon-tint).
  const moonTintClass = vibeScope === "moon" ? "moon-tint" : "";
  // Sort select on each sub-store's page: the square buttons of that store's
  // header preview, with no background (owner, 2026-11-18). Moon's outline is
  // in the footer's hue. Options get a solid color so the open list stays
  // readable.
  const sortControlFrameClass =
    vibeScope === "moon"
      ? "border-[oklch(1_0.02_15/0.1)] bg-transparent text-[#f5ece8] [&_option]:bg-[#1a0a10]"
      : vibeScope === "sunshine"
        ? "border-[#b86f8b] bg-transparent text-[#3a0a14] [&_option]:bg-white"
        : vibeScope === "men"
          ? "border-white/10 bg-transparent text-white [&_option]:bg-[#111111]"
          : searchControlFrameClass;
  const horizontalFilterTheme: "default" | "moon" | "sunshine" = isMoonVibe
    ? "moon"
    : isSunshineVibe
      ? "sunshine"
      : "default";

  /* ── Sidebar filter panel ── */
  const filtersPanel = (
    <div className="space-y-5">
      {showDepartmentFilter && departmentOptions.length > 0 && (
        <FilterGroup title={departmentTitle}>
          <div className="space-y-2">
            {departmentOptions.map((o) => (
              <CheckboxRow
                key={o.value}
                checked={filters.departments.has(o.value)}
                label={o.label}
                count={o.count}
                onChange={() =>
                  setFilters({ ...filters, departments: toggleSet(filters.departments, o.value) })
                }
              />
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Categoría">
        <div className="flex flex-wrap gap-1.5">
          {categoryOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() =>
                setFilters({ ...filters, categories: toggleSet(filters.categories, c.id) })
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                filters.categories.has(c.id)
                  ? isMoonVibe
                    ? moonActiveClass
                    : chipOnClass
                  : isMoonVibe
                    ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                    : chipOffClass
              }`}
            >
              {c.label}
              <span className="ml-1 opacity-50">{c.count}</span>
            </button>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Tallas">
        <div className="grid grid-cols-4 gap-1.5">
          {sizeOptions.map((o) => {
            const short =
              o.value.trim().toUpperCase() === "ONE SIZE" ? "OS" : o.value.trim().toUpperCase();
            return (
              <button
                key={o.value}
                onClick={() =>
                  setFilters({ ...filters, apparelSizes: toggleSet(filters.apparelSizes, o.value) })
                }
                className={`flex aspect-square min-h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                  filters.apparelSizes.has(o.value)
                    ? isMoonVibe
                      ? moonActiveClass
                      : chipOnClass
                    : isMoonVibe
                      ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                      : chipOffClass
                }`}
                title={`${sizeLabel(o.value)} (${o.count})`}
              >
                {short}
              </button>
            );
          })}
        </div>
      </FilterGroup>
      {shoeSizeOptions.length > 0 && (
        <FilterGroup title="Zapatos">
          <div className="grid grid-cols-4 gap-1.5">
            {shoeSizeOptions.map((o) => (
              <button
                key={o.value}
                onClick={() =>
                  setFilters({ ...filters, shoeSizes: toggleSet(filters.shoeSizes, o.value) })
                }
                className={`flex aspect-square min-h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                  filters.shoeSizes.has(o.value)
                    ? isMoonVibe
                      ? moonActiveClass
                      : chipOnClass
                    : isMoonVibe
                      ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                      : chipOffClass
                }`}
              >
                {o.value}
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
      <FilterGroup title="Color">
        <div className="space-y-2">
          {colorOptions.map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center justify-between text-sm">
              <span className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={filters.colors.has(o.id)}
                  onChange={() =>
                    setFilters({ ...filters, colors: toggleSet(filters.colors, o.id) })
                  }
                  className="h-3.5 w-3.5 rounded border-foreground/30 accent-foreground"
                />
                <span
                  className="h-3.5 w-3.5 rounded-[3px] border border-foreground/20"
                  style={{ backgroundColor: o.swatch }}
                />
                <span className="font-medium">{o.label}</span>
              </span>
              <span className="text-xs text-muted-foreground">{o.count}</span>
            </label>
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Precio">
        <div className="space-y-2">
          {PRICE_BUCKETS.map((b) => (
            <CheckboxRow
              key={b.id}
              checked={filters.priceBuckets.has(b.id)}
              label={b.label}
              count={priceFacetProducts.filter((p) => {
                const price = p.salePrice ?? p.price;
                return price >= b.min && price <= b.max;
              }).length}
              onChange={() =>
                setFilters({ ...filters, priceBuckets: toggleSet(filters.priceBuckets, b.id) })
              }
            />
          ))}
        </div>
      </FilterGroup>
      <FilterGroup title="Estado">
        <div className="space-y-2">
          <CheckboxRow
            checked={filters.onlyAvail}
            label="Solo disponibles"
            onChange={() => setFilters({ ...filters, onlyAvail: !filters.onlyAvail })}
          />
          <CheckboxRow
            checked={filters.onlyNew}
            label="Nuevos"
            onChange={() => setFilters({ ...filters, onlyNew: !filters.onlyNew })}
          />
          <CheckboxRow
            checked={filters.onlySale}
            label="Oferta"
            onChange={() => setFilters({ ...filters, onlySale: !filters.onlySale })}
          />
        </div>
      </FilterGroup>
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className={`w-full rounded-full border py-2 text-xs font-bold uppercase tracking-wider ${
            isMoonVibe
              ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} hover:bg-white/5`
              : "border-foreground/20 hover:bg-muted"
          }`}
        >
          {emptyCtaLabel}
        </button>
      )}
    </div>
  );

  /* ── Search + sort bar ── */
  const searchBar = (
    <div
      className={`mb-5 flex flex-col gap-2 sm:flex-row ${moonTintClass} ${
        wideProductResultsOnly
          ? "md:w-[calc(100%+5rem)] md:max-w-[calc(100vw-2rem)]"
          : ""
      }`}
    >
      <div className="relative flex-1">
        <Search
          className={`absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            isMoonVibe ? "text-[#f2e9e1]/66" : "text-muted-foreground"
          }`}
        />
        <input
          type="search"
          value={queryInput}
          onChange={(e) => {
            const value = e.target.value;
            setQueryInput(value);
            clearTimeout(queryTimerRef.current);
            queryTimerRef.current = setTimeout(() => setQuery(value), 250);
          }}
          onBlur={(e) => trackSearch(e.target.value)}
          placeholder="Buscar..."
          className={`w-full border py-2.5 pl-9 pr-4 text-sm outline-none ${searchControlFrameClass} ${
            isMoonVibe ? "placeholder:text-[#f2e9e1]/66" : ""
          } ${searchPlaceholderClassName ?? ""}`}
        />
      </div>
      <select
        value={filters.sort}
        onChange={(e) =>
          setFilters({ ...filters, sort: e.target.value as CatalogFilters["sort"] })
        }
        className={`border px-4 py-2.5 text-sm font-semibold outline-none ${sortControlFrameClass}`}
      >
        {CATALOG_SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {mode === "sidebar" && (
        <button
          onClick={() => setDrawer(true)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold md:hidden ${
            isMoonVibe
              ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass}`
              : isTiendaLook
                ? "border-[color:var(--t-outline,var(--foreground))] bg-card"
                : "border-foreground/20 bg-card"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-black text-background">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );

  /* ── Horizontal filter pills ── */
  const horizontalFilters = (
    <div className={`mb-5 ${moonTintClass}`}>
      <div className="flex flex-wrap justify-center gap-2">
        {showDepartmentFilter && departmentOptions.length > 0 && (
          <HorizontalFilter
            title={departmentTitle}
            open={openHorizontalFilter === "dept"}
            onToggle={() => toggle("dept")}
            activeCount={filters.departments.size}
            theme={horizontalFilterTheme}
          >
            <div className="space-y-2">
              {departmentOptions.map((o) => (
                <CheckboxRow
                  key={o.value}
                  checked={filters.departments.has(o.value)}
                  label={o.label}
                  count={o.count}
                  onChange={() =>
                    setFilters({ ...filters, departments: toggleSet(filters.departments, o.value) })
                  }
                />
              ))}
            </div>
          </HorizontalFilter>
        )}
        <HorizontalFilter
          title="Categoría"
          open={openHorizontalFilter === "cat"}
          onToggle={() => toggle("cat")}
          activeCount={filters.categories.size}
          theme={horizontalFilterTheme}
        >
          <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
            {categoryOptions.map((c) => (
              <CheckboxRow
                key={c.id}
                checked={filters.categories.has(c.id)}
                label={c.label}
                count={c.count}
                onChange={() =>
                  setFilters({ ...filters, categories: toggleSet(filters.categories, c.id) })
                }
              />
            ))}
          </div>
        </HorizontalFilter>
        <HorizontalFilter
          title="Tallas"
          open={openHorizontalFilter === "size"}
          onToggle={() => toggle("size")}
          activeCount={filters.apparelSizes.size}
          theme={horizontalFilterTheme}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {sizeOptions.map((o) => {
              const short =
                o.value.trim().toUpperCase() === "ONE SIZE" ? "OS" : o.value.trim().toUpperCase();
              return (
                <button
                  key={o.value}
                  onClick={() =>
                    setFilters({ ...filters, apparelSizes: toggleSet(filters.apparelSizes, o.value) })
                  }
                  className={`flex aspect-square min-h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    filters.apparelSizes.has(o.value)
                      ? "border-foreground bg-foreground text-background"
                      : isSunshineVibe
                        ? "border-[#d2a0ca] bg-white text-[#3a0a14] hover:border-[#bb82b2]"
                        : "border-foreground/20 bg-background text-foreground hover:border-foreground/50"
                  }`}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </HorizontalFilter>
        {shoeSizeOptions.length > 0 && (
          <HorizontalFilter
            title="Zapatos"
            open={openHorizontalFilter === "shoe"}
            onToggle={() => toggle("shoe")}
            activeCount={filters.shoeSizes.size}
            theme={horizontalFilterTheme}
          >
            <div className="grid grid-cols-4 gap-1.5">
              {shoeSizeOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() =>
                    setFilters({ ...filters, shoeSizes: toggleSet(filters.shoeSizes, o.value) })
                  }
                  className={`flex aspect-square min-h-9 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    filters.shoeSizes.has(o.value)
                      ? "border-foreground bg-foreground text-background"
                      : isSunshineVibe
                        ? "border-[#d2a0ca] bg-white text-[#3a0a14] hover:border-[#bb82b2]"
                        : "border-foreground/20 bg-background text-foreground hover:border-foreground/50"
                  }`}
                >
                  {o.value}
                </button>
              ))}
            </div>
          </HorizontalFilter>
        )}
        <HorizontalFilter
          title="Color"
          open={openHorizontalFilter === "color"}
          onToggle={() => toggle("color")}
          activeCount={filters.colors.size}
          theme={horizontalFilterTheme}
        >
          <div className="space-y-2">
            {colorOptions.map((o) => (
              <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={filters.colors.has(o.id)}
                  onChange={() =>
                    setFilters({ ...filters, colors: toggleSet(filters.colors, o.id) })
                  }
                  className="h-3.5 w-3.5 rounded border-foreground/30 accent-foreground"
                />
                <span
                  className="h-3.5 w-3.5 rounded-[3px] border border-foreground/20"
                  style={{ backgroundColor: o.swatch }}
                />
                <span className="flex-1 font-medium">{o.label}</span>
                <span className="text-xs text-muted-foreground">{o.count}</span>
              </label>
            ))}
          </div>
        </HorizontalFilter>
        <HorizontalFilter
          title="Precio"
          open={openHorizontalFilter === "price"}
          onToggle={() => toggle("price")}
          activeCount={filters.priceBuckets.size}
          theme={horizontalFilterTheme}
        >
          <div className="space-y-2">
            {PRICE_BUCKETS.map((b) => (
              <CheckboxRow
                key={b.id}
                checked={filters.priceBuckets.has(b.id)}
                label={b.label}
                onChange={() =>
                  setFilters({ ...filters, priceBuckets: toggleSet(filters.priceBuckets, b.id) })
                }
              />
            ))}
          </div>
        </HorizontalFilter>
        <HorizontalFilter
          title="Estado"
          open={openHorizontalFilter === "status"}
          onToggle={() => toggle("status")}
          activeCount={
            Number(filters.onlyAvail) + Number(filters.onlyNew) + Number(filters.onlySale)
          }
          theme={horizontalFilterTheme}
        >
          <div className="space-y-2">
            <CheckboxRow
              checked={filters.onlyAvail}
              label="Solo disponibles"
              onChange={() => setFilters({ ...filters, onlyAvail: !filters.onlyAvail })}
            />
            <CheckboxRow
              checked={filters.onlyNew}
              label="Nuevos"
              onChange={() => setFilters({ ...filters, onlyNew: !filters.onlyNew })}
            />
            <CheckboxRow
              checked={filters.onlySale}
              label="Oferta"
              onChange={() => setFilters({ ...filters, onlySale: !filters.onlySale })}
            />
          </div>
        </HorizontalFilter>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex h-9 items-center gap-1 rounded-full border border-foreground/20 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>
    </div>
  );

  /* ── Product grid ── */
  const productGrid = (cols: string) => (
    <>
      <p
        className={`mb-3 text-xs text-muted-foreground ${wideProductResultsOnly ? "text-center" : ""}`}
      >
        {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
      </p>
      {filtered.length === 0 ? (
        <div className="flex min-h-64 w-full flex-col items-center justify-center text-center">
          <p className="text-3xl" style={{ fontFamily: emptyTitleFontFamily }}>{emptyTitle}</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm font-semibold underline underline-offset-4"
          >
            {emptyCtaLabel}
          </button>
        </div>
      ) : (
        <div className={`grid ${wideResults ? "gap-4" : "gap-3"} ${cols}`}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              soldOutMode={soldOutMode}
              showSubtitle={false}
              tone={tone}
              boldOutline={isTiendaLook}
              outlineVibe={vibeScope}
              themeVibe={themeVibe ?? vibeScope}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div>
      {wideResults ? (
        <div className="px-4 xl:px-[5cm]">
          {wideResultsTitle ? (
            <div className="mb-8 hidden w-[240px] items-center justify-start md:flex">
              <h1 className="inline-block text-left text-4xl md:text-6xl">
                {wideResultsTitle}
              </h1>
            </div>
          ) : null}
        </div>
      ) : wideProductResultsOnly ? (
        <div className="mx-auto w-full max-w-4xl px-4">{searchBar}</div>
      ) : (
        searchBar
      )}

      {mode === "horizontal" ? (
        <div>
          {wideProductResultsOnly ? (
            <>
              <div className="mx-auto w-full max-w-4xl px-4">{horizontalFilters}</div>
              <div className="px-4 xl:px-[5cm]">
                {/* Four big products per row on computers, edge to edge. */}
                {productGrid("grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}
              </div>
            </>
          ) : (
            <>
              {horizontalFilters}
              {productGrid("grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}
            </>
          )}
        </div>
      ) : (
        <div className={`grid gap-6 md:grid-cols-[240px_1fr] ${wideResults ? "px-4 xl:px-[5cm]" : ""}`}>
          {/* A theme's long Tienda banner, from the filters to Destacados (nothing without one). */}
          {wideResults ? <TiendaBanner className="md:col-span-2" /> : null}
          {/* Sidebar — scrollbar contained inside box */}
          {/* Sticky 1rem under whatever part of the header is still on screen
              (--site-header-visible, set by Header) and sized to the rest of
              the screen, so the whole box, top and bottom, stays in view while
              scrolling (owner, 2026-11-18). */}
          <aside className="sticky top-[calc(var(--site-header-visible,5.75rem)+1rem)] hidden self-start md:block">
            <div className={`h-[calc(100vh/var(--page-zoom)-var(--site-header-visible,5.75rem)-2rem)] overflow-hidden rounded-xl bg-card ${isTiendaLook ? "border-2 border-[color:var(--t-outline,var(--foreground))]" : "border border-foreground/15"}`}>
              <div className="h-full overflow-y-scroll overscroll-contain p-4 [scrollbar-gutter:stable]">
                {filtersPanel}
              </div>
            </div>
          </aside>
          <div>
            {wideResults ? searchBar : null}
            {/* Tienda: four big products per row, spanning from Buscar to Destacados. */}
            {productGrid(wideResults ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}
          </div>
        </div>
      )}

      {/* Mobile filter drawer */}
      {mode === "sidebar" && drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[calc(85vh/var(--page-zoom))] overflow-auto rounded-t-2xl bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-xl">Filtros</span>
              <button
                onClick={() => setDrawer(false)}
                className="rounded-full p-1.5 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {filtersPanel}
            <button
              onClick={() => setDrawer(false)}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-sm font-bold uppercase tracking-widest text-background"
            >
              Ver {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
            </button>
          </div>
        </div>
      )}
      <BackToTop />
    </div>
  );
}

// Bottom-right arrow back to the top of the page (owner, 2026-11-19), styled
// like the home rails' arrows. It shows once the page has scrolled a bit.
function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const update = () => setShown(window.scrollY > 400);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      tabIndex={shown ? 0 : -1}
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
      className={`ui-circle fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md transition hover:bg-foreground hover:text-background sm:bottom-6 sm:right-6 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
