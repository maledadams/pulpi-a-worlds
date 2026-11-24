import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useActiveTheme, usePromoBanners } from "@/context/theme";
import { HeroEffect } from "@/components/theme/HeroEffect";
import type { ThemeAssetRef } from "@/lib/themes";

/**
 * The active theme's promo banners (spec §5.3). Inicio: in place of the "Elige tu Tienda"
 * card. Tienda: one long banner above the search bar, from the filters to Destacados.
 * Height follows the image (never cropped), desktop and phone art via <picture>. Several
 * banners take turns on their own (Lucia, 2026-11-19). Banners whose images are missing
 * are skipped; with none left, nothing renders and the page looks as it does today.
 */
export function useThemeBanners(page: "home" | "tienda") {
  const theme = useActiveTheme();
  // Every promotion's banner comes in once; this page shows the ones placed on it.
  const promos = usePromoBanners();
  return useMemo(() => {
    const list = (page === "home" ? theme?.homeBanners : theme?.tiendaBanners) ?? [];
    const fromTheme = list.flatMap((banner) => {
      const desktop = theme?.assets[banner.desktopAsset];
      const phone = theme?.assets[banner.mobileAsset];
      return desktop && phone ? [{ alt: banner.alt, href: banner.href, desktop, phone }] : [];
    });
    // Theme banners first, then every promotion's, all in the same rotation.
    return [
      ...fromTheme,
      ...promos.filter((promo) => promo.placement === page || promo.placement === "both"),
    ];
  }, [theme, page, promos]);
}

/** Back-compat name for Inicio: null when there is no banner to show. */
export function useHomeBanner() {
  const banners = useThemeBanners("home");
  return banners.length ? banners : null;
}

type Banner = ReturnType<typeof useThemeBanners>[number];

/** Lucia (2026-11-20): faster than the first 6 s. */
const ROTATE_MS = 4000;

function srcSet(asset: ThemeAssetRef) {
  return [
    ...asset.variants.map((variant) => `${variant.url} ${variant.width}w`),
    `${asset.url} ${asset.width}w`,
  ].join(", ");
}

function BannerLink({ href, children }: { href: string | null; children: ReactNode }) {
  // The href is one of the site's own pages, resolved on the server (theme-banner.ts).
  return href ? (
    <Link to={href as "/"} className="block">
      {children}
    </Link>
  ) : (
    <div>{children}</div>
  );
}

/**
 * Where the product rows (Inicio's collection rows) put their arrows, from the row's own box.
 * The banners use the very same classes so their arrows sit in exactly the same place on
 * every screen (Lucia, 2026-11-24). Change them here and both follow.
 */
export const ROW_ARROW_PREV = "-left-2 sm:-left-4 md:-left-2 lg:-left-3 xl:-left-16";
export const ROW_ARROW_NEXT = "-right-2 sm:-right-4 md:-right-2 lg:-right-3 xl:-right-16";

