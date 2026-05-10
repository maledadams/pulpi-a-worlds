import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { OctopusMark } from "@/components/ui/Decor";

export function CartDrawer() {
  const cart = useCart();
  return (
    <>
      {cart.open && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm"
          onClick={() => cart.setOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-background border-l-2 border-foreground transition-transform duration-300 flex flex-col ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b-2 border-foreground flex items-center justify-between">
          <div className="font-display text-2xl">Tu carrito</div>
          <button onClick={() => cart.setOpen(false)} className="p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.itemsWithProduct.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
              <div className="text-7xl wobble">🐙</div>
              <div className="font-display text-xl">Tu carrito está vacío</div>
              <p className="text-sm text-muted-foreground">Aún no has elegido tu vibra.</p>
              <Link
                to="/tienda"
                onClick={() => cart.setOpen(false)}
                className="sticker mt-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground font-bold uppercase text-sm border-2 border-foreground"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            cart.itemsWithProduct.map((it, i) => (
              <div key={i} className="flex gap-3 border-2 border-foreground rounded-2xl p-2 bg-card">
                <div
                  className="h-20 w-20 rounded-xl flex items-center justify-center text-3xl shrink-0"
                  style={{ background: `linear-gradient(135deg, ${it.product.swatch[0]}, ${it.product.swatch[1]})` }}
                >
                  {it.product.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{it.product.name}</div>
                  <div className="text-xs text-muted-foreground">Talla {it.size} · {it.color}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1 border border-foreground rounded-full">
                      <button onClick={() => cart.update(i, it.qty - 1)} className="p-1.5"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm w-6 text-center">{it.qty}</span>
                      <button onClick={() => cart.update(i, it.qty + 1)} className="p-1.5"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="font-bold text-sm">{formatPrice((it.product.salePrice ?? it.product.price) * it.qty)}</div>
                  </div>
                </div>
                <button onClick={() => cart.remove(i)} className="p-1.5 self-start text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        {cart.itemsWithProduct.length > 0 && (
          <div className="p-4 border-t-2 border-foreground space-y-3">
            <div className="flex items-center justify-between font-display text-lg">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => cart.setOpen(false)}
              className="sticker block text-center px-5 py-3 rounded-full bg-foreground text-background font-bold uppercase text-sm border-2 border-foreground"
            >
              Finalizar compra
            </Link>
            <button
              onClick={() => cart.setOpen(false)}
              className="block w-full text-center px-5 py-2 rounded-full text-sm font-semibold hover:bg-muted"
            >
              Continuar comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
