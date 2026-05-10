import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PRODUCTS, CATEGORIES, VIBES, type Vibe } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Search, SlidersHorizontal, X } from "lucide-react";

export const Route = createFileRoute("/tienda")({
  head: () => ({
    meta: [
      { title: "Tienda — Pulpiña RD" },
      { name: "description", content: "Explora toda la colección Pulpiña: Men, Moon, Sunshine y más." },
    ],
  }),
  component: Tienda,
});

const SORTS = [
  { id: "featured", label: "Destacados" },
  { id: "new", label: "Nuevos" },
  { id: "asc", label: "Precio ↑" },
  { id: "desc", label: "Precio ↓" },
] as const;

function Tienda() {
  const [q, setQ] = useState("");
  const [vibes, setVibes] = useState<Set<Vibe>>(new Set());
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [onlyAvail, setOnlyAvail] = useState(false);
  const [sort, setSort] = useState<typeof SORTS[number]["id"]>("featured");
  const [drawer, setDrawer] = useState(false);

  const filtered = useMemo(() => {
    let r = PRODUCTS.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (vibes.size && !vibes.has(p.vibe)) return false;
      if (cats.size && !cats.has(p.category)) return false;
      if (onlyAvail && !p.available) return false;
      return true;
    });
    if (sort === "asc") r = [...r].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    if (sort === "desc") r = [...r].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    if (sort === "new") r = [...r].sort((a, b) => Number(!!b.newArrival) - Number(!!a.newArrival));
    if (sort === "featured") r = [...r].sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return r;
  }, [q, vibes, cats, onlyAvail, sort]);

  const toggle = <T,>(set: Set<T>, val: T, setter: (s: Set<T>) => void) => {
    const n = new Set(set);
    n.has(val) ? n.delete(val) : n.add(val);
    setter(n);
  };

  const Filters = (
    <div className="space-y-6">
      <div>
        <div className="font-bold uppercase text-xs mb-2">Universo</div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(VIBES) as Vibe[]).map((v) => (
            <button
              key={v}
              onClick={() => toggle(vibes, v, setVibes)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border-2 border-foreground ${vibes.has(v) ? "bg-foreground text-background" : "bg-card"}`}
            >
              {VIBES[v].name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="font-bold uppercase text-xs mb-2">Categoría</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => toggle(cats, c.id, setCats)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border-2 border-foreground ${cats.has(c.id) ? "bg-foreground text-background" : "bg-card"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} />
        Solo disponibles
      </label>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl md:text-6xl">Tienda</h1>
        <p className="text-muted-foreground mt-1">Toda la colección Pulpiña en un solo lugar.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar prenda…"
            className="w-full pl-10 pr-4 py-3 rounded-full border-2 border-foreground bg-card"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-4 py-3 rounded-full border-2 border-foreground bg-card font-semibold text-sm"
        >
          {SORTS.map((s) => <option key={s.id} value={s.id}>Ordenar: {s.label}</option>)}
        </select>
        <button
          onClick={() => setDrawer(true)}
          className="md:hidden px-4 py-3 rounded-full border-2 border-foreground bg-card font-bold text-sm flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filtros
        </button>
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden md:block sticky top-20 self-start p-4 rounded-3xl border-2 border-foreground bg-card">
          {Filters}
        </aside>
        <div>
          <div className="text-sm text-muted-foreground mb-3">{filtered.length} productos</div>
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-display text-3xl">Nada por aquí</p>
              <Link to="/tienda" onClick={() => { setQ(""); setVibes(new Set()); setCats(new Set()); }} className="mt-3 inline-block text-sm underline underline-offset-4">Limpiar filtros</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setDrawer(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background border-t-2 border-foreground rounded-t-3xl p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="font-display text-2xl">Filtros</div>
              <button onClick={() => setDrawer(false)} className="p-2 rounded-full hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            {Filters}
            <button onClick={() => setDrawer(false)} className="sticker mt-6 w-full px-6 py-3 rounded-full bg-foreground text-background font-bold uppercase border-2 border-foreground">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  );
}
