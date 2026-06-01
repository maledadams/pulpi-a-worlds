import { Link } from "@tanstack/react-router";
import type { Product, Vibe } from "@/data/products";
import { formatPrice, isOnSale } from "@/data/products";

function initials(name: string) {
  return name
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/* "Nuevo" badge color — adapts to the product's vibe */
const NEW_BADGE: Record<Vibe, string> = {
  pulpina: "bg-[#e94560] text-white",
  moon:    "bg-[#7a0e1c] text-white",
  sunshine:"bg-[#ff5fa2] text-white",
  men:     "bg-[#c0392b] text-white",
};

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
  const soldOut = !product.available;

  const badge: "agotado" | "oferta" | "nuevo" | null = soldOut
    ? "agotado"
    : onSale
      ? "oferta"
      : product.newArrival
        ? "nuevo"
        : null;

  /* sold-out uses warm neutral, not gray */
  const soldOutBadgeCls = "bg-[#c4b8b0] text-white";

  return (
    <Link to="/producto/$slug" params={{ slug: product.slug }} className="group block">
      <div className="card-lift overflow-hidden rounded-lg bg-card shadow-sm">

        {/* ── Image / placeholder (portrait 3:4) ── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "3/4",
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          {/* Badge */}
          {badge && (
            <span
              className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                badge === "agotado"
                  ? soldOutBadgeCls
                  : badge === "oferta"
                    ? "bg-white text-foreground"   /* white sale badge */
                    : NEW_BADGE[product.vibe]       /* vibe-colored new badge */
              }`}
            >
              {badge === "agotado" ? "Agotado" : badge === "oferta" ? "Oferta" : "Nuevo"}
            </span>
          )}

          {/* Sold-out dim overlay */}
          {soldOut && (
            <div className="absolute inset-0 z-[5] bg-white/30" />
          )}

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

        {/* ── Info strip ── */}
        <div className="p-2.5 sm:p-3">
          {showSubtitle && (
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {product.vibe !== "pulpina" ? product.vibe.charAt(0).toUpperCase() + product.vibe.slice(1) : "Tienda"}
            </p>
          )}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-[0.875rem]">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            {onSale && (
              /* strikethrough price — muted, no red */
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice!, product.currencyCode)}
              </span>
            )}
            <span className="text-sm font-black sm:text-[0.95rem]">
              {formatPrice(product.price, product.currencyCode)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
