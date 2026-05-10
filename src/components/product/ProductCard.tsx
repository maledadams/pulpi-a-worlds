import type { Product } from "@/data/products";
import { formatPrice, VIBES } from "@/data/products";
import { Link } from "@tanstack/react-router";

export function ProductCard({ product }: { product: Product }) {
  const onSale = product.salePrice && product.salePrice < product.price;
  return (
    <Link
      to="/producto/$slug"
      params={{ slug: product.slug }}
      className="group relative block"
    >
      <div className="chunky rounded-3xl overflow-hidden border-2 border-foreground bg-card group-hover:-rotate-1 transition">
        <div
          className="aspect-square relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})`,
          }}
        >
          <div className="absolute inset-0 grain opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center text-7xl wobble select-none">
            {product.emoji}
          </div>
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.newArrival && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-foreground text-background">
                Nuevo
              </span>
            )}
            {onSale && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-destructive text-destructive-foreground">
                Oferta
              </span>
            )}
            {!product.available && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Agotado
              </span>
            )}
          </div>
          <div
            className="absolute bottom-2 right-2 text-[10px] font-bold uppercase px-2 py-1 rounded-full text-white"
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
