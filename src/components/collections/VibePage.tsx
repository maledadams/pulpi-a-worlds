import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS, CATEGORIES, type Vibe } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { useVibe } from "@/hooks/use-vibe";
import type { ReactNode } from "react";

type Cfg = {
  vibe: Vibe;
  title: string;
  tagline: string;
  intro: string;
  bg: string;
  logo: string;
  mood: string | null;
  decor: ReactNode;
};

export function VibePage({ cfg }: { cfg: Cfg }) {
  useVibe(cfg.vibe);
  const products = PRODUCTS.filter((p) => p.vibe === cfg.vibe);
  const featured = products.filter((p) => p.featured);
  const cats = Array.from(new Set(products.map((p) => p.category)));

  return (
    <div>
      <section className="relative overflow-hidden border-b-2 border-border">
        <div className="absolute inset-0" style={{ background: cfg.bg }} />
        {cfg.mood && (
          <img
            src={cfg.mood}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
          />
        )}
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] opacity-80">{cfg.tagline}</div>
            <h1 className="mt-3 text-6xl md:text-8xl leading-[0.9]">{cfg.title}</h1>
            <p className="mt-5 max-w-md opacity-90">{cfg.intro}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#shop" className="sticker px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold uppercase border-2 border-foreground">Comprar la línea</a>
              <Link to="/tienda" className="sticker px-6 py-3 rounded-full bg-card text-foreground font-bold uppercase border-2 border-foreground">Toda la tienda</Link>
            </div>
          </div>
          <div className="relative flex justify-center">
            <img src={cfg.logo} alt={cfg.title} className="max-h-[360px] w-auto object-contain drop-shadow-2xl wobble" />
            <div className="absolute inset-0 pointer-events-none">{cfg.decor}</div>
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex flex-wrap gap-2 mb-6">
          {cats.map((c) => {
            const cat = CATEGORIES.find((x) => x.id === c);
            return (
              <span key={c} className="px-3 py-1.5 rounded-full text-xs font-bold uppercase border-2 border-border bg-card">
                {cat?.label ?? c}
              </span>
            );
          })}
        </div>

        {featured.length > 0 && (
          <>
            <h2 className="text-3xl md:text-4xl mb-4">Piezas destacadas</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {featured.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </>
        )}

        <h2 className="text-3xl md:text-4xl mb-4">Toda la línea</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
