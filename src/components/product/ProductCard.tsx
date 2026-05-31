import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { formatPrice, isOnSale, VIBE_LAYOUTS, VIBES } from "@/data/products";

function initials(name: string) {
  return name
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

export function ProductCard({
  product,
  soldOutMode = "vibe",
  showSubtitle = false,
  tone = "vibe",
}: {
  product: Product;
  soldOutMode?: "standard" | "vibe";
  showSubtitle?: boolean;
  tone?: "store" | "vibe";
}) {
  const onSale = isOnSale(product.price, product.compareAtPrice);
  const vibe = VIBES[product.vibe];
  const palette = VIBE_LAYOUTS[product.vibe];
  const soldOut = !product.available;
  const storePalette = {
    ink: "#241717",
    border: "#24171722",
    badgeBorder: "#241717",
    price: "#241717",
    cardSurface: "#fff8ef",
    saleBadge: "#ff5fa2",
    newBadge: "#7fc241",
    soldOutBadge: "#8f8881",
  };
  const cardSurface = storePalette.cardSurface;
  const badge = soldOut ? "Agotado" : onSale ? "Oferta" : product.newArrival ? "Nuevo" : null;

  const soldOutSurface =
    soldOutMode === "standard"
      ? {
          imageOverlay: "rgba(231, 228, 224, 0.72)",
          imageBorder: "#8f8881",
          text: "#7c746d",
          badgeBg: "#9f988f",
        }
      : {
          imageOverlay: `${palette.surface}D4`,
          imageBorder: `${palette.ink}66`,
          text: `${palette.ink}99`,
          badgeBg: `${palette.ink}B8`,
        };

  return (
    <Link to="/producto/$slug" params={{ slug: product.slug }} className="group block h-full">
      <article
        className="flex h-full flex-col gap-2.5 rounded-[1.5rem] border-2 p-2.5 shadow-[0_10px_26px_-14px_rgba(0,0,0,0.35)] transition duration-200 group-hover:-translate-y-1 sm:gap-3 sm:rounded-[1.9rem] sm:p-3"
        style={{
          color: soldOut ? soldOutSurface.text : tone === "store" ? storePalette.ink : palette.ink,
          backgroundColor: cardSurface,
          borderColor:
            soldOut
              ? soldOutSurface.imageBorder
              : tone === "store"
                ? storePalette.border
                : `${palette.ink}22`,
        }}
      >
        <div
          className="relative aspect-[0.92] overflow-hidden rounded-[1.35rem] sm:rounded-[1.9rem]"
          style={{
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          {badge && (
            <div
              className="absolute right-[-3.1rem] top-4 z-10 w-36 rotate-45 border-y-2 px-2 py-1 text-center text-[10px] font-black uppercase tracking-[0.16em] sm:right-[-2.75rem] sm:top-5 sm:w-40 sm:px-3 sm:text-[11px] sm:tracking-[0.18em]"
              style={{
                backgroundColor:
                  tone === "store"
                    ? soldOut
                      ? storePalette.soldOutBadge
                      : onSale
                        ? storePalette.saleBadge
                        : storePalette.newBadge
                    : soldOut
                      ? soldOutSurface.badgeBg
                      : onSale
                        ? vibe.color
                        : "#169b34",
                borderColor:
                  soldOut
                    ? soldOutSurface.imageBorder
                    : tone === "store"
                      ? storePalette.badgeBorder
                      : palette.ink,
                color: "#fffaf4",
              }}
            >
              {badge}
            </div>
          )}

          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.name}
              className={`absolute inset-[11%] h-[78%] w-[78%] object-contain transition duration-300 sm:inset-[10%] sm:h-[80%] sm:w-[80%] ${soldOut ? "grayscale" : "group-hover:scale-[1.02]"}`}
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.45),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.12),transparent_42%)]" />
              <div className="absolute inset-[10%] grid place-items-center px-8 sm:px-12">
                <div
                  className="text-center font-display text-5xl leading-none mix-blend-multiply sm:text-6xl md:text-7xl"
                  style={{
                    color:
                      soldOut
                        ? soldOutSurface.text
                        : tone === "store"
                          ? `${storePalette.ink}BB`
                          : `${palette.ink}BB`,
                  }}
                >
                  {initials(product.name)}
                </div>
              </div>
            </>
          )}

          {soldOut && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: soldOutSurface.imageOverlay }}
            />
          )}
        </div>

        <div className="flex flex-1 flex-col gap-2 px-0.5 sm:gap-3 sm:px-1">
          <div>
            {showSubtitle && (
              <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-65">
                {vibe.subtitle}
              </div>
            )}
            <h3 className={`${showSubtitle ? "mt-1" : ""} text-[1.25rem] leading-[1.02] sm:text-[1.55rem]`}>
              {product.name}
            </h3>
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] opacity-55">
                Precio
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                {onSale && (
                  <span className="text-[12px] line-through opacity-45 sm:text-sm">
                    {formatPrice(product.compareAtPrice ?? product.price, product.currencyCode)}
                  </span>
                )}
                <span
                  className="text-[1.45rem] font-black sm:text-2xl"
                  style={{
                    color:
                      soldOut
                        ? soldOutSurface.text
                        : tone === "store"
                          ? storePalette.price
                          : vibe.color,
                  }}
                >
                  {formatPrice(product.price, product.currencyCode)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
