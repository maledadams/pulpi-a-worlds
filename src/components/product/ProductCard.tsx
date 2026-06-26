import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { formatPrice, isOnSale } from "@/data/products";

const PRODUCT_BADGE_THEME = {
  pulpina: {
    sale: "bg-[#c5475f] text-white",
    fresh: "bg-[#c5f56a] text-[#243011]",
    soldOut: "bg-black/70 text-white",
  },
  moon: {
    sale: "bg-[#7b1832] text-[#fff5f8]",
    fresh: "bg-[#f3e7dc] text-[#3a1c28]",
    soldOut: "bg-black/72 text-white",
  },
  sunshine: {
    sale: "bg-[#ff4ea3] text-white",
    fresh: "bg-[#d9ff6f] text-[#243011]",
    soldOut: "bg-[#3a0a14]/78 text-white",
  },
  men: {
    sale: "bg-[#8f2015] text-[#fff7f2]",
    fresh: "bg-[#f2e9e1] text-[#3a0808]",
    soldOut: "bg-black/74 text-white",
  },
} as const;

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
  themeVibe,
}: {
  product: Product;
  soldOutMode?: "standard" | "vibe";
  showSubtitle?: boolean;
  tone?: "store" | "vibe";
  themeVibe?: Product["vibe"];
}) {
  void soldOutMode;

  const onSale = isOnSale(product.price, product.compareAtPrice);
  const soldOut = !product.available;
  const visualVibe = themeVibe ?? product.vibe;
  const badgeTheme = PRODUCT_BADGE_THEME[product.vibe];
  const isMoonCard = tone === "vibe" && visualVibe === "moon";
  const colors =
    product.colors ??
    (product.options.find((option) => option.name === "Color")?.values ?? []).map((name, index) => ({
      name,
      hex: product.swatch[index % product.swatch.length],
    }));

  return (
    <Link to="/producto/$slug" params={{ slug: product.slug }} className="group block">
      <div
        className={`card-lift overflow-hidden rounded-lg shadow-sm ${
          isMoonCard
            ? "border border-[#f2e9e1]/10 bg-[#111111] text-[#f2e9e1]"
            : "bg-card"
        }`}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "3/4",
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          {soldOut ? <div className="absolute inset-0 z-[5] bg-white/30" /> : null}
          {(onSale || product.newArrival || soldOut) ? (
            <div className="absolute left-2 top-2 z-[6] flex flex-wrap gap-1.5">
              {onSale ? (
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTheme.sale}`}>
                  Oferta
                </span>
              ) : null}
              {product.newArrival ? (
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTheme.fresh}`}>
                  Nuevo
                </span>
              ) : null}
              {soldOut ? (
                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${badgeTheme.soldOut}`}>
                  Agotado
                </span>
              ) : null}
            </div>
          ) : null}

          {product.featuredImage ? (
            <img
              src={product.featuredImage.url}
              alt={product.featuredImage.altText ?? product.name}
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${
                soldOut ? "grayscale-[60%]" : "group-hover:scale-105"
              }`}
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.3),transparent_50%)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="select-none font-display text-6xl leading-none mix-blend-overlay"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {initials(product.name)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="p-2.5 sm:p-3">
          {showSubtitle ? (
            <p
              className={`mb-0.5 text-[10px] font-bold uppercase tracking-widest ${
                isMoonCard ? "text-muted-foreground" : "text-muted-foreground"
              }`}
            >
              {product.vibe !== "pulpina" ? product.vibe.charAt(0).toUpperCase() + product.vibe.slice(1) : "Tienda"}
            </p>
          ) : null}
          <h3
            className="line-clamp-2 text-sm font-normal leading-normal sm:text-[0.95rem]"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            {onSale ? (
              <span className={`text-xs line-through ${isMoonCard ? "text-muted-foreground" : "text-muted-foreground"}`}>
                {formatPrice(product.compareAtPrice!, product.currencyCode)}
              </span>
            ) : null}
            <span className="text-sm font-black sm:text-[0.95rem]">
              {formatPrice(product.price, product.currencyCode)}
            </span>
          </div>
          {colors.length > 0 ? (
            <div className="mt-2 flex items-center gap-1.5">
              {colors.slice(0, 5).map((color) => (
                <span
                  key={color.name}
                  className={`h-3 w-3 rounded-full ${isMoonCard ? "border border-[#f2e9e1]/12" : "border border-foreground/15"}`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
