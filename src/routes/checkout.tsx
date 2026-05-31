import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Pulpiña RD" }] }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();

  useEffect(() => {
    if (!cart.checkoutUrl || cart.lines.length === 0) return;

    const timeout = window.setTimeout(() => {
      window.location.assign(cart.checkoutUrl);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [cart.checkoutUrl, cart.lines.length]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:py-16">
      <div className="inline-block text-5xl wobble sm:text-7xl">↗</div>
      <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl">
        {cart.checkoutUrl ? "Te llevamos a Shopify" : "Checkout preview"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        {cart.checkoutUrl
          ? "El pago final, descuentos y órdenes viven en Shopify. Esta pantalla solo hace el handoff."
          : "Todavía no hay Shopify conectado, así que este paso queda como preview visual sin redirección."}
      </p>
      <div className="mt-8 rounded-3xl border-2 border-foreground bg-card p-5 text-left sm:p-6">
        <div className="mb-3 font-display text-xl">Tu pedido</div>
        {cart.lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay productos.{" "}
            <Link to="/tienda" className="underline">
              Ir a la tienda
            </Link>
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border text-sm">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 py-2">
                  <span>
                    {line.productTitle} × {line.quantity}
                  </span>
                  <span className="font-bold">
                    {formatPrice(line.price * line.quantity, line.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-border pt-3 font-display text-lg">
              <span>Total</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
          </>
        )}
      </div>
      {cart.checkoutUrl && cart.lines.length > 0 && (
        <a
          href={cart.checkoutUrl}
          className="sticker mt-6 inline-block rounded-full border-2 border-foreground bg-foreground px-6 py-3 font-bold uppercase text-background"
        >
          Ir al checkout de Shopify
        </a>
      )}
      <Link to="/carrito" className="mt-6 inline-block text-sm underline">
        Volver al carrito
      </Link>
    </div>
  );
}
