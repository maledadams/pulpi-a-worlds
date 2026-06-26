import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { OctopusMark } from "@/components/ui/Decor";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

type CartDrawerTheme = "store" | "moon" | "sunshine" | "men";

const CART_DRAWER_THEME: Record<
  CartDrawerTheme,
  {
    shell: string;
    shellBorder: string;
    shellText: string;
    shellSoftText: string;
    surface: string;
    surfaceBorder: string;
    qty: string;
    primaryButton: string;
  }
> = {
  store: {
    shell: "bg-background",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-card",
    surfaceBorder: "border-foreground/8",
    qty: "border-foreground/15 bg-background text-foreground",
    primaryButton: "bg-foreground text-background hover:opacity-90",
  },
  moon: {
    shell: "bg-background",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-card",
    surfaceBorder: "border-foreground/8",
    qty: "border-foreground/15 bg-background text-foreground",
    primaryButton: "bg-foreground text-background hover:opacity-90",
  },
  sunshine: {
    shell: "bg-background",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-card",
    surfaceBorder: "border-foreground/8",
    qty: "border-foreground/15 bg-background text-foreground",
    primaryButton: "bg-foreground text-background hover:opacity-90",
  },
  men: {
    shell: "bg-[#111111]",
    shellBorder: "border-[#f2e9e1]/10",
    shellText: "text-[#f2e9e1]",
    shellSoftText: "text-[#f2e9e1]/66",
    surface: "bg-white",
    surfaceBorder: "border-[#231717]/10",
    qty: "border-transparent bg-[#111111] text-[#f2e9e1]",
    primaryButton: "bg-[#8f2015] text-[#fff7f2] hover:opacity-90",
  },
};

export function CartDrawer({ theme = "store" }: { theme?: CartDrawerTheme }) {
  const cart = useCart();
  const palette = CART_DRAWER_THEME[theme];

  return (
    <>
      {cart.open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => cart.setOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l shadow-2xl transition-transform duration-300 sm:w-[400px] ${palette.shellBorder} ${palette.shell} ${palette.shellText} ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className={`flex items-center justify-between border-b px-4 py-3.5 ${palette.shellBorder}`}>
          <span className="font-display text-lg">Tu carrito</span>
          <button
            onClick={() => cart.setOpen(false)}
            className={`rounded-full p-1.5 transition ${palette.shellSoftText} hover:bg-white/8 hover:text-current`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <OctopusMark className={`h-16 w-16 ${palette.shellSoftText}`} />
              <p className="font-display text-lg">Tu carrito esta vacio</p>
              <p className={`text-sm ${palette.shellSoftText}`}>Aun no has elegido tu vibra.</p>
              <Link
                to="/tienda"
                onClick={() => cart.setOpen(false)}
                className={`mt-1 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider ${palette.primaryButton}`}
              >
                Ir a la tienda
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.lines.map((line) => (
                <div
                  key={line.id}
                  className={`flex gap-3 rounded-xl border p-2.5 ${palette.surfaceBorder} ${palette.surface} text-[#231717]`}
                >
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
                      {line.productTitle.split(" ").slice(0, 2).map((word) => word[0]?.toUpperCase()).join("")}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-normal">{line.productTitle}</p>
                    {line.selectedOptions.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`flex items-center rounded-full border ${palette.qty}`}>
                        <button
                          onClick={() => void cart.update(line.id, line.quantity - 1)}
                          className="px-2.5 py-1 opacity-80 transition hover:opacity-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[1.25rem] text-center text-xs font-bold">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => void cart.update(line.id, line.quantity + 1)}
                          className="px-2.5 py-1 opacity-80 transition hover:opacity-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold">
                        {formatPrice(line.price * line.quantity, line.currencyCode)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => void cart.remove(line.id)}
                    className="self-start p-1 text-muted-foreground/60 transition hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.lines.length > 0 && (
          <div className={`space-y-3 border-t px-4 py-4 ${palette.shellBorder}`}>
            <div className="flex items-center justify-between text-sm">
              <span className={palette.shellSoftText}>Subtotal</span>
              <span className="font-bold">{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <Link
              to="/solicitud"
              onClick={() => cart.setOpen(false)}
              className={`block w-full rounded-full py-3 text-center text-sm font-bold uppercase tracking-wider ${palette.primaryButton}`}
            >
              Enviar solicitud
            </Link>
            <button
              onClick={() => cart.setOpen(false)}
              className={`block w-full rounded-full py-2 text-center text-xs font-semibold transition hover:text-current ${palette.shellSoftText}`}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
