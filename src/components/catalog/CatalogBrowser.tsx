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
      <span className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 rounded border-foreground accent-foreground"
        />
        <span className="font-semibold">{label}</span>
      </span>
      {typeof count === "number" && <span className="text-xs text-muted-foreground">{count}</span>}
    </label>
  );
}

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
    <details open={defaultOpen} className="group border-b border-foreground/10 pb-5 last:border-b-0 last:pb-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

function HorizontalFilter({
  title,
  open,
  onToggle,
  activeCount = 0,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative w-full rounded-xl border-2 bg-card shadow-sm transition-[border-color,background-color,box-shadow] duration-200 ${
        open ? "border-foreground shadow-[0_14px_32px_-22px_rgba(0,0,0,0.35)]" : "border-foreground/15"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] transition-[background-color,color,border-color] duration-200 ${
          open || activeCount > 0
            ? "bg-foreground text-background"
            : "bg-card text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {activeCount > 0 && (
            <span
              className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                open || activeCount > 0 ? "bg-background text-foreground" : "bg-foreground text-background"
              }`}
            >
              {activeCount}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`absolute left-0 right-0 top-[calc(100%-1px)] z-20 origin-top transition-[opacity,transform] duration-200 ease-out ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div className="overflow-hidden rounded-b-xl border-2 border-t-0 border-foreground bg-background shadow-[0_14px_32px_-22px_rgba(0,0,0,0.35)]">
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
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
  enableNsfwGate?: boolean;
  resetFiltersOnQuery?: boolean;
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
  emptyTitle = "Nada por aqui",
  emptyCtaLabel = "Limpiar filtros",
  vibeScope,
  enableNsfwGate = false,
  resetFiltersOnQuery = false,
}: CatalogBrowserProps) {
  const [drawer, setDrawer] = useState(false);
  const [openHorizontalFilter, setOpenHorizontalFilter] = useState<string | null>(null);
  const filters = useMemo(() => parseCatalogSearch(search), [search]);
  const visibleProducts = useMemo(
    () => (enableNsfwGate && !filters.nsfwEnabled ? products.filter((product) => !product.categories?.some((category) => isNsfwCategory(category)) && !isNsfwCategory(product.category)) : products),
    [enableNsfwGate, filters.nsfwEnabled, products],
  );

  const departmentOptions = useMemo(() => getDepartmentOptions(visibleProducts), [visibleProducts]);
  const categoryOptions = useMemo(
    () => getCategoryOptions(visibleProducts).filter((category) => filters.nsfwEnabled || !isNsfwCategory(category.id)),
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

  const activeFilterLabels = [
    ...Array.from(filters.categories).map((value) => getCategoryLabel(value)),
    ...Array.from(filters.apparelSizes).map((value) => sizeLabel(value)),
    ...Array.from(filters.shoeSizes).map((value) => `Zapato ${value}`),
    ...Array.from(filters.colors).map((value) => value.charAt(0).toUpperCase() + value.slice(1)),
    ...Array.from(filters.priceBuckets),
    ...(filters.onlyAvail ? ["Solo disponibles"] : []),
    ...(filters.onlyNew ? ["Nuevos"] : []),
    ...(filters.onlySale ? ["Oferta"] : []),
    ...(filters.nsfwEnabled ? ["NSFW"] : []),
  ];

  const activeCategoryCount = filters.categories.size;
  const activeApparelSizeCount = filters.apparelSizes.size;
  const activeShoeSizeCount = filters.shoeSizes.size;
  const activeColorCount = filters.colors.size;
  const activePriceCount = filters.priceBuckets.size;
  const activeStatusCount = Number(filters.onlyAvail) + Number(filters.onlyNew) + Number(filters.onlySale);
  const activeNsfwCount = Number(filters.nsfwEnabled);

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

  const departmentContent = (
    <div className="space-y-2.5">
      {departmentOptions.map((option) => (
        <CheckboxRow
          key={option.value}
          checked={filters.departments.has(option.value)}
          label={option.label}
          count={option.count}
          onChange={() =>
            setFilters({
              ...filters,
              departments: toggleSet(filters.departments, option.value),
            })
          }
        />
      ))}
    </div>
  );

  const categoryContent = (
    <div className="flex flex-wrap gap-2">
      {categoryOptions.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() =>
            setFilters({
              ...filters,
              categories: toggleSet(filters.categories, category.id),
            })
          }
          className={`inline-flex items-center gap-2 rounded-full border-2 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition-[background-color,color,border-color] duration-200 ${
            filters.categories.has(category.id)
              ? "border-foreground bg-foreground text-background"
              : "border-foreground bg-card text-foreground"
          }`}
        >
          <span>{category.label}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${
              filters.categories.has(category.id) ? "bg-background text-foreground" : "bg-foreground text-background"
            }`}
          >
            {category.count}
          </span>
        </button>
      ))}
    </div>
  );

  const apparelSizeContent = (
    <div className="grid grid-cols-4 gap-2">
      {sizeOptions.map((option) => {
        const shortLabel =
          option.value.trim().toUpperCase() === "ONE SIZE" ? "OS" : option.value.trim().toUpperCase();

        return (
          <button
            key={option.value}
            onClick={() =>
              setFilters({
                ...filters,
                apparelSizes: toggleSet(filters.apparelSizes, option.value),
              })
            }
            className={`flex aspect-square min-h-11 items-center justify-center rounded-xl border-2 text-xs font-black uppercase transition ${
              filters.apparelSizes.has(option.value)
                ? "border-foreground bg-foreground text-background"
                : "border-foreground/25 bg-background text-foreground"
            }`}
            title={`${sizeLabel(option.value)} (${option.count})`}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );

  const shoeSizeContent = (
    <div className="grid grid-cols-4 gap-2">
      {shoeSizeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() =>
            setFilters({
              ...filters,
              shoeSizes: toggleSet(filters.shoeSizes, option.value),
            })
          }
          className={`flex aspect-square min-h-11 items-center justify-center rounded-xl border-2 text-xs font-black uppercase transition ${
            filters.shoeSizes.has(option.value)
              ? "border-foreground bg-foreground text-background"
              : "border-foreground/25 bg-background text-foreground"
          }`}
          title={`${option.value} (${option.count})`}
        >
          {option.value}
        </button>
      ))}
    </div>
  );

  const colorContent = (
    <div className="space-y-2.5">
      {colorOptions.map((option) => (
        <label key={option.id} className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={filters.colors.has(option.id)}
              onChange={() =>
                setFilters({
                  ...filters,
                  colors: toggleSet(filters.colors, option.id),
                })
              }
              className="h-4 w-4 rounded border-foreground accent-foreground"
            />
            <span
              className="h-4 w-4 rounded-[4px] border border-foreground/30"
              style={{ backgroundColor: option.swatch }}
            />
            <span className="font-semibold">{option.label}</span>
          </span>
          <span className="text-xs text-muted-foreground">{option.count}</span>
        </label>
      ))}
    </div>
  );

  const priceContent = (
    <div className="space-y-2.5">
      {PRICE_BUCKETS.map((bucket) => (
        <CheckboxRow
          key={bucket.id}
          checked={filters.priceBuckets.has(bucket.id)}
          label={bucket.label}
          count={
            visibleProducts.filter((product) => {
              const price = product.salePrice ?? product.price;
              return price >= bucket.min && price <= bucket.max;
            }).length
          }
          onChange={() =>
            setFilters({
              ...filters,
              priceBuckets: toggleSet(filters.priceBuckets, bucket.id),
            })
          }
        />
      ))}
    </div>
  );

  const statusContent = (
    <div className="space-y-2.5">
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
  );

  const nsfwContent = (
    <div className="space-y-2.5">
      <CheckboxRow
        checked={filters.nsfwEnabled}
        label="Mostrar categorias NSFW"
        onChange={() =>
          setFilters({
            ...filters,
            nsfwEnabled: !filters.nsfwEnabled,
            categories: filters.nsfwEnabled
              ? new Set(Array.from(filters.categories).filter((category) => !isNsfwCategory(category)))
              : filters.categories,
          })
        }
      />
    </div>
  );

  const filtersPanel = (
    <div className="space-y-7">
      {showDepartmentFilter && departmentOptions.length > 0 && (
        <FilterGroup title={departmentTitle}>{departmentContent}</FilterGroup>
      )}
      {enableNsfwGate && <FilterGroup title="NSFW">{nsfwContent}</FilterGroup>}
      <FilterGroup title="Categoria">{categoryContent}</FilterGroup>
      <FilterGroup title="Tallas">{apparelSizeContent}</FilterGroup>
      {shoeSizeOptions.length > 0 && <FilterGroup title="Tallas de zapato">{shoeSizeContent}</FilterGroup>}
      <FilterGroup title="Color">{colorContent}</FilterGroup>
      <FilterGroup title="Precio">{priceContent}</FilterGroup>
      <FilterGroup title="Estado">{statusContent}</FilterGroup>
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full rounded-full border-2 border-foreground bg-background px-4 py-3 text-sm font-bold uppercase"
        >
          {emptyCtaLabel}
        </button>
      )}
    </div>
  );

  const horizontalFilters = (
    <div className="mb-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {showDepartmentFilter && departmentOptions.length > 0 && (
        <HorizontalFilter
          title={departmentTitle}
          open={openHorizontalFilter === "department"}
          onToggle={() => setOpenHorizontalFilter((current) => (current === "department" ? null : "department"))}
          activeCount={filters.departments.size}
        >
          {departmentContent}
        </HorizontalFilter>
      )}

      {enableNsfwGate && (
        <HorizontalFilter
          title="NSFW"
          open={openHorizontalFilter === "nsfw"}
          onToggle={() => setOpenHorizontalFilter((current) => (current === "nsfw" ? null : "nsfw"))}
          activeCount={activeNsfwCount}
        >
          {nsfwContent}
        </HorizontalFilter>
      )}
      <HorizontalFilter
        title="Categoria"
        open={openHorizontalFilter === "category"}
        onToggle={() => setOpenHorizontalFilter((current) => (current === "category" ? null : "category"))}
        activeCount={activeCategoryCount}
      >
        {categoryContent}
      </HorizontalFilter>
      <HorizontalFilter
        title="Tallas"
        open={openHorizontalFilter === "sizes"}
        onToggle={() => setOpenHorizontalFilter((current) => (current === "sizes" ? null : "sizes"))}
        activeCount={activeApparelSizeCount}
      >
        {apparelSizeContent}
      </HorizontalFilter>
      {shoeSizeOptions.length > 0 && (
        <HorizontalFilter
          title="Zapatos"
          open={openHorizontalFilter === "shoes"}
          onToggle={() => setOpenHorizontalFilter((current) => (current === "shoes" ? null : "shoes"))}
          activeCount={activeShoeSizeCount}
        >
          {shoeSizeContent}
        </HorizontalFilter>
      )}
      <HorizontalFilter
        title="Color"
        open={openHorizontalFilter === "color"}
        onToggle={() => setOpenHorizontalFilter((current) => (current === "color" ? null : "color"))}
        activeCount={activeColorCount}
      >
        {colorContent}
      </HorizontalFilter>
      <HorizontalFilter
        title="Precio"
        open={openHorizontalFilter === "price"}
        onToggle={() => setOpenHorizontalFilter((current) => (current === "price" ? null : "price"))}
        activeCount={activePriceCount}
      >
        {priceContent}
      </HorizontalFilter>
      <HorizontalFilter
        title="Estado"
        open={openHorizontalFilter === "status"}
        onToggle={() => setOpenHorizontalFilter((current) => (current === "status" ? null : "status"))}
        activeCount={activeStatusCount}
      >
        {statusContent}
      </HorizontalFilter>

      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="rounded-xl border-2 border-foreground bg-background px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
        >
          Limpiar
        </button>
      )}
      </div>

      {activeFilterLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilterLabels.map((label, index) => (
            <span
              key={`${label}-${index}`}
              className="rounded-xl border-2 border-foreground bg-card px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.q}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar prenda..."
            className="w-full rounded-full border-2 border-foreground bg-card py-3 pl-10 pr-4"
          />
        </div>
        <select
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value as CatalogFilters["sort"] })}
          className="rounded-full border-2 border-foreground bg-card px-4 py-3 text-sm font-semibold"
        >
          {CATALOG_SORTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              Ordenar: {entry.label}
            </option>
          ))}
        </select>
        {mode === "sidebar" && (
          <button
            onClick={() => setDrawer(true)}
            className="flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-3 text-sm font-bold md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </button>
        )}
      </div>

      {mode === "horizontal" ? (
        <div>
          {horizontalFilters}
          <div className="mb-3 text-sm text-muted-foreground">{filtered.length} productos</div>
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-3xl">{emptyTitle}</p>
              <button onClick={clearFilters} className="mt-3 inline-block text-sm underline underline-offset-4">
                {emptyCtaLabel}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  soldOutMode={soldOutMode}
                  showSubtitle={false}
                  tone={tone}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-[300px_1fr]">
          <aside className="sticky top-20 hidden max-h-[calc(100vh-7rem)] self-start overflow-y-auto rounded-3xl border-2 border-foreground bg-card p-5 md:block">
            {filtersPanel}
          </aside>

          <div>
            <div className="mb-3 text-sm text-muted-foreground">{filtered.length} productos</div>
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="font-display text-3xl">{emptyTitle}</p>
                <button onClick={clearFilters} className="mt-3 inline-block text-sm underline underline-offset-4">
                  {emptyCtaLabel}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    soldOutMode={soldOutMode}
                    showSubtitle={false}
                    tone={tone}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "sidebar" && drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawer(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-auto rounded-t-3xl border-t-2 border-foreground bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-2xl">Filtros</div>
              <button onClick={() => setDrawer(false)} className="rounded-full p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filtersPanel}
            <button
              onClick={() => setDrawer(false)}
              className="sticker mt-6 w-full rounded-full border-2 border-foreground bg-foreground px-6 py-3 font-bold uppercase text-background"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
