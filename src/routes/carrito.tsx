import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StorePineapple } from "@/components/branding/StorePineapple";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { createSeoHead } from "@/lib/seo";
import { useScrollFollow } from "@/hooks/use-scroll-follow";

export const Route = createFileRoute("/carrito")({
  ssr: false,
  head: () => createSeoHead({ pageName: "Carrito", path: "/carrito", noIndex: true }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const summaryFollower = useScrollFollow(768);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <h1 className="text-2xl uppercase sm:text-3xl md:text-4xl">TU CARRITO</h1>

      {cart.lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-foreground/25 py-12 text-center sm:mt-10 sm:py-16">
          <StorePineapple theme="store" className="mx-auto h-20 w-auto object-contain sm:h-24" />
          <p
            className="mt-3 text-center font-display text-xl sm:text-2xl"
            style={{ transform: "none", transformOrigin: "center" }}
          >
            Aun no hay nada por aqui
          </p>
          <Link
            to="/tienda"
            className="mt-5 inline-block rounded-full bg-[#c5475f] px-6 py-3 font-bold uppercase text-white shadow-none transition-colors hover:bg-[#b53f55]"
          >
            Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          {cart.hasUnavailableLines ? (
            <div id="productos-no-disponibles" className="mb-4 border border-[#c5475f] bg-[#c5475f]/10 p-4 text-sm">
              <div className="font-bold">Hay productos agotados o eliminados en tu carrito.</div>
              <div className="mt-1 text-muted-foreground">
                No se incluiran en el total. Quitalos antes de completar el pedido.
              </div>
            </div>
          ) : null}

          <div ref={summaryFollower.containerRef} className="grid gap-6 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_340px] lg:gap-8">
          <div className="space-y-3">
            {cart.lines.map((line) => {
              const availability = cart.getLineAvailability(line);
              const availabilityMessage =
                availability.reason === "deleted"
                  ? "Este producto ya no existe en la tienda. Quitalo del carrito."
                  : availability.reason === "insufficient_stock"
                    ? `Solo quedan ${availability.availableQuantity}. Reduce la cantidad o quitalo.`
                    : "Este producto esta agotado. Quitalo del carrito.";

              return (
                <div
                  key={line.id}
                  className={`flex flex-col gap-3 rounded-xl border border-foreground/20 bg-card p-3 sm:flex-row sm:gap-5 ${
                    availability.available ? "" : "grayscale opacity-55"
                  }`}
                >
                {line.image ? (
                  <img
                    src={line.image.url}
                    alt={line.image.altText ?? line.productTitle}
                    className="h-28 w-28 shrink-0 self-start rounded-xl border border-foreground/20 object-cover sm:h-24 sm:w-24"
                  />
                ) : (
                  <div className="flex h-28 w-28 shrink-0 self-start items-center justify-center rounded-xl border border-foreground/20 bg-muted text-2xl text-foreground/70 sm:h-24 sm:w-24">
                    <span className="font-display">
                      {line.productTitle
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase())
                        .join("")}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <Link
                        to="/producto/$slug"
                        params={{ slug: line.productHandle }}
                        className="font-normal"
                      >
                        {line.productTitle}
                      </Link>
                      {line.selectedOptions.length > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          {line.selectedOptions
                            .map((option) => `${option.name}: ${option.value}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                    </div>
                    {availability.available ? (
                      <div className="text-left font-bold sm:text-right">
                        {formatPrice(availability.currentPrice * line.quantity, line.currencyCode)}
                      </div>
                    ) : null}
                  </div>
                  {!availability.available ? (
                    <div className="mt-2 text-sm font-bold text-[#9a233d]">Fuera de stock · {availabilityMessage}</div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="ui-quantity-pill flex items-center overflow-hidden border border-foreground/20 bg-background">
                      <button
                        onClick={() => void cart.update(line.id, line.quantity - 1)}
                        className="px-3 py-1"
                      >
                        -
                      </button>
                      <span className="px-2 text-sm font-bold">{line.quantity}</span>
                      <button
                        onClick={() => void cart.update(line.id, line.quantity + 1)}
                        disabled={!availability.available || availability.availableQuantity <= line.quantity}
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
              );
            })}
          </div>

          <aside
            ref={summaryFollower.floatingRef}
            className="self-start rounded-xl border border-foreground/20 bg-card p-5 will-change-transform transition-transform duration-500 ease-out"
            style={{ transform: `translate3d(0, ${summaryFollower.offset}px, 0)` }}
          >
            <div className="font-display text-2xl">Resumen</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Envio</span>
                <span>Se confirma por mensaje</span>
              </div>
            </div>
            <div className="mt-4 flex justify-between border-t border-border pt-3 font-body text-xl font-semibold">
              <span>Total</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                void cart.refreshAvailability().then((available) => {
                  if (available) {
                    void navigate({ to: "/solicitud" });
                    return;
                  }
                  document.getElementById("productos-no-disponibles")?.scrollIntoView({ behavior: "smooth" });
                });
              }}
              disabled={cart.loading}
              aria-disabled={cart.hasUnavailableLines}
              className={`mt-5 block w-full rounded-full border border-foreground/20 px-6 py-3 text-center font-bold uppercase shadow-none transition-transform hover:-translate-y-0.5 hover:shadow-none disabled:cursor-wait ${
                cart.hasUnavailableLines
                  ? "cursor-not-allowed bg-muted text-muted-foreground"
                  : "bg-foreground text-background"
              }`}
            >
              {cart.loading
                ? "Verificando stock..."
                : cart.hasUnavailableLines
                  ? "Quita productos agotados"
                  : "Completar pedido"}
            </button>
          </aside>
          </div>
        </div>
      )}
    </div>
  );
}
