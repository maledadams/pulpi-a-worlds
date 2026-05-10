import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { useState } from "react";
import { OctopusMark } from "@/components/ui/Decor";

export const Route = createFileRoute("/carrito")({
  head: () => ({ meta: [{ title: "Carrito — Pulpiña RD" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const [code, setCode] = useState("");
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl md:text-6xl">Tu carrito</h1>
      {cart.itemsWithProduct.length === 0 ? (
        <div className="mt-10 text-center py-16 rounded-3xl border-2 border-dashed border-foreground">
          <div className="text-7xl wobble inline-block">🐙</div>
          <p className="mt-3 font-display text-2xl">Aún no hay nada por aquí</p>
          <Link to="/tienda" className="sticker mt-5 inline-block px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">Ir a la tienda</Link>
        </div>
      ) : (
        <div className="mt-8 grid md:grid-cols-[1fr_340px] gap-8">
          <div className="space-y-3">
            {cart.itemsWithProduct.map((it, i) => (
              <div key={i} className="flex gap-4 p-3 border-2 border-foreground rounded-2xl bg-card">
                <div
                  className="h-24 w-24 rounded-xl flex items-center justify-center text-4xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${it.product.swatch[0]}, ${it.product.swatch[1]})` }}
                >
                  {it.product.emoji}
                </div>
                <div className="flex-1">
                  <Link to="/producto/$slug" params={{ slug: it.product.slug }} className="font-bold">{it.product.name}</Link>
                  <div className="text-xs text-muted-foreground">Talla {it.size} · {it.color}</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center border-2 border-foreground rounded-full">
                      <button onClick={() => cart.update(i, it.qty - 1)} className="px-3 py-1">−</button>
                      <span className="px-2 text-sm font-bold">{it.qty}</span>
                      <button onClick={() => cart.update(i, it.qty + 1)} className="px-3 py-1">+</button>
                    </div>
                    <button onClick={() => cart.remove(i)} className="text-sm underline text-muted-foreground">Eliminar</button>
                  </div>
                </div>
                <div className="font-bold">{formatPrice((it.product.salePrice ?? it.product.price) * it.qty)}</div>
              </div>
            ))}
          </div>
          <aside className="self-start p-5 rounded-3xl border-2 border-foreground bg-card sticky top-20">
            <div className="font-display text-2xl">Resumen</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(cart.subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Envío</span><span>Calculado en checkout</span></div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-bold uppercase">Código de descuento</label>
              <div className="flex gap-2 mt-1">
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PULPINA10" className="flex-1 px-3 py-2 rounded-full border-2 border-foreground bg-background text-sm" />
                <button className="px-4 py-2 rounded-full border-2 border-foreground bg-card font-bold text-sm">Aplicar</button>
              </div>
            </div>
            <div className="mt-4 flex justify-between font-display text-xl border-t border-border pt-3">
              <span>Total</span><span>{formatPrice(cart.subtotal)}</span>
            </div>
            <Link to="/checkout" className="sticker block text-center mt-5 px-6 py-3 rounded-full bg-foreground text-background font-bold uppercase border-2 border-foreground">Finalizar compra</Link>
            <Link to="/tienda" className="block text-center mt-2 text-sm font-semibold hover:underline">Continuar comprando</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
