import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useCatalogProducts } from "@/context/catalog";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { getStorefrontSettings } from "@/lib/admin-content";
import { submitManualOrder } from "@/lib/manual-orders";
import { validateBirthdayCoupon } from "@/lib/public-forms";

export const Route = createFileRoute("/solicitud")({
  ssr: false,
  loader: async () => ({
    settings: await getStorefrontSettings(),
  }),
  head: () => ({ meta: [{ title: "Completar pedido - Pulpiña RD" }] }),
  component: InquiryPage,
});

function InquiryPage() {
  const cart = useCart();
  const products = useCatalogProducts();
  const navigate = useNavigate();
  const router = useRouter();
  const { settings } = Route.useLoaderData();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery">("pickup");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileVersion, setTurnstileVersion] = useState(0);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountStatus, setDiscountStatus] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<null | {
    emailState: {
      configured: boolean;
      customerSent: boolean;
      teamSent: boolean;
    };
    message: string;
    order: {
      createdAt: string;
      customerName: string;
      fulfillmentMethod: "pickup" | "delivery";
      lines: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        variantId: string;
        variantLabel: string;
      }>;
      requestNumber: string;
      subtotal: number;
      discount: number;
      shipping: number;
      shippingAddress: {
        line1: string;
        city: string;
        province: string;
      };
      summary: string;
      total: number;
    };
  }>(null);

  const shipping = 0;
  const total = Math.max(0, cart.subtotal - appliedDiscount);
  const whatsappHref = createdOrder
    ? `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
        `Hola, quiero completar el pedido ${createdOrder.order.requestNumber}.`,
      )}`
    : `https://wa.me/${settings.whatsappNumber}`;

  useEffect(() => {
    if (cart.lines.length === 0 || createdOrder) return;
    void cart.refreshAvailability().then((available) => {
      if (!available) void navigate({ to: "/carrito", replace: true });
    });
  }, [cart.lines.length, cart.refreshAvailability, createdOrder, navigate]);

  useEffect(() => {
    if (!createdOrder) return;
    const timeout = window.setTimeout(() => {
      void navigate({ to: "/", replace: true });
    }, 1500);
    return () => window.clearTimeout(timeout);
  }, [createdOrder, navigate]);

  const summaryCards = useMemo(
    () =>
      cart.lines.map((line) => {
        const product =
          products.find((entry) => entry.variants.some((variant) => variant.id === line.merchandiseId)) ??
          products.find((entry) => entry.slug === line.productHandle);
        const variant = product?.variants.find((entry) => entry.id === line.merchandiseId) ?? null;
        const availability = cart.getLineAvailability(line);

        return {
          id: line.id,
          image: line.image ?? variant?.image ?? product?.featuredImage ?? null,
          options: line.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · "),
          quantity: line.quantity,
          title: line.productTitle,
          total: availability.currentPrice * line.quantity,
        };
      }),
    [cart, products],
  );

  if (createdOrder) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="rounded-3xl border border-foreground/15 bg-card p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Pedido creado
          </div>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl">
            Tu numero de orden es {createdOrder.order.requestNumber}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Ya registramos tu pedido. Ahora solo tienes que escribirnos por WhatsApp y enviarnos ese numero para confirmar disponibilidad y entrega.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_264px]">
            <div className="rounded-2xl border border-foreground/10 bg-background p-4">
              <p className="text-sm font-bold">Resumen del pedido</p>
              <div className="mt-4 grid gap-3">
                {createdOrder.order.lines.map((line) => {
                  const product = products.find((entry) => entry.id === line.productId);
                  const variant = product?.variants.find((entry) => entry.id === line.variantId);
                  const image = variant?.image ?? product?.featuredImage ?? null;

                  return (
                    <div key={`${line.variantId}-${line.quantity}`} className="rounded-2xl border border-foreground/10 bg-card p-3">
                      <div className="flex items-stretch gap-6">
                        {image ? (
                          <div className="w-20 shrink-0 self-stretch overflow-hidden">
                            <img
                              src={image.url}
                              alt={image.altText ?? line.productName}
                              className="h-full min-h-20 w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex min-h-20 w-20 shrink-0 self-stretch items-center justify-center bg-muted text-xl">
                            <span className="font-display">{line.productName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold leading-tight">{line.productName}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{line.variantLabel}</div>
                            <div className="mt-2 text-xs text-muted-foreground">Cantidad: {line.quantity}</div>
                          </div>
                          <div className="text-right font-bold">{formatPrice(line.unitPrice * line.quantity)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid gap-1 border-t border-foreground/10 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Entrega</span>
                  <span>{createdOrder.order.fulfillmentMethod === "delivery" ? "Delivery" : "Recoger"}</span>
                </div>
                {createdOrder.order.fulfillmentMethod === "delivery" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Delivery</span>
                      <span>Se confirma luego</span>
                    </div>
                    <div>{createdOrder.order.shippingAddress.line1}</div>
                    <div>
                      {createdOrder.order.shippingAddress.city}, {createdOrder.order.shippingAddress.province}
                    </div>
                  </>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-foreground/10 pt-2">
                  <span>Subtotal original</span>
                  <span>{formatPrice(createdOrder.order.subtotal)}</span>
                </div>
                {createdOrder.order.discount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Descuento</span>
                    <span>-{formatPrice(createdOrder.order.discount)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>Total final</span>
                  <span>{formatPrice(createdOrder.order.total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-foreground/10 bg-muted/30 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Siguiente paso
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Envianos el numero <strong>{createdOrder.order.requestNumber}</strong> por WhatsApp para terminar la compra.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold uppercase tracking-wider text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Enviar por WhatsApp
                </a>
                <Link
                  to="/tienda"
                  className="inline-flex items-center justify-center rounded-full border border-foreground/20 px-5 py-3 text-sm font-bold uppercase tracking-wider"
                >
                  Volver a la tienda
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-foreground/10 bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            <p>{createdOrder.message}</p>
            {!createdOrder.emailState.configured ? (
              <p className="mt-2">
                El pedido ya quedo guardado igual. Los correos automaticos se activan cuando conectes el proveedor de email.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (cart.lines.length > 0 && cart.hasUnavailableLines) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-[#c5475f]" />
        <h1 className="mt-4 font-body text-3xl font-bold">Revisa tu carrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hay productos agotados o eliminados. No se pueden incluir en la solicitud.
        </p>
        <Link to="/carrito" className="mt-6 inline-block bg-foreground px-6 py-3 text-sm font-bold uppercase text-background">
          Volver al carrito
        </Link>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl">Carrito vacio</h1>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos antes de crear un pedido.</p>
        <Link
          to="/tienda"
          className="mt-6 inline-block rounded-xl bg-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider text-background"
        >
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link to="/carrito" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al carrito
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_404px]">
        <section className="flex self-start flex-col rounded-3xl border border-foreground/15 bg-card p-5 sm:p-6 lg:sticky lg:top-24">
          <h1 className="font-body text-3xl font-bold sm:text-4xl" style={{ transform: "none" }}>Genera tu numero de orden</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Este sitio no procesa pagos dentro de la app. Completa este paso para crear tu pedido y luego escribenos por WhatsApp con el numero PUL para terminar la compra.
          </p>

          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const inventoryAvailable = await cart.refreshAvailability();
              if (!inventoryAvailable) {
                await navigate({ to: "/carrito", replace: true });
                return;
              }
              setSubmitting(true);
              setStatus("");

              void submitManualOrder({
                data: {
                  customerEmail,
                  customerName,
                  customerPhone,
                  discountCode: appliedDiscountCode,
                  fulfillmentMethod,
                  lines: cart.lines.map((line) => ({
                    quantity: line.quantity,
                    variantId: line.merchandiseId,
                  })),
                  notes,
                  shipping,
                  shippingAddress:
                    fulfillmentMethod === "delivery"
                      ? {
                          line1: addressLine1,
                          city: addressCity,
                          province: addressProvince,
                        }
                      : {
                          line1: "",
                          city: "",
                          province: "",
                        },
                  turnstileToken,
                },
              })
                .then(async (result) => {
                  setStatus(result.message);
                  if (!result.ok) {
                    if (/stock|disponible|existe/i.test(result.message)) {
                      await router.invalidate();
                      await navigate({ to: "/carrito", replace: true });
                    }
                    return;
                  }

                  setCreatedOrder(result);
                  setCustomerEmail("");
                  setCustomerName("");
                  setCustomerPhone("");
                  setAddressLine1("");
                  setAddressCity("");
                  setAddressProvince("");
                  setNotes("");
                  setDiscountCode("");
                  setAppliedDiscountCode("");
                  setAppliedDiscount(0);
                  setDiscountStatus("");
                  setTurnstileToken("");
                  cart.clear();
                })
                .catch(() => {
                  setStatus("No se pudo crear el pedido ahora mismo.");
                })
                .finally(() => {
                  setSubmitting(false);
                  setTurnstileVersion((value) => value + 1);
                });
            }}
            className="mt-6 flex flex-1 flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                value={customerName}
                placeholder="Tu nombre"
                className="w-full rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                required
                type="email"
                value={customerEmail}
                placeholder="Tu correo"
                className="w-full rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
                onChange={(event) => {
                  setCustomerEmail(event.target.value);
                  setAppliedDiscountCode("");
                  setAppliedDiscount(0);
                  setDiscountStatus("");
                }}
              />
            </div>

            <input
              required
              value={customerPhone}
              placeholder="Tu WhatsApp o telefono"
              className="w-full rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
              onChange={(event) => setCustomerPhone(event.target.value)}
            />

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                value={discountCode}
                placeholder="Código de descuento"
                className="w-full rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 uppercase text-[#231717] caret-[#231717] placeholder:normal-case placeholder:text-[#7c665f]"
                onChange={(event) => {
                  setDiscountCode(event.target.value.toUpperCase());
                  setAppliedDiscountCode("");
                  setAppliedDiscount(0);
                  setDiscountStatus("");
                }}
              />
              <button
                type="button"
                disabled={applyingDiscount || !discountCode.trim() || !customerEmail.trim()}
                className="border border-[#231717] bg-[#231717] px-5 py-3 text-sm font-bold uppercase text-[#fbf4e8] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => {
                  setApplyingDiscount(true);
                  void validateBirthdayCoupon({
                    data: { code: discountCode, email: customerEmail, subtotal: cart.subtotal },
                  })
                    .then((result) => {
                      setDiscountStatus(result.message);
                      if (result.ok) {
                        setAppliedDiscountCode(result.code);
                        setAppliedDiscount(result.discount);
                      }
                    })
                    .finally(() => setApplyingDiscount(false));
                }}
              >
                {applyingDiscount ? "Validando..." : "Aplicar"}
              </button>
            </div>
            {discountStatus ? <p className="text-sm text-muted-foreground">{discountStatus}</p> : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillmentMethod("pickup")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  fulfillmentMethod === "pickup"
                    ? "border-[#231717] bg-[#231717] text-[#fbf4e8]"
                    : "border-[#231717]/15 bg-[#fbf4e8] text-[#231717]"
                }`}
              >
                <div className="text-sm font-bold">Recoger</div>
                <div className={`mt-1 text-xs ${fulfillmentMethod === "pickup" ? "text-[#fbf4e8]/75" : "text-[#6b5a55]"}`}>
                  Sin costo adicional.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentMethod("delivery")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  fulfillmentMethod === "delivery"
                    ? "border-[#231717] bg-[#231717] text-[#fbf4e8]"
                    : "border-[#231717]/15 bg-[#fbf4e8] text-[#231717]"
                }`}
              >
                <div className="text-sm font-bold">Delivery</div>
                <div className={`mt-1 text-xs ${fulfillmentMethod === "delivery" ? "text-[#fbf4e8]/75" : "text-[#6b5a55]"}`}>
                  Agrega direccion. El monto se confirma luego.
                </div>
              </button>
            </div>

            {fulfillmentMethod === "delivery" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  required
                  value={addressLine1}
                  placeholder="Direccion"
                  className="rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f] sm:col-span-2"
                  onChange={(event) => setAddressLine1(event.target.value)}
                />
                <input
                  required
                  value={addressCity}
                  placeholder="Ciudad"
                  className="rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
                  onChange={(event) => setAddressCity(event.target.value)}
                />
                <input
                  required
                  value={addressProvince}
                  placeholder="Provincia"
                  className="rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
                  onChange={(event) => setAddressProvince(event.target.value)}
                />
              </div>
            ) : null}

            <textarea
              rows={4}
              value={notes}
              placeholder="Notas opcionales: horario, referencia, dudas de talla, etc."
              className="w-full rounded-2xl border border-[#231717]/15 bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f]"
              onChange={(event) => setNotes(event.target.value)}
            />

            <TurnstileWidget key={turnstileVersion} onTokenChange={setTurnstileToken} />
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            <button
              type="submit"
              disabled={submitting || cart.loading || !turnstileToken}
              className="mt-auto inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-bold uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creando pedido..." : cart.loading ? "Verificando stock..." : "Completar pedido"}
            </button>
          </form>
        </section>

        <aside className="rounded-3xl border border-foreground/15 bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <ShoppingBag className="h-4 w-4" /> Resumen del pedido
          </div>
          <div className="grid gap-3">
            {summaryCards.map((line) => (
              <div key={line.id} className="rounded-2xl border border-foreground/10 bg-background p-3">
                <div className="flex items-stretch gap-6">
                  {line.image ? (
                    <div className="h-24 w-24 shrink-0 overflow-hidden">
                      <img
                        src={line.image.url}
                        alt={line.image.altText ?? line.title}
                        className="h-full min-h-20 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl">
                      <span className="font-display">{line.title.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight">{line.title}</div>
                    {line.options ? <div className="mt-1 text-xs text-muted-foreground">{line.options}</div> : null}
                    <div className="mt-2 text-xs text-muted-foreground">Cantidad: {line.quantity}</div>
                    <div className="mt-2 font-bold">{formatPrice(line.total, cart.currencyCode)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 border-t border-foreground/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{fulfillmentMethod === "delivery" ? "Delivery" : "Recoger"}</span>
              <span>{fulfillmentMethod === "delivery" ? "Se confirma luego" : "Gratis"}</span>
            </div>
            {appliedDiscount > 0 ? (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Descuento {appliedDiscountCode}</span>
                <span>-{formatPrice(appliedDiscount, cart.currencyCode)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex justify-between border-t border-foreground/10 pt-3 font-body text-lg font-semibold">
            <span>Total</span>
            <span>{formatPrice(total, cart.currencyCode)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
