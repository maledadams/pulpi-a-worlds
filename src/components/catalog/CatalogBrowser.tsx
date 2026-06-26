import { Link } from "@tanstack/react-router";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategoryLabel, type Product, type Vibe } from "@/data/products";
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
  isNsfwCategory,
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
  theme?: "default" | "moon";
  children: ReactNode;
}) {
  const isMoon = theme === "moon";

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-9 items-center gap-1.5 rounded-full border px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
          open || activeCount > 0
            ? isMoon
              ? "border-[#8f2015] bg-[#8f2015] text-[#fff7f2]"
              : "border-foreground bg-foreground text-background"
            : isMoon
              ? "border-[#f2e9e1]/10 bg-[#111111] text-[#f2e9e1] hover:border-[#f2e9e1]/22"
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
  enableNsfwGate?: boolean;
  resetFiltersOnQuery?: boolean;
  searchPlaceholderClassName?: string;
};

export function CatalogBrowser({
  products,
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
  enableNsfwGate = false,
  resetFiltersOnQuery = false,
  searchPlaceholderClassName,
}: CatalogBrowserProps) {
  const [drawer, setDrawer] = useState(false);
  const [openHorizontalFilter, setOpenHorizontalFilter] = useState<string | null>(null);
  const filters = useMemo(() => parseCatalogSearch(search), [search]);
  const isMoonVibe = (themeVibe ?? vibeScope) === "moon";
  const visibleProducts = useMemo(
    () =>
      enableNsfwGate && !filters.nsfwEnabled
        ? products.filter(
            (p) =>
              !p.categories?.some((c) => isNsfwCategory(c)) && !isNsfwCategory(p.category),
          )
        : products,
    [enableNsfwGate, filters.nsfwEnabled, products],
  );

  const departmentOptions = useMemo(() => getDepartmentOptions(visibleProducts), [visibleProducts]);
  const categoryOptions = useMemo(
    () =>
      getCategoryOptions(visibleProducts).filter(
        (c) => filters.nsfwEnabled || !isNsfwCategory(c.id),
      ),
    [filters.nsfwEnabled, visibleProducts],
  );
  const sizeOptions = useMemo(() => getApparelSizeOptions(visibleProducts), [visibleProducts]);
  const shoeSizeOptions = useMemo(() => getShoeSizeOptions(visibleProducts), [visibleProducts]);
  const colorOptions = useMemo(() => getColorOptions(visibleProducts), [visibleProducts]);
  const filtered = useMemo(() => filterCatalogProducts(products, filters), [filters, products]);

  const activeFilterCount =
    filters.departments.size +
    filters.categories.size +
    Number(enableNsfwGate && filters.nsfwEnabled) +
    filters.apparelSizes.size +
    filters.shoeSizes.size +
    filters.colors.size +
    filters.priceBuckets.size +
    Number(filters.onlyAvail) +
    Number(filters.onlySale) +
    Number(filters.onlyNew);

  const setFilters = (next: CatalogFilters) => onSearchChange(buildCatalogSearch(next));

  const clearFilters = () =>
    setFilters({
      q: "",
      departments: new Set(vibeScope ? [vibeScope] : []),
      categories: new Set(),
      nsfwEnabled: false,
      apparelSizes: new Set(),
      shoeSizes: new Set(),
      colors: new Set(),
      priceBuckets: new Set(),
      onlyAvail: false,
      onlySale: false,
      onlyNew: false,
      sort: "featured",
    });

  const setQuery = (value: string) => {
    if (resetFiltersOnQuery && value.trim()) {
      setFilters({
        q: value,
        departments: new Set(vibeScope ? [vibeScope] : []),
        categories: new Set(),
        nsfwEnabled: false,
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
      {enableNsfwGate && (
        <FilterGroup title="NSFW">
          <CheckboxRow
            checked={filters.nsfwEnabled}
            label="Mostrar categorías NSFW"
            onChange={() =>
              setFilters({
                ...filters,
                nsfwEnabled: !filters.nsfwEnabled,
                categories: filters.nsfwEnabled
                  ? new Set(Array.from(filters.categories).filter((c) => !isNsfwCategory(c)))
                  : filters.categories,
              })
            }
          />
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
                    : "border-foreground bg-foreground text-background"
                  : isMoonVibe
                    ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                    : "border-foreground/20 bg-background text-foreground hover:border-foreground/50"
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
                      : "border-foreground bg-foreground text-background"
                    : isMoonVibe
                      ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                      : "border-foreground/20 bg-background text-foreground hover:border-foreground/50"
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
                      : "border-foreground bg-foreground text-background"
                    : isMoonVibe
                      ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} ${moonBorderHoverClass}`
                      : "border-foreground/20 bg-background text-foreground hover:border-foreground/50"
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
              count={visibleProducts.filter((p) => {
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
    <div className="mb-5 flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search
          className={`absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
            isMoonVibe ? "text-[#f2e9e1]/66" : "text-muted-foreground"
          }`}
        />
        <input
          value={filters.q}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className={`w-full rounded-full border py-2.5 pl-9 pr-4 text-sm outline-none ${
            isMoonVibe
              ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} placeholder:text-[#f2e9e1]/66 focus:border-[#f2e9e1]/22`
              : "border-foreground/20 bg-card focus:border-foreground"
          } ${searchPlaceholderClassName ?? ""}`}
        />
      </div>
      <select
        value={filters.sort}
        onChange={(e) =>
          setFilters({ ...filters, sort: e.target.value as CatalogFilters["sort"] })
        }
        className={`rounded-full border px-4 py-2.5 text-sm font-semibold outline-none ${
          isMoonVibe
            ? `${moonBorderClass} ${moonSurfaceClass} ${moonTextClass} focus:border-[#f2e9e1]/22`
            : "border-foreground/20 bg-card focus:border-foreground"
        }`}
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
    <div className="mb-5">
      <div className="flex flex-wrap gap-2">
        {showDepartmentFilter && departmentOptions.length > 0 && (
          <HorizontalFilter
            title={departmentTitle}
            open={openHorizontalFilter === "dept"}
            onToggle={() => toggle("dept")}
            activeCount={filters.departments.size}
            theme={isMoonVibe ? "moon" : "default"}
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
        {enableNsfwGate && (
          <HorizontalFilter
            title="NSFW"
            open={openHorizontalFilter === "nsfw"}
            onToggle={() => toggle("nsfw")}
            activeCount={Number(filters.nsfwEnabled)}
            theme={isMoonVibe ? "moon" : "default"}
          >
            <CheckboxRow
              checked={filters.nsfwEnabled}
              label="Mostrar NSFW"
              onChange={() =>
                setFilters({
                  ...filters,
                  nsfwEnabled: !filters.nsfwEnabled,
                  categories: filters.nsfwEnabled
                    ? new Set(Array.from(filters.categories).filter((c) => !isNsfwCategory(c)))
                    : filters.categories,
                })
              }
            />
          </HorizontalFilter>
        )}
        <HorizontalFilter
          title="Categoría"
          open={openHorizontalFilter === "cat"}
          onToggle={() => toggle("cat")}
          activeCount={filters.categories.size}
          theme={isMoonVibe ? "moon" : "default"}
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
          theme={isMoonVibe ? "moon" : "default"}
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
            theme={isMoonVibe ? "moon" : "default"}
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
          theme={isMoonVibe ? "moon" : "default"}
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
          theme={isMoonVibe ? "moon" : "default"}
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
          theme={isMoonVibe ? "moon" : "default"}
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
      <p className="mb-3 text-xs text-muted-foreground">{filtered.length} productos</p>
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-2xl">{emptyTitle}</p>
          <button
            onClick={clearFilters}
            className="mt-3 text-sm font-semibold underline underline-offset-4"
          >
            {emptyCtaLabel}
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 ${cols}`}>
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              soldOutMode={soldOutMode}
              showSubtitle={false}
              tone={tone}
              themeVibe={themeVibe}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div>
      {searchBar}

      {mode === "horizontal" ? (
        <div>
          {horizontalFilters}
          {productGrid("grid-cols-2 sm:grid-cols-3 lg:grid-cols-4")}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          {/* Sidebar — scrollbar contained inside box */}
          <aside className="hidden md:block">
            <div className="sticky top-[calc(3.5rem+1rem)] min-h-[42rem] max-h-[calc(100vh-5rem)] overflow-hidden rounded-xl border border-foreground/15 bg-card">
              <div className="h-full overflow-y-auto p-4">
                {filtersPanel}
              </div>
            </div>
          </aside>
          <div>{productGrid("grid-cols-2 lg:grid-cols-3")}</div>
        </div>
      )}

      {/* Mobile filter drawer */}
      {mode === "sidebar" && drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-2xl bg-background p-5 shadow-2xl">
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
              Ver {filtered.length} productos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
