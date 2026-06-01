import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ChevronLeft,
  CreditCard,
  Lock,
  CheckCircle2,
  ShoppingBag,
  MapPin,
  MessageCircle,
  Edit2,
} from "lucide-react";
import { useCart } from "@/context/cart";
import { formatPrice } from "@/data/products";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Pulpiña RD" }] }),
  component: Checkout,
});

type Step = "shipping" | "review" | "payment" | "confirm";

type ShippingForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
};

type PayMethod = "azul" | "paypal";

type CardForm = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

const DR_PROVINCES = [
  "Azua","Baoruco","Barahona","Dajabón","Distrito Nacional","Duarte",
  "Elías Piña","El Seibo","Espaillat","Hato Mayor","Hermanas Mirabal",
  "Independencia","La Altagracia","La Romana","La Vega","María Trinidad Sánchez",
  "Monseñor Nouel","Monte Cristi","Monte Plata","Pedernales","Peravia",
  "Puerto Plata","Samaná","San Cristóbal","San José de Ocoa","San Juan",
  "San Pedro de Macorís","Sánchez Ramírez","Santiago","Santiago Rodríguez",
  "Santo Domingo","Valverde",
];

const STEPS: { key: Step; label: string }[] = [
  { key: "shipping", label: "Envío" },
  { key: "review", label: "Resumen" },
  { key: "payment", label: "Pago" },
  { key: "confirm", label: "Confirmación" },
];

const inputCls =
  "w-full rounded-xl border border-foreground/20 bg-background px-4 py-3 text-sm transition-colors focus:border-foreground focus:outline-none";

