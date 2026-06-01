import { createFileRoute, Link } from "@tanstack/react-router";
import { OctopusMark } from "@/components/ui/Decor";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

export const Route = createFileRoute("/carrito")({
  head: () => ({ meta: [{ title: "Carrito — Pulpiña RD" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl sm:text-3xl md:text-4xl">Tu carrito</h1>
      {!cart.configured && (
        <p className="mt-3 text-sm text-muted-foreground">
          Estás viendo el carrito en modo preview. Cuando conectes Shopify, este flujo pasará a usar
          el checkout real.
        </p>
      )}

      {cart.lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-foreground/25 py-12 text-center sm:mt-10 sm:py-16">
          <OctopusMark className="mx-auto h-16 w-16 text-foreground wobble sm:h-20 sm:w-20" />
          <p className="mt-3 font-display text-xl sm:text-2xl">Aún no hay nada por aquí</p>
          <Link
            to="/tienda"
            className="sticker mt-5 inline-block rounded-full border border-foreground/20 bg-accent px-6 py-3 font-bold uppercase text-accent-foreground"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_340px] lg:gap-8">
          <div className="space-y-3">
            {cart.lines.map((line) => (
              <div
                key={line.id}
                className="flex flex-col gap-3 rounded-xl border border-foreground/20 bg-card p-3 sm:flex-row sm:gap-4"
              >
                {line.image ? (
                  <img
                    src={line.image.url}
                    alt={line.image.altText ?? line.productTitle}
                    className="h-28 w-full rounded-xl border border-foreground/20 object-cover sm:h-24 sm:w-24 sm:shrink-0"
                  />
                ) : (
                  <div className="flex h-28 w-full items-center justify-center rounded-xl border border-foreground/20 bg-muted font-display text-2xl text-foreground/70 sm:h-24 sm:w-24 sm:shrink-0">
                    {line.productTitle
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0]?.toUpperCase())
                      .join("")}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        to="/producto/$slug"
                        params={{ slug: line.productHandle }}
                        className="font-bold"
                      >
                        {line.productTitle}
                      </Link>
                      {line.selectedOptions.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {line.selectedOptions
                            .map((option) => `${option.name}: ${option.value}`)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="text-left font-bold sm:text-right">
                      {formatPrice(line.price * line.quantity, line.currencyCode)}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="flex items-center rounded-full border border-foreground/20">
                      <button
                        onClick={() => void cart.update(line.id, line.quantity - 1)}
                        className="px-3 py-1"
                      >
                        −
                      </button>
                      <span className="px-2 text-sm font-bold">{line.quantity}</span>
                      <button
                        onClick={() => void cart.update(line.id, line.quantity + 1)}
                        className="px-3 py-1"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => void cart.remove(line.id)}
                      className="text-sm text-muted-foreground underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="sticky top-20 self-start rounded-xl border border-foreground/20 bg-card p-5">
            <div className="font-display text-2xl">Resumen</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envío</span>
                <span>{cart.checkoutUrl ? "Calculado en checkout" : "Preview"}</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-3 font-display text-xl">
              <span>Total</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <Link
              to="/checkout"
              className="sticker mt-5 block rounded-full border border-foreground/20 bg-foreground px-6 py-3 text-center font-bold uppercase text-background"
            >
              Finalizar compra
            </Link>
            <Link to="/tienda" className="mt-2 block text-center text-sm font-semibold hover:underline">
              Continuar comprando
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
