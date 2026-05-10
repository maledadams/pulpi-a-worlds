import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Pulpiña RD" }] }),
  component: Checkout,
});

function Checkout() {
  const cart = useCart();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="text-7xl wobble inline-block">🔒</div>
      <h1 className="mt-3 text-4xl md:text-5xl">Te llevamos al checkout</h1>
      <p className="mt-3 text-muted-foreground">
        Pulpiña RD pronto se conectará a Shopify para procesar tu compra de forma segura.
        Mientras tanto, este es un checkout demo.
      </p>
      <div className="mt-8 p-6 rounded-3xl border-2 border-foreground bg-card text-left">
        <div className="font-display text-xl mb-3">Tu pedido</div>
        {cart.itemsWithProduct.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay productos. <Link to="/tienda" className="underline">Ir a la tienda</Link></p>
        ) : (
          <>
            <ul className="text-sm divide-y divide-border">
              {cart.itemsWithProduct.map((it, i) => (
                <li key={i} className="py-2 flex justify-between">
                  <span>{it.product.name} × {it.qty}</span>
                  <span className="font-bold">{formatPrice((it.product.salePrice ?? it.product.price) * it.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between font-display text-lg border-t border-border pt-3">
              <span>Total</span><span>{formatPrice(cart.subtotal)}</span>
            </div>
          </>
        )}
      </div>
      <Link to="/carrito" className="mt-6 inline-block text-sm underline">Volver al carrito</Link>
    </div>
  );
}
