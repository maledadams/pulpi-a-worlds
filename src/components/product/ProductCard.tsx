import { Link } from "@tanstack/react-router";
import type { Product } from "@/data/products";
import { formatPrice, isOnSale } from "@/data/products";

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
  void soldOutMode;
  void tone;

  const onSale = isOnSale(product.price, product.compareAtPrice);
  const soldOut = !product.available;
  const colors =
    product.colors ??
    (product.options.find((option) => option.name === "Color")?.values ?? []).map((name, index) => ({
      name,
      hex: product.swatch[index % product.swatch.length],
    }));

  return (
    <Link to="/producto/$slug" params={{ slug: product.slug }} className="group block">
      <div className="card-lift overflow-hidden rounded-lg bg-card shadow-sm">
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: "3/4",
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          {soldOut ? <div className="absolute inset-0 z-[5] bg-white/30" /> : null}

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
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {product.vibe !== "pulpina" ? product.vibe.charAt(0).toUpperCase() + product.vibe.slice(1) : "Tienda"}
            </p>
          ) : null}
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight sm:text-[0.875rem]">{product.name}</h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            {onSale ? (
              <span className="text-xs text-muted-foreground line-through">
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
                  className="h-3 w-3 rounded-full border border-foreground/15"
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
