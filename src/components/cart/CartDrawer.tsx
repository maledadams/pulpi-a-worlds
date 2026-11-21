import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { StorePineapple } from "@/components/branding/StorePineapple";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

type CartDrawerTheme = "store" | "moon" | "sunshine" | "men";

const CART_DRAWER_THEME: Record<
  CartDrawerTheme,
  {
    shell: string;
    /** Background of the area that lists the products. */
    listArea: string;
    /** Text color of each product line. */
    itemText: string;
    shellBorder: string;
    shellText: string;
    shellSoftText: string;
    surface: string;
    surfaceBorder: string;
    imageBorder: string;
    imageFallback: string;
    qty: string;
    primaryButton: string;
    /** Header (TU CARRITO) and footer (subtotal, Enviar solicitud) strips. */
    barBg: string;
    barText: string;
    /** X, "Subtotal" and "Seguir comprando". */
    barSoft: string;
    /** Lines under the header and over the footer. */
    divider: string;
  }
> = {
  store: {
    shell: "bg-background",
    listArea: "bg-muted",
    itemText: "text-[color:var(--t-text-strong)]",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-card",
    // Base theme: each product has the 2px black outline used on the tienda cards.
    surfaceBorder: "!border-2 border-[color:var(--t-card-border,var(--foreground))]",
    imageBorder: "border-foreground/20",
    imageFallback: "bg-muted text-foreground/40",
    // Base theme: the quantity pill looks like the header dropdown buttons.
    qty: "border-foreground/15 bg-muted text-muted-foreground",
    primaryButton: "bg-[color:var(--t-btn-dark,var(--foreground))] text-[color:var(--t-btn-dark-text,var(--background))] hover:opacity-90",
    barBg: "",
    barText: "",
    barSoft: "text-muted-foreground",
    divider: "border-foreground/10",
  },
  // Sub-stores (owner, 2026-11-18): product lines and "Enviar solicitud" use
  // the store's product outline color, and so do the 2px lines under the
  // header and over the footer. Moon and Men: header and footer keep the
  // cart's own background and text; the product area is that same color 30%
  // lighter. Sunshine: header and footer take the product lines' white, with
  // the X, "Subtotal" and "Seguir comprando" 10% darker.
  moon: {
    shell: "bg-background",
    listArea: "bg-[color-mix(in_oklch,var(--background)_70%,white)]",
    itemText: "text-[#231717]",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-foreground",
    surfaceBorder: "!border-2 border-[#7b1832]",
    imageBorder: "border-foreground/20",
    imageFallback: "bg-background text-foreground/40",
    // -1+ pill (owner, 2026-11-18): the product area's lightened color
    // (L 0.405), made a bit warmer, with a darker outline of the same warm
    // tone; text in the subtotal amount's color.
    qty: "border-[oklch(0.3_0.035_30)] bg-[oklch(0.405_0.03_30)] text-foreground",
    primaryButton: "bg-[#7b1832] text-[#fff5f8] hover:opacity-90",
    barBg: "",
    barText: "",
    barSoft: "text-muted-foreground",
    divider: "border-[#7b1832]",
  },
  sunshine: {
    shell: "bg-background",
    listArea: "",
    itemText: "text-[#231717]",
    shellBorder: "border-foreground/10",
    shellText: "text-foreground",
    shellSoftText: "text-muted-foreground",
    surface: "bg-card",
    // Sunshine's pink 20% lighter on the product lines (owner, 2026-11-18).
    surfaceBorder: "!border-2 border-[color-mix(in_oklch,#ff4ea3_80%,white)]",
    imageBorder: "border-foreground/20",
    imageFallback: "bg-muted text-foreground/40",
    qty: "border-foreground/15 bg-background text-foreground",
    primaryButton: "bg-[#ff4ea3] text-white hover:opacity-90",
    barBg: "bg-card",
    barText: "text-[#231717]",
    // Sunshine's muted text (oklch 0.5 0.12 350), 10% darker.
    barSoft: "text-[oklch(0.45_0.12_350)]",
    divider: "border-[#ff4ea3]",
  },
  men: {
    shell: "bg-[#111111]",
    listArea: "bg-[color-mix(in_oklch,#111111_70%,white)]",
    itemText: "text-[#231717]",
    shellBorder: "border-[#f2e9e1]/10",
    shellText: "text-[#f2e9e1]",
    shellSoftText: "text-[#f2e9e1]/66",
    surface: "bg-white",
    surfaceBorder: "!border-2 border-[#8f2015]",
    imageBorder: "border-[#231717]/10",
    imageFallback: "bg-[#f3eee8] text-[#231717]/40",
    // -1+ pill (owner, 2026-11-18): the product area's lightened color, a
    // darker outline of it, text in the subtotal amount's color.
    qty: "border-[oklch(0.32_0_0)] bg-[color-mix(in_oklch,#111111_70%,white)] text-[#f2e9e1]",
    // "Enviar solicitud" already has Men's red.
    primaryButton: "bg-[#8f2015] text-[#fff7f2] hover:opacity-90",
    barBg: "",
    barText: "",
    barSoft: "text-[#f2e9e1]/66",
    divider: "border-[#8f2015]",
  },
};

