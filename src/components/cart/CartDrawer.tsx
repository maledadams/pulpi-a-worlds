import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { OctopusMark } from "@/components/ui/Decor";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

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
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l-2 border-foreground bg-background transition-transform duration-300 sm:w-[420px] ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-foreground p-4">
          <div className="font-display text-xl sm:text-2xl">Tu carrito</div>
          <button onClick={() => cart.setOpen(false)} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-auto p-4">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <OctopusMark className="h-20 w-20 text-foreground sm:h-24 sm:w-24" />
              <div className="font-display text-xl">Tu carrito está vacío</div>
              <p className="text-sm text-muted-foreground">
                {cart.configured
                  ? "Aún no has elegido tu vibra."
                  : "Conecta Shopify para habilitar el carrito."}
              </p>
              <Link
                to="/tienda"
                onClick={() => cart.setOpen(false)}
                className="sticker mt-2 rounded-full border-2 border-foreground bg-accent px-5 py-2.5 text-sm font-bold uppercase text-accent-foreground"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            cart.lines.map((line) => (
              <div
                key={line.id}
                className="flex gap-3 rounded-2xl border-2 border-foreground bg-card p-2"
              >
                {line.image ? (
                  <img
                    src={line.image.url}
                    alt={line.image.altText ?? line.productTitle}
                    className="h-20 w-20 shrink-0 rounded-xl border-2 border-foreground object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-foreground bg-muted font-display text-xl text-foreground/70">
                    {line.productTitle
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0]?.toUpperCase())
                      .join("")}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{line.productTitle}</div>
                  {line.selectedOptions.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {line.selectedOptions
                        .map((option) => `${option.name}: ${option.value}`)
                        .join(" · ")}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 rounded-full border border-foreground">
                      <button
                        onClick={() => void cart.update(line.id, line.quantity - 1)}
                        className="p-1.5"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => void cart.update(line.id, line.quantity + 1)}
                        className="p-1.5"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="text-sm font-bold">
                      {formatPrice(line.price * line.quantity, line.currencyCode)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => void cart.remove(line.id)}
                  className="self-start p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        {cart.lines.length > 0 && (
          <div className="space-y-3 border-t-2 border-foreground p-4">
            <div className="flex items-center justify-between font-display text-lg">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => cart.setOpen(false)}
              className="sticker block rounded-full border-2 border-foreground bg-foreground px-5 py-3 text-center text-sm font-bold uppercase text-background"
            >
              Finalizar compra
            </Link>
            <button
              onClick={() => cart.setOpen(false)}
              className="block w-full rounded-full px-5 py-2 text-center text-sm font-semibold hover:bg-muted"
            >
              Continuar comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
