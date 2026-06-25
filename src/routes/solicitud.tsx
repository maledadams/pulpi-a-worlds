import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, MessageCircle, ShoppingBag } from "lucide-react";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useCatalogProducts } from "@/context/catalog";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { getStorefrontSettings } from "@/lib/admin-content";
import { submitManualOrder } from "@/lib/manual-orders";

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
  const total = cart.subtotal;
  const whatsappHref = createdOrder
    ? `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
        `Hola, quiero completar el pedido ${createdOrder.order.requestNumber}.`,
      )}`
    : `https://wa.me/${settings.whatsappNumber}`;

  const summaryCards = useMemo(
    () =>
      cart.lines.map((line) => {
        const product =
          products.find((entry) => entry.variants.some((variant) => variant.id === line.merchandiseId)) ??
          products.find((entry) => entry.slug === line.productHandle);
        const variant = product?.variants.find((entry) => entry.id === line.merchandiseId) ?? null;

        return {
          id: line.id,
          image: line.image ?? variant?.image ?? product?.featuredImage ?? null,
          options: line.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · "),
          quantity: line.quantity,
          title: line.productTitle,
          total: line.price * line.quantity,
        };
      }),
    [cart.lines, products],
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

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-2xl border border-foreground/10 bg-background p-4">
              <p className="text-sm font-bold">Resumen del pedido</p>
              <div className="mt-4 grid gap-3">
                {createdOrder.order.lines.map((line) => (
                  <div key={`${line.variantId}-${line.quantity}`} className="rounded-2xl border border-foreground/10 bg-card p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold leading-tight">{line.productName}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{line.variantLabel}</div>
                        <div className="mt-2 text-xs text-muted-foreground">Cantidad: {line.quantity}</div>
                      </div>
                      <div className="text-right font-bold">{formatPrice(line.unitPrice * line.quantity)}</div>
                    </div>
                  </div>
                ))}
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl border border-foreground/15 bg-card p-5 sm:p-6">
          <h1 className="font-display text-3xl sm:text-4xl">Genera tu numero de orden</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Este sitio no procesa pagos dentro de la app. Completa este paso para crear tu pedido y luego escribenos por WhatsApp con el numero PUL para terminar la compra.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitting(true);
              setStatus("");

              void submitManualOrder({
                data: {
                  customerEmail,
                  customerName,
                  customerPhone,
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
                .then((result) => {
                  setStatus(result.message);
                  if (!result.ok) return;

                  setCreatedOrder(result);
                  setCustomerEmail("");
                  setCustomerName("");
                  setCustomerPhone("");
                  setAddressLine1("");
                  setAddressCity("");
                  setAddressProvince("");
                  setNotes("");
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
            className="mt-6 grid gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                required
                value={customerName}
                placeholder="Tu nombre"
                className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3"
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <input
                required
                type="email"
                value={customerEmail}
                placeholder="Tu correo"
                className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3"
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>

            <input
              required
              value={customerPhone}
              placeholder="Tu WhatsApp o telefono"
              className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3"
              onChange={(event) => setCustomerPhone(event.target.value)}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFulfillmentMethod("pickup")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  fulfillmentMethod === "pickup"
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 bg-background"
                }`}
              >
                <div className="text-sm font-bold">Recoger</div>
                <div className={`mt-1 text-xs ${fulfillmentMethod === "pickup" ? "text-background/75" : "text-muted-foreground"}`}>
                  Sin costo adicional.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentMethod("delivery")}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  fulfillmentMethod === "delivery"
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/15 bg-background"
                }`}
              >
                <div className="text-sm font-bold">Delivery</div>
                <div className={`mt-1 text-xs ${fulfillmentMethod === "delivery" ? "text-background/75" : "text-muted-foreground"}`}>
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
                  className="rounded-2xl border border-foreground/15 bg-background px-4 py-3 sm:col-span-2"
                  onChange={(event) => setAddressLine1(event.target.value)}
                />
                <input
                  required
                  value={addressCity}
                  placeholder="Ciudad"
                  className="rounded-2xl border border-foreground/15 bg-background px-4 py-3"
                  onChange={(event) => setAddressCity(event.target.value)}
                />
                <input
                  required
                  value={addressProvince}
                  placeholder="Provincia"
                  className="rounded-2xl border border-foreground/15 bg-background px-4 py-3"
                  onChange={(event) => setAddressProvince(event.target.value)}
                />
              </div>
            ) : null}

            <textarea
              rows={4}
              value={notes}
              placeholder="Notas opcionales: horario, referencia, dudas de talla, etc."
              className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3"
              onChange={(event) => setNotes(event.target.value)}
            />

            <TurnstileWidget key={turnstileVersion} onTokenChange={setTurnstileToken} />
            {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
            <button
              type="submit"
              disabled={submitting || !turnstileToken}
              className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-bold uppercase tracking-wider text-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creando pedido..." : "Completar pedido"}
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
                <div className="flex gap-3">
                  {line.image ? (
                    <img
                      src={line.image.url}
                      alt={line.image.altText ?? line.title}
                      className="h-20 w-20 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted font-display text-xl">
                      {line.title.slice(0, 2).toUpperCase()}
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
          </div>

          <div className="mt-3 flex justify-between border-t border-foreground/10 pt-3 font-display text-lg">
            <span>Total</span>
            <span>{formatPrice(total, cart.currencyCode)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
