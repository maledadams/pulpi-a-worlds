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
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => cart.setOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-foreground/10 bg-background shadow-2xl transition-transform duration-300 sm:w-[400px] ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-foreground/8 px-4 py-3.5">
          <span className="font-display text-lg">Tu carrito</span>
          <button
            onClick={() => cart.setOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <OctopusMark className="h-16 w-16 text-foreground/20" />
              <p className="font-display text-lg">Tu carrito está vacío</p>
              <p className="text-sm text-muted-foreground">Aún no has elegido tu vibra.</p>
              <Link
                to="/tienda"
                onClick={() => cart.setOpen(false)}
                className="mt-1 rounded-full bg-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-background hover:opacity-90"
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.lines.map((line) => (
                <div
                  key={line.id}
                  className="flex gap-3 rounded-xl border border-foreground/8 bg-card p-2.5"
                >
                  {/* Thumbnail */}
                  {line.image ? (
                    <img
                      src={line.image.url}
                      alt={line.image.altText ?? line.productTitle}
                      className="h-18 w-18 shrink-0 rounded-lg object-cover"
                      style={{ height: "4.5rem", width: "4.5rem" }}
                    />
                  ) : (
                    <div
                      className="flex shrink-0 items-center justify-center rounded-lg bg-muted font-display text-base text-foreground/40"
                      style={{ height: "4.5rem", width: "4.5rem" }}
                    >
                      {line.productTitle.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")}
                    </div>
                  )}

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{line.productTitle}</p>
                    {line.selectedOptions.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      {/* Qty control */}
                      <div className="flex items-center rounded-full border border-foreground/15">
                        <button
                          onClick={() => void cart.update(line.id, line.quantity - 1)}
                          className="px-2.5 py-1 text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-xs font-bold">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => void cart.update(line.id, line.quantity + 1)}
                          className="px-2.5 py-1 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold">
                        {formatPrice(line.price * line.quantity, line.currencyCode)}
                      </span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => void cart.remove(line.id)}
                    className="self-start p-1 text-muted-foreground/60 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.lines.length > 0 && (
          <div className="border-t border-foreground/8 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold">{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={() => cart.setOpen(false)}
              className="block w-full rounded-full bg-foreground py-3 text-center text-sm font-bold uppercase tracking-wider text-background hover:opacity-90"
            >
              Finalizar compra
            </Link>
            <button
              onClick={() => cart.setOpen(false)}
              className="block w-full rounded-full py-2 text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
