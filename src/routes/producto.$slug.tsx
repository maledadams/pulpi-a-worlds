import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PRODUCTS, formatPrice, VIBES } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { useCart } from "@/context/cart";
import { useVibe } from "@/hooks/use-vibe";

export const Route = createFileRoute("/producto/$slug")({
  loader: ({ params }) => {
    const product = PRODUCTS.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <div className="text-6xl">🐙</div>
      <h1 className="font-display text-3xl mt-3">Producto no encontrado</h1>
      <Link to="/tienda" className="mt-4 inline-block underline">Volver a la tienda</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const cart = useCart();
  useVibe(product.vibe);
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0].name);
  const [qty, setQty] = useState(1);
  const onSale = product.salePrice && product.salePrice < product.price;
  const related = PRODUCTS.filter((p) => p.vibe === product.vibe && p.id !== product.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="grid grid-cols-2 gap-3">
          <div
            className="aspect-square col-span-2 rounded-3xl border-2 border-foreground overflow-hidden flex items-center justify-center text-9xl"
            style={{ background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})` }}
          >
            <span className="wobble">{product.emoji}</span>
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl border-2 border-border opacity-70"
              style={{ background: `linear-gradient(${135 + i * 40}deg, ${product.swatch[1]}, ${product.swatch[0]})` }}
            />
          ))}
        </div>
        <div>
          <span className="inline-block text-xs font-bold uppercase px-2 py-1 rounded-full text-white" style={{ background: VIBES[product.vibe].color }}>
            {VIBES[product.vibe].name}
          </span>
          <h1 className="mt-3 text-4xl md:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            {onSale && <span className="text-xl line-through text-muted-foreground">{formatPrice(product.price)}</span>}
            <span className="text-3xl font-bold">{formatPrice(product.salePrice ?? product.price)}</span>
          </div>
          <p className="mt-4 text-muted-foreground">{product.description}</p>
          <div className={`mt-3 inline-block text-xs font-bold px-3 py-1 rounded-full ${product.available ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            {product.available ? `Disponible · ${product.stock} en stock` : "Agotado"}
          </div>

          <div className="mt-6">
            <div className="text-xs font-bold uppercase mb-2">Tallas</div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`px-4 py-2 rounded-full border-2 border-foreground text-sm font-bold ${size === s ? "bg-foreground text-background" : "bg-card"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-bold uppercase mb-2">Colores</div>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button key={c.name} onClick={() => setColor(c.name)} className={`px-3 py-2 rounded-full border-2 border-foreground text-sm font-bold flex items-center gap-2 ${color === c.name ? "bg-foreground text-background" : "bg-card"}`}>
                  <span className="h-3 w-3 rounded-full border" style={{ background: c.hex }} /> {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center border-2 border-foreground rounded-full">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2">−</button>
              <span className="px-2 font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2">+</button>
            </div>
            <button
              disabled={!product.available}
              onClick={() => cart.add({ productId: product.id, size, color, qty })}
              className="sticker flex-1 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold uppercase border-2 border-foreground disabled:opacity-50"
            >
              Agregar al carrito
            </button>
          </div>

          <div className="mt-8 grid gap-2 text-sm">
            <details className="border-b border-border py-2">
              <summary className="font-bold cursor-pointer">Detalles</summary>
              <p className="mt-2 text-muted-foreground">Diseño exclusivo Pulpiña RD. Edición limitada.</p>
            </details>
            <details className="border-b border-border py-2">
              <summary className="font-bold cursor-pointer">Cuidado</summary>
              <p className="mt-2 text-muted-foreground">Lavar a mano con agua fría. No usar secadora.</p>
            </details>
            <details className="border-b border-border py-2">
              <summary className="font-bold cursor-pointer">Envío</summary>
              <p className="mt-2 text-muted-foreground">Envíos en toda RD. Entrega en 2–5 días hábiles.</p>
            </details>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-3xl md:text-4xl mb-4">Más de esta vibra</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
