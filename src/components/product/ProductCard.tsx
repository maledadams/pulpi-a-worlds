import type { Product } from "@/data/products";
import { formatPrice, VIBES } from "@/data/products";
import { Link } from "@tanstack/react-router";
import { Sparkle, Burst } from "@/components/ui/Decor";

function initials(name: string) {
  return name
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function ProductCard({ product }: { product: Product }) {
  const onSale = product.salePrice && product.salePrice < product.price;
  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group relative block"
    >
      <div className="sticker rounded-3xl overflow-hidden border-2 border-foreground bg-card">
        <div
          className="aspect-square relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          <div className="absolute inset-0 grain opacity-50" />
          {/* Decorative retro mark instead of emoji */}
          <Sparkle className="absolute top-3 right-3 h-5 w-5 text-foreground/30" />
          <Burst className="absolute bottom-3 left-3 h-6 w-6 text-foreground/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="font-display text-6xl md:text-7xl text-foreground/80 mix-blend-multiply select-none group-hover:scale-105 transition-transform duration-300">
              {initials(product.name)}
            </div>
          </div>
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.newArrival && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-foreground text-background border-2 border-foreground">
                Nuevo
              </span>
            )}
            {onSale && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-destructive text-destructive-foreground border-2 border-foreground">
                Oferta
              </span>
            )}
            {!product.available && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-muted text-muted-foreground border-2 border-foreground">
                Agotado
              </span>
            )}
          </div>
          <div
            className="absolute bottom-2 right-2 text-[10px] font-bold uppercase px-2 py-1 rounded-full text-white border-2 border-foreground"
            style={{ background: VIBES[product.vibe].color }}
          >
            {VIBES[product.vibe].name}
          </div>
        </div>
        <div className="p-3 bg-card">
          <h3 className="font-display text-base leading-tight">{product.name}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            {onSale && (
              <span className="text-sm line-through text-muted-foreground">
                {formatPrice(product.price)}
              </span>
            )}
            <span className="font-bold">{formatPrice(product.salePrice ?? product.price)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