/* ── Step progress bar ─────────────────────────── */
function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-colors ${
                  done
                    ? "bg-foreground text-background"
                    : active
                      ? "border-2 border-foreground bg-background text-foreground"
                      : "border border-foreground/20 text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  active ? "text-foreground" : done ? "text-foreground/50" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 h-px w-8 sm:w-14 ${done ? "bg-foreground" : "bg-foreground/15"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field wrapper ──────────────────────────────── */
function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Order sidebar ──────────────────────────────── */
function OrderSidebar({
  cart,
  shipping,
}: {
  cart: ReturnType<typeof useCart>;
  shipping?: ShippingForm;
}) {
  return (
    <aside className="rounded-xl border border-foreground/15 bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        <ShoppingBag className="h-4 w-4" /> Pedido
      </div>
      <ul className="divide-y divide-foreground/8 text-sm">
        {cart.lines.map((l) => (
          <li key={l.id} className="flex justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="font-semibold leading-tight">{l.productTitle}</div>
              {l.selectedOptions.length > 0 && (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {l.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                </div>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">× {l.quantity}</div>
            </div>
            <span className="shrink-0 font-bold">
              {formatPrice(l.price * l.quantity, l.currencyCode)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-1 border-t border-foreground/10 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Envío</span>
          <span className="text-muted-foreground">Por confirmar</span>
        </div>
      </div>
      <div className="mt-3 flex justify-between border-t border-foreground/10 pt-3 font-display text-lg">
        <span>Total</span>
        <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
      </div>
      {shipping?.firstName && (
        <div className="mt-4 rounded-lg border border-foreground/10 bg-muted/40 p-3 text-xs">
          <div className="mb-1 flex items-center gap-1 font-bold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3" /> Entrega
          </div>
          <div className="font-semibold">
            {shipping.firstName} {shipping.lastName}
          </div>
          <div className="text-muted-foreground">{shipping.line1}</div>
          <div className="text-muted-foreground">
            {shipping.city}, {shipping.province}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── STEP 1: Shipping ───────────────────────────── */
function ShippingStep({
  form,
  onChange,
  onNext,
}: {
  form: ShippingForm;
  onChange: (k: keyof ShippingForm, v: string) => void;
  onNext: () => void;
}) {
  const f = (k: keyof ShippingForm) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange(k, e.target.value),
  });

  const ok =
    form.firstName.trim() && form.lastName.trim() && form.email.trim() &&
    form.phone.trim() && form.line1.trim() && form.city.trim() && form.province;

  return (
    <div className="grid gap-5">
      <section className="rounded-xl border border-foreground/15 bg-card p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Información de contacto
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre"><input className={inputCls} placeholder="María" {...f("firstName")} /></Field>
          <Field label="Apellido"><input className={inputCls} placeholder="Rodríguez" {...f("lastName")} /></Field>
          <Field label="Correo electrónico" full>
            <input className={inputCls} type="email" placeholder="tu@correo.com" {...f("email")} />
          </Field>
          <Field label="Teléfono" full>
            <input className={inputCls} type="tel" placeholder="809-000-0000" {...f("phone")} />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-foreground/15 bg-card p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Dirección de envío
        </p>
        <div className="grid gap-3">
          <Field label="Dirección" full>
            <input className={inputCls} placeholder="Calle, número, sector" {...f("line1")} />
          </Field>
          <Field label="Apartamento / Referencia (opcional)" full>
            <input className={inputCls} placeholder="Apto., Torre, Edificio..." {...f("line2")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Ciudad">
              <input className={inputCls} placeholder="Santo Domingo" {...f("city")} />
            </Field>
            <Field label="Provincia">
              <select className={inputCls} {...f("province")}>
                <option value="">Seleccionar...</option>
                {DR_PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </section>

      <button
        onClick={onNext}
        disabled={!ok}
        className="w-full rounded-xl bg-foreground py-3.5 text-sm font-bold uppercase tracking-wider text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continuar al resumen →
      </button>
    </div>
  );
}

/* ── STEP 2: Order Review ───────────────────────── */
function ReviewStep({
  cart,
  shipping,
  onNext,
  onEdit,
}: {
  cart: ReturnType<typeof useCart>;
  shipping: ShippingForm;
  onNext: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="grid gap-5">
      {/* Address block */}
      <section className="rounded-xl border border-foreground/15 bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Dirección de entrega
            </p>
            <p className="font-semibold">
              {shipping.firstName} {shipping.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {shipping.line1}
              {shipping.line2 ? `, ${shipping.line2}` : ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {shipping.city}, {shipping.province}
            </p>
            <p className="text-sm text-muted-foreground">{shipping.phone}</p>
            <p className="text-sm text-muted-foreground">{shipping.email}</p>
          </div>
          <button
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-foreground/20 px-3 py-1.5 text-xs font-bold hover:bg-muted"
          >
            <Edit2 className="h-3 w-3" /> Editar
          </button>
        </div>
      </section>

      {/* Cart items */}
      <section className="rounded-xl border border-foreground/15 bg-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Artículos ({cart.lines.length})
        </p>
        <ul className="divide-y divide-foreground/8 text-sm">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-start gap-3 py-3">
              {l.image ? (
                <img
                  src={l.image.url}
                  alt={l.productTitle}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted font-display text-lg text-foreground/50">
                  {l.productTitle.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.productTitle}</div>
                {l.selectedOptions.length > 0 && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}
                  </div>
                )}
                <div className="mt-0.5 text-xs text-muted-foreground">× {l.quantity}</div>
              </div>
              <span className="shrink-0 font-bold">
                {formatPrice(l.price * l.quantity, l.currencyCode)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-foreground/10 pt-3 font-display text-lg">
          <span>Total</span>
          <span>{formatPrice(cart.subtotal, cart.currencyCode)}</span>
        </div>
      </section>

      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 rounded-xl border border-foreground/20 px-5 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <button
          onClick={onNext}
          className="flex-1 rounded-xl bg-foreground py-3.5 text-sm font-bold uppercase tracking-wider text-background hover:opacity-90"
        >
          Continuar al pago →
        </button>
      </div>
    </div>
  );
}

/* ── STEP 3: Payment ────────────────────────────── */
function PaymentStep({
  cart,
  payMethod,
  onMethodChange,
  onPay,
  onBack,
  loading,
}: {
  cart: ReturnType<typeof useCart>;
  payMethod: PayMethod;
  onMethodChange: (m: PayMethod) => void;
  onPay: () => void;
  onBack: () => void;
  loading: boolean;
}) {
  const [card, setCard] = useState<CardForm>({ number: "", name: "", expiry: "", cvv: "" });

  const fmt4 = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v: string) =>
    v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

  const cardReady =
    card.number.replace(/\s/g, "").length >= 15 &&
    card.name.trim().length > 3 &&
    card.expiry.length === 5 &&
    card.cvv.length >= 3;

  const canPay = payMethod === "paypal" ? true : cardReady;

  return (
    <div className="grid gap-5">
      {/* Payment method tabs */}
      <section className="rounded-xl border border-foreground/15 bg-card p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Método de pago
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* AZUL */}
          <button
            type="button"
            onClick={() => onMethodChange("azul")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-bold transition-colors ${
              payMethod === "azul"
                ? "border-foreground bg-foreground/5"
                : "border-foreground/15 hover:border-foreground/40"
            }`}
          >
            <span className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-background">
              AZUL
            </span>
            <span className="text-xs text-muted-foreground">Tarjeta de crédito</span>
          </button>

          {/* PayPal */}
          <button
            type="button"
            onClick={() => onMethodChange("paypal")}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-bold transition-colors ${
              payMethod === "paypal"
                ? "border-foreground bg-foreground/5"
                : "border-foreground/15 hover:border-foreground/40"
            }`}
          >
            <span className="rounded-md bg-[#003087] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
              Pay<span className="text-[#009cde]">Pal</span>
            </span>
            <span className="text-xs text-muted-foreground">Cuenta PayPal</span>
          </button>
        </div>
      </section>

      {/* AZUL card form */}
      {payMethod === "azul" && (
        <section className="rounded-xl border border-foreground/15 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Datos de tarjeta
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" /> SSL cifrado
            </span>
          </div>
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-md bg-foreground px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-background">
              AZUL
            </span>
            <span className="text-[11px] text-muted-foreground">
              Procesado por AZUL · Banco Popular Dominicano
            </span>
          </div>
          <div className="grid gap-3">
            <Field label="Número de tarjeta" full>
              <input
                className={inputCls}
                placeholder="0000 0000 0000 0000"
                value={card.number}
                maxLength={19}
                onChange={(e) => setCard({ ...card, number: fmt4(e.target.value) })}
              />
            </Field>
            <Field label="Nombre en la tarjeta" full>
              <input
                className={inputCls}
                placeholder="NOMBRE APELLIDO"
                value={card.name}
                onChange={(e) => setCard({ ...card, name: e.target.value.toUpperCase() })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Vencimiento MM/AA">
                <input
                  className={inputCls}
                  placeholder="08/27"
                  value={card.expiry}
                  maxLength={5}
                  onChange={(e) => setCard({ ...card, expiry: fmtExp(e.target.value) })}
                />
              </Field>
              <Field label="CVV">
                <input
                  className={inputCls}
                  type="password"
                  placeholder="•••"
                  maxLength={4}
                  value={card.cvv}
                  onChange={(e) =>
                    setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })
                  }
                />
              </Field>
            </div>
          </div>
        </section>
      )}

      {/* PayPal info */}
      {payMethod === "paypal" && (
        <section className="rounded-xl border border-foreground/15 bg-card p-5">
          <p className="mb-2 text-sm font-semibold">Pago con PayPal</p>
          <p className="text-sm text-muted-foreground">
            Al confirmar, te redirigiremos a PayPal para completar el pago de forma segura.
            Una vez aprobado, el pedido se confirmará automáticamente.
          </p>
          <div className="mt-3 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            Correo PayPal: <strong className="text-foreground">payments@pulpina.do</strong>
          </div>
        </section>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-foreground/20 px-5 py-3.5 text-sm font-bold uppercase tracking-wider hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <button
          onClick={onPay}
          disabled={!canPay || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-sm font-bold uppercase tracking-wider text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CreditCard className="h-4 w-4" />
          {loading
            ? "Procesando..."
            : `Pagar ${formatPrice(cart.subtotal, cart.currencyCode)}`}
        </button>
      </div>
    </div>
  );
}

/* ── STEP 4: Confirmation ───────────────────────── */
function ConfirmStep({
  shipping,
  payMethod,
}: {
  shipping: ShippingForm;
  payMethod: PayMethod;
}) {
  const orderNum = `PUL-${Math.floor(1000 + Math.random() * 9000)}`;
  const methodLabel = payMethod === "azul" ? "AZUL — Tarjeta" : "PayPal";

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-foreground text-background">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="mt-4 font-display text-3xl">¡Pedido confirmado!</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Número de pedido: <strong className="text-foreground">{orderNum}</strong>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Confirmación enviada a <strong>{shipping.email}</strong>
      </p>

      {/* Summary card */}
      <div className="mx-auto mt-7 rounded-xl border border-foreground/15 bg-card p-5 text-left text-sm">
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Envío a
          </p>
          <p className="mt-1 font-semibold">
            {shipping.firstName} {shipping.lastName}
          </p>
          <p className="text-muted-foreground">
            {shipping.line1}, {shipping.city}, {shipping.province}
          </p>
        </div>
        <div className="border-t border-foreground/10 pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pago</p>
          <p className="mt-1 font-semibold">{methodLabel}</p>
        </div>
      </div>

      {/* WhatsApp contact */}
      <div className="mx-auto mt-5 rounded-xl border border-foreground/15 bg-muted/30 p-5 text-left">
        <div className="flex items-start gap-3">
          <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm">
            <p className="font-bold">¿Necesitas ayuda con tu pedido?</p>
            <p className="mt-1 text-muted-foreground">
              Para más información, seguimiento o cualquier consulta, contáctanos directamente.
            </p>
            <a
              href="https://wa.me/18095550199"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp: +1 (809) 555-0199
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          to="/tienda"
          className="rounded-xl bg-foreground px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-background hover:opacity-90"
        >
          Seguir comprando
        </Link>
        <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}

/* ── Root component ─────────────────────────────── */
function Checkout() {
  const cart = useCart();
  const [step, setStep] = useState<Step>("shipping");
  const [shipping, setShipping] = useState<ShippingForm>({
    firstName: "", lastName: "", email: "", phone: "",
    line1: "", line2: "", city: "", province: "",
  });
  const [payMethod, setPayMethod] = useState<PayMethod>("azul");
  const [loading, setLoading] = useState(false);

  const update = (k: keyof ShippingForm, v: string) =>
    setShipping((p) => ({ ...p, [k]: v }));

  const handlePay = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("confirm");
      cart.clear();
    }, 1400);
  };

  if (cart.lines.length === 0 && step !== "confirm") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShoppingBag className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-3xl">Carrito vacío</h1>
        <p className="mt-2 text-sm text-muted-foreground">Agrega productos antes de continuar.</p>
        <Link to="/tienda" className="mt-6 inline-block rounded-xl bg-foreground px-6 py-3 text-sm font-bold uppercase tracking-wider text-background">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link to="/carrito" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-3.5 w-3.5" /> Volver al carrito
      </Link>

      <h1 className="mb-6 font-display text-2xl md:text-3xl">Checkout</h1>

      <div className="mb-8 flex justify-center">
        <StepBar current={step} />
      </div>

      {step === "confirm" ? (
        <ConfirmStep shipping={shipping} payMethod={payMethod} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div>
            {step === "shipping" && (
              <ShippingStep form={shipping} onChange={update} onNext={() => setStep("review")} />
            )}
            {step === "review" && (
              <ReviewStep
                cart={cart}
                shipping={shipping}
                onNext={() => setStep("payment")}
                onEdit={() => setStep("shipping")}
              />
            )}
            {step === "payment" && (
              <PaymentStep
                cart={cart}
                payMethod={payMethod}
                onMethodChange={setPayMethod}
                onPay={handlePay}
                onBack={() => setStep("review")}
                loading={loading}
              />
            )}
          </div>
          <OrderSidebar
            cart={cart}
            shipping={step !== "shipping" ? shipping : undefined}
          />
        </div>
      )}
    </div>
  );
}
