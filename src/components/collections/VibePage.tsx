import { PRODUCTS, type Vibe } from "@/data/products";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useVibe } from "@/hooks/use-vibe";
import { type CatalogSearch } from "@/lib/store-filters";
import type { ReactNode } from "react";

type Cfg = {
  vibe: Vibe;
  title: string;
  tagline: string;
  intro: string;
  bg: string;
  logo: string;
  mood: string | null;
  decor?: ReactNode;
};

export function VibePage({
  cfg,
  search,
  onSearchChange,
}: {
  cfg: Cfg;
  search: CatalogSearch;
  onSearchChange: (next: CatalogSearch) => void;
}) {
  useVibe(cfg.vibe);
  const products = PRODUCTS.filter((p) => p.vibe === cfg.vibe);

  return (
    <div>
      <section className="relative overflow-hidden border-b-2 border-foreground">
        <div className="absolute inset-0" style={{ background: cfg.bg }} />
        {cfg.mood && (
          <img
            src={cfg.mood}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
          />
        )}
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-20 md:grid-cols-2 md:items-center md:py-28">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] opacity-80">{cfg.tagline}</div>
            <h1 className="mt-3 text-6xl leading-[0.9] md:text-8xl">{cfg.title}</h1>
            <p className="mt-5 max-w-md opacity-90">{cfg.intro}</p>
          </div>
          <div className="relative flex justify-center">
            <img
              src={cfg.logo}
              alt={cfg.title}
              className="max-h-[360px] w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="mb-4 text-3xl md:text-4xl">Toda la linea</h2>
        <CatalogBrowser
          products={products}
          search={search}
          onSearchChange={onSearchChange}
          mode="horizontal"
          tone="vibe"
          soldOutMode="vibe"
          emptyTitle="Nada en esta linea todavia"
          vibeScope={cfg.vibe}
        />
      </section>
    </div>
  );
}
