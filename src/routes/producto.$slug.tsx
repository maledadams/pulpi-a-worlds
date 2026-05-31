import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PRODUCTS, formatPrice, VIBES, type Product } from "@/data/products";
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
      <h1 className="font-display text-5xl">Producto no encontrado</h1>
      <Link to="/tienda" className="mt-4 inline-block underline underline-offset-4">Volver a la tienda</Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData() as { product: Product };
  const cart = useCart();
  useVibe(product.vibe);
  const galleryImages =
    product.images.length > 0 ? product.images : product.featuredImage ? [product.featuredImage] : [];
  const sizes = product.sizes ?? product.options.find((option) => option.name === "Talla")?.values ?? ["Única"];
  const colors =
    product.colors ??
    (product.options.find((option) => option.name === "Color")?.values ?? ["Único"]).map((name, index) => ({
      name,
      hex: product.swatch[index % product.swatch.length],
    }));
  const selectedVariant =
    product.variants.find((variant) =>
      variant.selectedOptions.every((option) => {
        if (option.name === "Talla") return option.value === sizes[0];
        if (option.name === "Color") return option.value === colors[0]?.name;
        return true;
      }),
    ) ?? product.variants[0];
  const [size, setSize] = useState(sizes[0]);
  const [color, setColor] = useState(colors[0]?.name ?? "Único");
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);
  const onSale = product.salePrice && product.salePrice < product.price;
  const related = PRODUCTS.filter((p) => p.vibe === product.vibe && p.id !== product.id).slice(0, 4);
  const currentImage = galleryImages[imageIndex] ?? null;
  const averageLuma =
    product.swatch
      .map((hex) => {
        const clean = hex.replace("#", "");
        const normalized =
          clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
        const value = Number.parseInt(normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      })
      .reduce((total, value) => total + value, 0) / product.swatch.length;
  const arrowToneClass = averageLuma < 140 ? "text-white" : "text-black";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div
            className="aspect-square rounded-3xl border-2 border-foreground overflow-hidden flex items-center justify-center relative grain"
            style={{ background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})` }}
          >
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-[8rem] md:text-[10rem] leading-none text-foreground/70 mix-blend-multiply select-none">
                {product.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
              </span>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className={`mt-3 flex items-center justify-end gap-3 text-sm font-black uppercase ${arrowToneClass}`}>
              <button
                onClick={() => setImageIndex((current) => (current === 0 ? galleryImages.length - 1 : current - 1))}
                className="transition hover:opacity-60"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[10px] tracking-[0.24em] opacity-80">
                {imageIndex + 1} / {galleryImages.length}
              </span>
              <button
                onClick={() => setImageIndex((current) => (current === galleryImages.length - 1 ? 0 : current + 1))}
                className="transition hover:opacity-60"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
              {sizes.map((s) => (
                <button key={s} onClick={() => setSize(s)} className={`px-4 py-2 rounded-full border-2 border-foreground text-sm font-bold ${size === s ? "bg-foreground text-background" : "bg-card"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-xs font-bold uppercase mb-2">Colores</div>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
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
              onClick={() =>
                cart.add({
                  variantId:
                    product.variants.find((variant) =>
                      variant.selectedOptions.every((option) => {
                        if (option.name === "Talla") return option.value === size;
                        if (option.name === "Color") return option.value === color;
                        return true;
                      }),
                    )?.id ?? selectedVariant.id,
                  quantity: qty,
                })
              }
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
