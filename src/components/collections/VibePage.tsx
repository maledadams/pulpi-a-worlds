import { type Vibe } from "@/data/products";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { useVibe } from "@/hooks/use-vibe";
import { type CatalogSearch } from "@/lib/store-filters";
import type { ReactNode } from "react";
import { HeroWaveTransition } from "@/components/collections/HeroWaveTransition";

type Cfg = {
  vibe: Vibe;
  title: string;
  tagline: string;
  intro: string;
  catalogHeading: string;
  catalogThemeVibe?: Vibe;
  heroBorderClassName?: string;
  heroWaveColor?: string;
  heroTextClassName?: string;
  searchPlaceholderClassName?: string;
  catalogSectionClassName?: string;
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
  const products = useCatalogProducts().filter((product) => product.vibe === cfg.vibe);
  const catalogHeading = /^toda la linea$/i.test(cfg.catalogHeading.trim())
    ? "Toda la Linea"
    : cfg.catalogHeading;

  return (
    <div>
      <section className="relative z-10">
        <div className="absolute inset-0" style={{ background: cfg.bg }} />
        {cfg.mood && (
          <img
            src={cfg.mood}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
          />
        )}
        <div className="relative mx-auto flex max-w-7xl items-center justify-center px-4 py-20 md:py-28">
          <div className="relative flex w-full justify-center">
            <img
              src={cfg.logo}
              alt={cfg.title}
              className="max-h-[360px] w-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
        <HeroWaveTransition
          lineColor={cfg.heroWaveColor ?? "currentColor"}
        />
      </section>

      <section
        id="shop"
        className={`relative z-0 ${cfg.catalogSectionClassName ?? ""} ${
          cfg.catalogThemeVibe ? "text-foreground" : ""
        }`}
        data-vibe={cfg.catalogThemeVibe}
      >
        <div className="relative z-30 py-12">
          <div className="mx-auto w-full max-w-4xl px-4 text-center">
            <h2
              className="mb-4 text-3xl md:text-4xl"
              style={{
                fontFamily:
                  cfg.vibe === "moon"
                    ? "var(--font-gothic)"
                    : cfg.vibe === "sunshine"
                      ? "var(--font-sunshine)"
                      : undefined,
                fontWeight: cfg.vibe === "sunshine" ? 400 : undefined,
              }}
            >
              {catalogHeading}
            </h2>
          </div>
          <CatalogBrowser
            products={products}
            search={search}
            onSearchChange={onSearchChange}
            mode="horizontal"
            tone="vibe"
            soldOutMode="vibe"
            emptyTitle="Nada en esta linea todavia"
            vibeScope={cfg.vibe}
            themeVibe={cfg.catalogThemeVibe}
            searchPlaceholderClassName={cfg.searchPlaceholderClassName}
            wideProductResultsOnly
          />
        </div>
      </section>
    </div>
  );
}