function BannerSlides({
  banners,
  priority,
  strip = false,
  boxClassName,
  rowInset = false,
  children,
}: {
  banners: Banner[];
  priority: boolean;
  /** The banner's own box (rounded, clipped). The arrows sit outside it, like the rows'. */
  boxClassName: string;
  /**
   * Inicio: the banner spans the page with the same 1rem gutter as the rows, but from xl the
   * rows step in to 5cm; the arrows step in with them. (Tienda's banner is already in that box.)
   */
  rowInset?: boolean;
  children?: ReactNode;
  /** Tienda: a fixed-height strip the image fills (cropped), whatever its shape. */
  strip?: boolean;
}) {
  const [active, setActive] = useState(0);
  // Bumped by the arrows and dots, so a manual move gets a full turn before the next auto one.
  const [manual, setManual] = useState(0);
  useEffect(() => setActive(0), [banners]);
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % banners.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [banners, manual]);
  const go = (index: number) => {
    setActive((index + banners.length) % banners.length);
    setManual((count) => count + 1);
  };
  const arrow =
    "ui-circle pointer-events-auto absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-white/90 text-[#121212] shadow-md transition hover:bg-[#121212] hover:text-white";

  return (
    <div className="relative">
      <div className={boxClassName}>
        {/* Every slide sits in the same grid cell, so the box is as tall as the tallest one
          and nothing below moves when they change. */}
        <div className="grid">
          {banners.map((banner, index) => (
            <div
              key={`${banner.desktop.url}-${index}`}
              className="col-start-1 row-start-1 transition-opacity duration-700 ease-out motion-reduce:transition-none"
              style={{ opacity: index === active ? 1 : 0, zIndex: index === active ? 1 : 0 }}
              aria-hidden={index === active ? undefined : true}
              inert={index === active ? undefined : true}
            >
              <BannerLink href={banner.href}>
                <picture>
                  <source
                    media="(min-width: 60rem)"
                    srcSet={srcSet(banner.desktop)}
                    sizes="100vw"
                  />
                  <img
                    src={banner.phone.url}
                    srcSet={srcSet(banner.phone)}
                    sizes="100vw"
                    width={banner.phone.width}
                    height={banner.phone.height}
                    alt={banner.alt}
                    fetchPriority={priority && index === 0 ? "high" : undefined}
                    loading={index === 0 ? undefined : "lazy"}
                    decoding="async"
                    className={
                      strip
                        ? "block h-[clamp(7.5rem,18vw,17rem)] w-full object-cover"
                        : "block h-auto w-full"
                    }
                  />
                </picture>
              </BannerLink>
            </div>
          ))}
        </div>
        {banners.length > 1 ? (
          <div className="absolute inset-x-0 bottom-3 z-[3] flex justify-center gap-2">
            {banners.map((banner, index) => (
              <button
                key={`${banner.desktop.url}-dot-${index}`}
                type="button"
                aria-label={`Ver banner ${index + 1}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => go(index)}
                className={`ui-nav-rounded h-2 bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)] transition-[width,opacity] duration-300 ${
                  index === active ? "w-6 opacity-100" : "w-2 opacity-60 hover:opacity-90"
                }`}
              />
            ))}
          </div>
        ) : null}
        {children}
      </div>
      {banners.length > 1 ? (
        // In the product rows' own spot (ROW_ARROW_PREV/NEXT): outside the clipped box, so
        // they can hang past its edge the way the rows' do.
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 right-0 z-10 ${
            rowInset ? "xl:left-[calc(5cm-1rem)] xl:right-[calc(5cm-1rem)]" : ""
          }`}
        >
          <button
            type="button"
            aria-label="Banner anterior"
            onClick={() => go(active - 1)}
            className={`${arrow} ${ROW_ARROW_PREV}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Banner siguiente"
            onClick={() => go(active + 1)}
            className={`${arrow} ${ROW_ARROW_NEXT}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HomeBanner({ banner, stacked = false }: { banner: Banner[]; stacked?: boolean }) {
  return (
    // Stacked: "Elige tu Tienda" follows right below and carries the effect itself.
    <section className={`w-full px-4 pt-10 ${stacked ? "pb-0" : "pb-16 md:pb-20"}`}>
      <BannerSlides
        banners={banner}
        priority
        rowInset
        boxClassName="relative w-full overflow-hidden rounded-[2rem] border border-[#ebebeb]/10"
      >
        {stacked ? null : (
          <div className="pointer-events-none absolute inset-0 z-[2]">
            <HeroEffect hero="home" />
          </div>
        )}
      </BannerSlides>
    </section>
  );
}

/** Tienda: the long banner over the search bar (renders nothing without a theme banner). */
export function TiendaBanner({ className = "" }: { className?: string }) {
  const banners = useThemeBanners("tienda");
  if (!banners.length) return null;
  return (
    <div className={className}>
      <BannerSlides
        banners={banners}
        priority={false}
        strip
        boxClassName="relative w-full overflow-hidden rounded-xl border-2 border-[color:var(--t-outline,var(--foreground))]"
      />
    </div>
  );
}