export function CartDrawer({ theme = "store" }: { theme?: CartDrawerTheme }) {
  const cart = useCart();
  const navigate = useNavigate();
  const palette = CART_DRAWER_THEME[theme];

  useEffect(() => {
    if (!cart.open) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [cart.open]);

  return (
    <>
      {cart.open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={() => cart.setOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[calc(100%-1rem)] max-w-[400px] flex-col border-l shadow-2xl transition-transform duration-300 sm:w-[400px] ${palette.shellBorder} ${palette.shell} ${palette.shellText} ${
          cart.open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className={`flex items-center justify-between px-4 py-3.5 ${theme === "store" ? "border-b" : "border-b-2"} ${palette.divider} ${palette.barBg} ${palette.barText}`}
        >
          <div>
            <span className="brand-wordmark font-display text-lg uppercase">TU CARRITO</span>
          </div>
          <button
            onClick={() => cart.setOpen(false)}
            className={`rounded-full p-1.5 transition ${palette.barSoft} hover:bg-white/8 hover:text-current`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto px-4 py-3 ${palette.listArea}`}>
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
              <StorePineapple theme={theme} className="h-16 w-auto object-contain" />
              <p
                className="w-full text-center font-display text-lg uppercase"
                style={{ transform: "none", transformOrigin: "center" }}
              >
                TU CARRITO ESTA VACIO
              </p>
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
              {cart.lines.map((line) => {
                const availability = cart.getLineAvailability(line);
                return (
                  <div
                    key={line.id}
                    className={`flex gap-4 rounded-xl border p-2.5 ${palette.surfaceBorder} ${palette.surface} ${palette.itemText} ${
                      availability.available ? "" : "grayscale opacity-55"
                    }`}
                  >
                  {line.image ? (
                    <img
                      src={line.image.url}
                      alt={line.image.altText ?? line.productTitle}
                      loading="lazy"
                      decoding="async"
                      className={`h-18 w-18 shrink-0 self-start border object-cover ${palette.imageBorder}`}
                      style={{ width: "4.5rem" }}
                    />
                  ) : (
                    <div
                      className={`flex h-18 w-18 shrink-0 self-start items-center justify-center border text-base ${palette.imageBorder} ${palette.imageFallback}`}
                      style={{ width: "4.5rem" }}
                    >
                      <span className="font-display">
                        {line.productTitle.split(" ").slice(0, 2).map((word) => word[0]?.toUpperCase()).join("")}
                      </span>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-normal">{line.productTitle}</p>
                    {line.selectedOptions.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {line.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}
                      </p>
                    )}
                    {!availability.available ? (
                      <p className="mt-1 text-xs font-bold text-[#9a233d]">
                        {availability.reason === "insufficient_stock"
                          ? `Solo quedan ${availability.availableQuantity} · Reduce la cantidad`
                          : availability.reason === "deleted"
                            ? "Ya no existe · Quitalo antes de continuar"
                            : "Fuera de stock · Quitalo antes de continuar"}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`ui-quantity-pill flex items-center overflow-hidden border ${palette.qty}`}>
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
                          disabled={!availability.available || availability.availableQuantity <= line.quantity}
                          className="px-2.5 py-1 opacity-80 transition hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      {availability.available ? (
                        <span className="text-sm">
                          {formatPrice(availability.currentPrice * line.quantity, line.currencyCode)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    onClick={() => void cart.remove(line.id)}
                    className="self-start p-1 text-muted-foreground/60 transition hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.lines.length > 0 && (
          <div
            className={`space-y-3 px-4 py-4 ${theme === "store" ? "border-t" : "border-t-2"} ${palette.divider} ${palette.barBg} ${palette.barText}`}
          >
            {cart.hasUnavailableLines ? (
              <p className="border border-[color:var(--t-ink-strong)] bg-[color:var(--t-ink-strong)]/10 p-2 text-xs font-bold text-current">
                Quita los productos fuera de stock antes de enviar la solicitud.
              </p>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span className={palette.barSoft}>Subtotal</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <button
              type="button"
              disabled={cart.loading}
              onClick={() => {
                void cart.refreshAvailability().then((available) => {
                  if (!available) {
                    toast.error("Hay productos sin stock en tu carrito. Revísalo antes de continuar.", { id: "cart-stock" });
                  }
                  cart.setOpen(false);
                  void navigate({ to: available ? "/solicitud" : "/carrito" });
                });
              }}
              className={`block w-full rounded-full py-3 text-center text-sm font-bold uppercase tracking-wider disabled:cursor-wait disabled:opacity-60 ${palette.primaryButton}`}
            >
              {cart.loading
                ? "Verificando stock..."
                : cart.hasUnavailableLines
                  ? "Revisar carrito"
                  : "Enviar solicitud"}
            </button>
            <button
              onClick={() => cart.setOpen(false)}
              className={`block w-full rounded-full py-2 text-center text-xs font-semibold transition hover:text-current ${palette.barSoft}`}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
