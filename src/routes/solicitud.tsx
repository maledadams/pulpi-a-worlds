import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ShoppingBag } from "lucide-react";
import { TurnstileWidget } from "@/components/forms/TurnstileWidget";
import { useCatalogProducts } from "@/context/catalog";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";
import { submitManualOrder } from "@/lib/manual-orders";
import { validateDiscountCode } from "@/lib/public-forms";
import { createSeoHead } from "@/lib/seo";
import { useScrollFollow } from "@/hooks/use-scroll-follow";

const DOMINICAN_PROVINCES = [
  "Distrito Nacional",
  "Azua",
  "Bahoruco",
  "Barahona",
  "Dajabón",
  "Duarte",
  "Elías Piña",
  "El Seibo",
  "Espaillat",
  "Hato Mayor",
  "Hermanas Mirabal",
  "Independencia",
  "La Altagracia",
  "La Romana",
  "La Vega",
  "María Trinidad Sánchez",
  "Monseñor Nouel",
  "Monte Cristi",
  "Monte Plata",
  "Pedernales",
  "Peravia",
  "Puerto Plata",
  "Samaná",
  "San Cristóbal",
  "San José de Ocoa",
  "San Juan",
  "San Pedro de Macorís",
  "Sánchez Ramírez",
  "Santiago",
  "Santiago Rodríguez",
  "Santo Domingo",
  "Valverde",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderFieldErrors = Partial<
  Record<"customerName" | "customerEmail" | "customerPhone" | "addressLine1" | "addressCity" | "addressProvince", string>
>;

function formatPhoneInput(raw: string, previous: string) {
  let digits = raw.replace(/\D/g, "").slice(0, 10);

  // Backspacing right after a boundary (3rd/6th digit) only deletes the
  // auto-inserted ")" or "-" rather than a digit, since the digit count
  // is unchanged; drop the trailing digit ourselves so backspace always
  // makes progress instead of getting stuck re-adding the same punctuation.
  const previousDigits = previous.replace(/\D/g, "");
  const isDeleting = raw.length < previous.length;
  if (isDeleting && digits.length === previousDigits.length && digits.length > 0) {
    digits = digits.slice(0, -1);
  }

  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  let formatted = "";
  if (area) formatted += `(${area}`;
  if (area.length === 3) formatted += ")";
  if (mid) formatted += ` ${mid}`;
  if (last) formatted += `-${last}`;
  return formatted;
}

export const Route = createFileRoute("/solicitud")({
  ssr: false,
  head: () => createSeoHead({ pageName: "Completar pedido", path: "/solicitud", noIndex: true }),
  component: InquiryPage,
});

function InquiryPage() {
  const cart = useCart();
  const products = useCatalogProducts();
  const navigate = useNavigate();
  const router = useRouter();
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
  const [appliedDiscountToken, setAppliedDiscountToken] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountStatus, setDiscountStatus] = useState("");
  const [discountOk, setDiscountOk] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const orderFormFollower = useScrollFollow(1024);
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

  function validateOrderForm(): OrderFieldErrors {
    const errors: OrderFieldErrors = {};

    if (customerName.trim().length < 2) {
      errors.customerName = "Escribe tu nombre completo.";
    }

    if (!EMAIL_PATTERN.test(customerEmail.trim())) {
      errors.customerEmail = "Escribe un correo válido (ejemplo: nombre@correo.com).";
    }

    if (customerPhone.replace(/\D/g, "").length !== 10) {
      errors.customerPhone = "Escribe un número de teléfono válido de 10 dígitos.";
    }

    if (fulfillmentMethod === "delivery") {
      if (!addressLine1.trim()) {
        errors.addressLine1 = "Escribe tu dirección.";
      }
      if (!addressCity.trim()) {
        errors.addressCity = "Escribe tu ciudad.";
      }
      if (!addressProvince.trim()) {
        errors.addressProvince = "Selecciona tu provincia.";
      }
    }

    return errors;
  }

  useEffect(() => {
    if (cart.lines.length === 0 || createdOrder) return;
    void cart.refreshAvailability().then((available) => {
      if (!available) void navigate({ to: "/carrito", replace: true });
    });
  }, [cart.lines.length, cart.refreshAvailability, createdOrder, navigate]);

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
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-900">
              <CheckCircle2 className="h-4 w-4" />
              Pedido creado
            </div>
            <h1 className="mt-4 font-display text-3xl sm:text-4xl">
              Tu numero de orden es {createdOrder.order.requestNumber}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Ya registramos tu pedido. Revisa tu correo: ahi tienes el detalle y el boton para confirmar por WhatsApp.
            </p>
          </div>

          <div className="mt-6">
            <div className="rounded-2xl border border-foreground/10 bg-background p-4">
              <p className="text-sm font-bold">Resumen del pedido</p>
              <div className="mt-4 grid gap-3">
                {createdOrder.order.lines.map((line) => {
                  const product = products.find((entry) => entry.id === line.productId);
                  const variant = product?.variants.find((entry) => entry.id === line.variantId);
                  const image = variant?.image ?? product?.featuredImage ?? null;

                  return (
                    <div key={`${line.variantId}-${line.quantity}`} className="rounded-2xl border border-foreground/10 bg-card p-3">
                      <div className="flex items-start gap-4">
                        {image ? (
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-foreground/20">
                            <img
                              src={image.url}
                              alt={image.altText ?? line.productName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-foreground/20 bg-muted text-xl">
                            <span className="font-display">{line.productName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="leading-tight">{line.productName}</div>
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
              <div className="mt-4 border-t border-foreground/10 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">
                    {createdOrder.order.fulfillmentMethod === "delivery" ? "Delivery" : "Recoger en tienda"}
                  </span>
                  {createdOrder.order.fulfillmentMethod === "delivery" ? (
                    <span className="text-xs text-muted-foreground">Costo: se confirma luego</span>
                  ) : null}
                </div>
                {createdOrder.order.fulfillmentMethod === "delivery" ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {createdOrder.order.shippingAddress.line1}, {createdOrder.order.shippingAddress.city},{" "}
                    {createdOrder.order.shippingAddress.province}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-1.5 border-t border-foreground/10 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrice(createdOrder.order.subtotal)}</span>
                </div>
                {createdOrder.order.discount > 0 ? (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Descuento</span>
                    <span>-{formatPrice(createdOrder.order.discount)}</span>
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-between border-t border-foreground/10 pt-2 text-base font-bold text-foreground">
                  <span>Total</span>
                  <span>{formatPrice(createdOrder.order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <Link
            to="/tienda"
            className="mt-5 flex w-full items-center justify-center rounded-full bg-foreground px-5 py-4 text-sm font-bold uppercase tracking-wider text-background"
          >
            Volver a la tienda
          </Link>
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
        <h1
          className="mt-4 w-full text-center font-display text-3xl"
          style={{ transform: "none", transformOrigin: "center" }}
        >
          Carrito vacio
        </h1>
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

      <div ref={orderFormFollower.containerRef} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_404px]">
        <section
          ref={orderFormFollower.floatingRef}
          className="flex self-start flex-col rounded-3xl border border-foreground/15 bg-card p-5 will-change-transform transition-transform duration-500 ease-out sm:p-6"
          style={{ transform: `translate3d(0, ${orderFormFollower.offset}px, 0)` }}
        >
          <h1 className="font-body text-3xl font-bold sm:text-4xl" style={{ transform: "none" }}>Genera tu numero de orden</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Este sitio no procesa pagos dentro de la app. Completa este paso para crear tu pedido y luego escribenos por WhatsApp con el numero PUL para terminar la compra.
          </p>

          <form
            noValidate
            onSubmit={async (event) => {
              event.preventDefault();
              const errors = validateOrderForm();
              setFieldErrors(errors);
              if (Object.keys(errors).length > 0) return;

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
                  discountToken: appliedDiscountToken,
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
                  setAppliedDiscountToken("");
                  setAppliedDiscount(0);
                  setDiscountStatus("");
                  setDiscountOk(false);
                  setFieldErrors({});
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
            <div className="grid gap-1 sm:grid-cols-2 sm:gap-4">
              <div>
                <input
                  value={customerName}
                  placeholder="Tu nombre"
                  className={`w-full rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f] ${
                    fieldErrors.customerName ? "border-red-500" : "border-[#231717]/15"
                  }`}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    if (fieldErrors.customerName) setFieldErrors((prev) => ({ ...prev, customerName: undefined }));
                  }}
                />
                {fieldErrors.customerName ? <p className="mt-1 text-xs text-red-600">{fieldErrors.customerName}</p> : null}
              </div>
              <div>
                <input
                  type="email"
                  value={customerEmail}
                  placeholder="Tu correo"
                  className={`w-full rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f] ${
                    fieldErrors.customerEmail ? "border-red-500" : "border-[#231717]/15"
                  }`}
                  onChange={(event) => {
                    setCustomerEmail(event.target.value);
                    if (fieldErrors.customerEmail) setFieldErrors((prev) => ({ ...prev, customerEmail: undefined }));
                    setAppliedDiscountCode("");
                    setAppliedDiscountToken("");
                    setAppliedDiscount(0);
                    setDiscountStatus("");
                    setDiscountOk(false);
                  }}
                />
                {fieldErrors.customerEmail ? <p className="mt-1 text-xs text-red-600">{fieldErrors.customerEmail}</p> : null}
              </div>
            </div>

            <div>
              <div
                className={`flex w-full items-center rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] ${
                  fieldErrors.customerPhone ? "border-red-500" : "border-[#231717]/15"
                }`}
              >
                <span className="mr-2 shrink-0 text-[#7c665f]">+1</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={customerPhone}
                  placeholder="(809) 000-0000"
                  className="w-full bg-transparent text-[#231717] caret-[#231717] placeholder:text-[#7c665f] focus:outline-none"
                  onChange={(event) => {
                    setCustomerPhone((previous) => formatPhoneInput(event.target.value, previous));
                    if (fieldErrors.customerPhone) setFieldErrors((prev) => ({ ...prev, customerPhone: undefined }));
                  }}
                />
              </div>
              {fieldErrors.customerPhone ? <p className="mt-1 text-xs text-red-600">{fieldErrors.customerPhone}</p> : null}
            </div>

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
                  setDiscountOk(false);
                }}
              />
              <button
                type="button"
                disabled={applyingDiscount || !discountCode.trim() || !customerEmail.trim()}
                className="border border-[#231717] bg-[#231717] px-5 py-3 text-sm font-bold uppercase text-[#fbf4e8] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => {
                  setApplyingDiscount(true);
                  let birthdayToken = "";
                  try {
                    const raw = localStorage.getItem("pulpina_birthday_token");
                    if (raw) {
                      const saved = JSON.parse(raw) as { email?: string; token?: string };
                      if (saved.email === customerEmail.trim().toLowerCase() && saved.token) {
                        birthdayToken = saved.token;
                      }
                    }
                  } catch {
                    // Ignore invalid local storage data.
                  }
                  void validateDiscountCode({
                    data: { code: discountCode, email: customerEmail, subtotal: cart.subtotal, token: birthdayToken },
                  })
                    .then((result) => {
                      setDiscountStatus(result.message);
                      setDiscountOk(result.ok);
                      if (result.ok) {
                        setAppliedDiscountCode(result.code);
                        setAppliedDiscountToken(birthdayToken);
                        setAppliedDiscount(result.discount);
                      }
                    })
                    .finally(() => setApplyingDiscount(false));
                }}
              >
                {applyingDiscount ? "Validando..." : "Aplicar"}
              </button>
            </div>
            {discountStatus ? (
              <p className={`text-sm ${discountOk ? "font-semibold text-emerald-700" : "text-muted-foreground"}`}>
                {discountStatus}
              </p>
            ) : null}

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
                <div className="sm:col-span-2">
                  <input
                    value={addressLine1}
                    placeholder="Calle, numero, sector o referencia (ej: Calle Duarte #45, apto 3B)"
                    className={`w-full rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f] ${
                      fieldErrors.addressLine1 ? "border-red-500" : "border-[#231717]/15"
                    }`}
                    onChange={(event) => {
                      setAddressLine1(event.target.value);
                      if (fieldErrors.addressLine1) setFieldErrors((prev) => ({ ...prev, addressLine1: undefined }));
                    }}
                  />
                  {fieldErrors.addressLine1 ? <p className="mt-1 text-xs text-red-600">{fieldErrors.addressLine1}</p> : null}
                </div>
                <div>
                  <input
                    value={addressCity}
                    placeholder="Ciudad"
                    className={`w-full rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] caret-[#231717] placeholder:text-[#7c665f] ${
                      fieldErrors.addressCity ? "border-red-500" : "border-[#231717]/15"
                    }`}
                    onChange={(event) => {
                      setAddressCity(event.target.value);
                      if (fieldErrors.addressCity) setFieldErrors((prev) => ({ ...prev, addressCity: undefined }));
                    }}
                  />
                  {fieldErrors.addressCity ? <p className="mt-1 text-xs text-red-600">{fieldErrors.addressCity}</p> : null}
                </div>
                <div>
                  <select
                    value={addressProvince}
                    className={`w-full rounded-2xl border bg-[#fbf4e8] px-4 py-3 text-[#231717] ${
                      addressProvince ? "" : "text-[#7c665f]"
                    } ${fieldErrors.addressProvince ? "border-red-500" : "border-[#231717]/15"}`}
                    onChange={(event) => {
                      setAddressProvince(event.target.value);
                      if (fieldErrors.addressProvince) setFieldErrors((prev) => ({ ...prev, addressProvince: undefined }));
                    }}
                  >
                    <option value="">Selecciona una provincia</option>
                    {DOMINICAN_PROVINCES.map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.addressProvince ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.addressProvince}</p>
                  ) : null}
                </div>
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
                    <div className="h-24 w-24 shrink-0 overflow-hidden border border-foreground/20">
                      <img
                        src={line.image.url}
                        alt={line.image.altText ?? line.title}
                        className="h-full min-h-20 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-foreground/20 bg-muted text-xl">
                      <span className="font-display">{line.title.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight">{line.title}</div>
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
