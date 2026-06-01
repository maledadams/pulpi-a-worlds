import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { OctopusMark, Star } from "@/components/ui/Decor";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import logoMen from "@/assets/logo-men.png";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";
import moodMen from "@/assets/mood-men.jpg";
import moodMoon from "@/assets/mood-moon.jpg";
import moodSun from "@/assets/mood-sunshine.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulpiña RD — Prendas de otro mundo" },
      {
        name: "description",
        content: "Tienda dominicana de moda alternativa. Vibes Moon, Sunshine y Men.",
      },
    ],
  }),
  component: Home,
});

const TICKER_ITEMS = [
  "Moon", "·", "Sunshine", "·", "Men", "·", "Tienda", "·", "New In", "·",
  "Moon", "·", "Sunshine", "·", "Men", "·", "Tienda", "·", "New In", "·",
  "Moon", "·", "Sunshine", "·", "Men", "·", "Tienda", "·", "New In", "·",
  "Moon", "·", "Sunshine", "·", "Men", "·", "Tienda", "·", "New In", "·",
];

const VIBES_EDITORIAL = [
  {
    to: "/moon" as const,
    name: "Moon",
    tag: "Romance Gótico",
    logo: logoMoon,
    mood: moodMoon,
    bg: "linear-gradient(160deg,#0a0408 0%,#2a0a14 60%,#5a0a14 100%)",
    cta: "Explorar Moon",
  },
  {
    to: "/sunshine" as const,
    name: "Sunshine",
    tag: "Kawaii · Y2K",
    logo: logoSun,
    mood: moodSun,
    bg: "linear-gradient(160deg,#ff8fc9 0%,#ffe66a 60%,#c5f56a 100%)",
    cta: "Explorar Sunshine",
  },
  {
    to: "/men" as const,
    name: "Men",
    tag: "Punk · Underground",
    logo: logoMen,
    mood: moodMen,
    bg: "linear-gradient(160deg,#0a0a0a 0%,#1a1a1a 60%,#3a0a0a 100%)",
    cta: "Explorar Men",
  },
] as const;

function SectionHeader({
  eyebrow,
  title,
  cta,
  ctaTo,
}: {
  eyebrow: string;
  title: string;
  cta?: string;
  ctaTo?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl md:text-3xl">{title}</h2>
      </div>
      {cta && ctaTo && (
        <Link
          to={ctaTo}
          className="hidden text-xs font-bold uppercase tracking-widest text-muted-foreground underline underline-offset-4 hover:text-foreground md:block"
        >
          {cta}
        </Link>
      )}
    </div>
  );
}

function Home() {
  const newOnes = PRODUCTS.filter((p) => p.newArrival).slice(0, 8);

  return (
    <div>
      {/* ── Hero carousel ── */}
      <HomeHeroCarousel />

      {/* ── Ticker ── */}
      <div className="overflow-hidden border-b border-foreground/15 bg-foreground text-background">
        <div className="flex py-2.5">
          <div className="marquee-track">
            {TICKER_ITEMS.map((item, i) => (
              <span
                key={i}
                className={`font-display text-sm uppercase tracking-widest ${
                  item === "·" ? "mx-4 opacity-40" : "mx-3"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
          {/* duplicate for seamless loop */}
          <div className="marquee-track" aria-hidden>
            {TICKER_ITEMS.map((item, i) => (
              <span
                key={i}
                className={`font-display text-sm uppercase tracking-widest ${
                  item === "·" ? "mx-4 opacity-40" : "mx-3"
                }`}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Brand intro ── */}
      <section className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Bienvenida a Pulpiña RD
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl">Una marca. Tres mundos.</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
          Moda alternativa diseñada en República Dominicana. Encuentra tu vibra entre
          {" "}<strong>Moon</strong>, <strong>Sunshine</strong> y <strong>Men</strong>.
        </p>
      </section>

      {/* ── Vibe editorial cards ── */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="grid gap-3 sm:grid-cols-3">
          {VIBES_EDITORIAL.map((vibe) => (
            <Link
              key={vibe.to}
              to={vibe.to}
              className="group relative overflow-hidden rounded-xl"
              style={{ aspectRatio: "2/3" }}
            >
              {/* Background */}
              <div className="absolute inset-0" style={{ background: vibe.bg }} />
              <img
                src={vibe.mood}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-50 transition-opacity duration-500 group-hover:opacity-60"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute inset-x-0 bottom-0 p-5">
                <img
                  src={vibe.logo}
                  alt={vibe.name}
                  className="mb-3 h-12 object-contain"
                />
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                  {vibe.tag}
                </p>
                <span className="mt-3 inline-block rounded-full border border-white/50 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm transition group-hover:bg-white/20">
                  {vibe.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Nuevos arrivals ── */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <SectionHeader
          eyebrow="Recién llegado"
          title="New In"
          cta="Ver todo"
          ctaTo="/tienda"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {newOnes.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              soldOutMode="standard"
              showSubtitle={false}
              tone="store"
            />
          ))}
        </div>
        <div className="mt-6 text-center md:hidden">
          <Link
            to="/tienda"
            className="inline-block rounded-full border border-foreground px-6 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-foreground hover:text-background"
          >
            Ver todo
          </Link>
        </div>
      </section>

      {/* ── Banner strip ── */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="relative overflow-hidden rounded-2xl bg-foreground px-8 py-12 text-background md:px-14">
          <div className="relative z-10 max-w-lg">
            <OctopusMark className="mb-4 h-12 w-12 text-accent" />
            <h2 className="text-2xl md:text-3xl">Hecho en RD, para el mundo.</h2>
            <p className="mt-3 text-sm text-background/70 md:text-base">
              Cada prenda Pulpiña es diseñada en República Dominicana para personas que no encajan en una sola caja.
            </p>
            <Link
              to="/nosotros"
              className="mt-6 inline-block rounded-full border border-background/40 px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-background hover:bg-background/10"
            >
              Nuestra historia
            </Link>
          </div>
          {/* Decorative */}
          <div
            className="absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle,#fff,transparent)" }}
          />
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="border-t border-foreground/10 bg-muted/40 px-4 py-14 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Club Pulpiña
        </p>
        <h2 className="mt-2 text-2xl md:text-3xl">Descuento de cumpleaños</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Suscríbete y recibe un cupón especial el día de tu cumpleaños.
        </p>
        <form
          className="mx-auto mt-5 flex max-w-sm flex-col gap-2 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            className="flex-1 rounded-full border border-foreground/20 bg-background px-4 py-2.5 text-sm outline-none focus:border-foreground"
          />
          <button className="rounded-full bg-foreground px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-background hover:opacity-90">
            Suscribirme
          </button>
        </form>
      </section>
    </div>
  );
}
