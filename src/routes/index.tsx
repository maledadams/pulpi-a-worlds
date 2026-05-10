import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import logoMen from "@/assets/logo-men.png";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";
import logoMain from "@/assets/logo-pulpina.png";
import moodMen from "@/assets/mood-men.jpg";
import moodMoon from "@/assets/mood-moon.jpg";
import moodSun from "@/assets/mood-sunshine.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulpiña RD — Prendas de otro mundo" },
      { name: "description", content: "Una tienda, cuatro mundos. Elige tu versión: Pulpiña, Men, Moon o Sunshine." },
    ],
  }),
  component: Home,
});

const WORLDS = [
  {
    to: "/pulpina" as const,
    name: "Pulpiña",
    tag: "El centro del universo",
    blurb: "Cartoon · alternativo · genderless. La Pulpiña original.",
    logo: logoMain,
    mood: null,
    bg: "linear-gradient(135deg,#ffd6ea 0%,#fff3b0 50%,#c5f56a 100%)",
    emoji: "🐙",
  },
  {
    to: "/men" as const,
    name: "Pulpiña Men",
    tag: "Punk · Underground",
    blurb: "Streetwear distorsionado, negro y rojo, energía rebelde.",
    logo: logoMen,
    mood: moodMen,
    bg: "linear-gradient(135deg,#0a0a0a,#3a0a0a)",
    emoji: "🤘",
  },
  {
    to: "/moon" as const,
    name: "Pulpiña Moon",
    tag: "Romance gótico",
    blurb: "Velas, rosas, encaje. Elegancia un poco eerie.",
    logo: logoMoon,
    mood: moodMoon,
    bg: "linear-gradient(135deg,#15080c,#4a0e1c)",
    emoji: "🌹",
  },
  {
    to: "/sunshine" as const,
    name: "Pulpiña Sunshine",
    tag: "Kawaii · Y2K",
    blurb: "Glossy, brillos, rosa, lima. Dulce pero peligroso.",
    logo: logoSun,
    mood: moodSun,
    bg: "linear-gradient(135deg,#ff8fc9,#ffe66a,#c5f56a)",
    emoji: "🍓",
  },
];

function Home() {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 8);
  const newOnes = PRODUCTS.filter((p) => p.newArrival).slice(0, 4);
  return (
    <div className="relative">
      {/* HERO */}
      <section className="relative overflow-hidden border-b-2 border-foreground">
        <div className="absolute inset-0 dotgrid opacity-[0.07]" />
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-accent opacity-30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-lime opacity-30 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div className="relative">
            <div className="tape -top-2 left-8" />
            <span className="inline-block px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-widest border-2 border-foreground">
              🇩🇴 Marca dominicana · Est. 2024
            </span>
            <h1 className="mt-4 text-5xl md:text-7xl leading-[0.92]">
              Bienvenido al
              <br />
              <span className="scribble-underline">universo</span>{" "}
              <span className="text-accent">Pulpiña</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Una tienda, cuatro mundos. Empieza por la base neutral y cuando
              quieras, salta a tu versión favorita.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tienda" className="chunky px-6 py-3 rounded-2xl bg-foreground text-background font-bold uppercase border-2 border-foreground">
                Comprar todo →
              </Link>
              <a href="#vibras" className="chunky px-6 py-3 rounded-2xl bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">
                Elige tu versión
              </a>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>★ 4.9</span>
              <span>· 1.2k clientes felices</span>
              <span>· Envíos a toda RD</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-8 -left-6 text-7xl spin-slow select-none">✦</div>
            <div className="absolute -bottom-6 -right-2 text-7xl wobble select-none">🐙</div>
            <div className="absolute top-1/2 -left-10 text-5xl wobble select-none">🍓</div>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-3xl border-2 border-foreground bg-card chunky">
              {WORLDS.map((w) => (
                <div
                  key={w.name}
                  className="aspect-square rounded-2xl border-2 border-foreground overflow-hidden relative"
                  style={{ background: w.bg }}
                >
                  {w.mood && (
                    <img
                      src={w.mood}
                      alt={w.name}
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center text-5xl drop-shadow-lg">
                    {w.emoji}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* wavy bottom strip */}
        <div className="h-3 stripes wavy-bottom" />
      </section>

      {/* WORLD SELECTOR — main hub */}
      <section id="vibras" className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 rounded-full border-2 border-foreground bg-sun text-foreground text-xs font-bold uppercase tracking-widest chunky">
            01 · Elige tu versión
          </span>
          <h2 className="text-4xl md:text-6xl mt-4">
            Una tienda, <span className="text-accent">cuatro mundos</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Estás en Pulpiña General — el universo neutral. Desde aquí entras al
            mundo que más te llame.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {WORLDS.map((w, i) => (
            <Link
              key={w.to}
              to={w.to}
              className="group relative chunky rounded-3xl border-2 border-foreground overflow-hidden bg-card"
              style={{ transform: `rotate(${[-1.5, 1, -0.5, 1.5][i]}deg)` }}
            >
              <div className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full border-2 border-foreground bg-background flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="aspect-[4/5] relative" style={{ background: w.bg }}>
                {w.mood && (
                  <img
                    src={w.mood}
                    alt={w.name}
                    className="absolute inset-0 h-full w-full object-cover opacity-60 group-hover:opacity-90 transition"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img
                    src={w.logo}
                    alt={w.name}
                    className="max-h-36 max-w-[80%] object-contain drop-shadow-2xl group-hover:scale-110 transition"
                  />
                </div>
                <div className="absolute bottom-3 left-3 text-3xl">{w.emoji}</div>
              </div>
              <div className="p-4 bg-card border-t-2 border-foreground">
                <div className="font-display text-xl">{w.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  {w.tag}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {w.blurb}
                </p>
                <div className="mt-3 inline-block text-xs font-bold uppercase border-b-2 border-foreground">
                  Entrar →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DECORATIVE BAND */}
      <div className="border-y-2 border-foreground bg-accent text-accent-foreground overflow-hidden">
        <div className="flex whitespace-nowrap py-3 marquee text-2xl font-display">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="px-6 flex items-center gap-6">
              PULPIÑA RD <span>✦</span> ALT FASHION <span>🐙</span> SANTO DOMINGO <span>★</span>
            </span>
          ))}
        </div>
      </div>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full border-2 border-foreground bg-bubblegum text-white text-xs font-bold uppercase tracking-widest chunky">
              02 · Destacados
            </span>
            <h2 className="text-4xl md:text-5xl mt-3">Lo más Pulpiña 🐙</h2>
          </div>
          <Link to="/tienda" className="hidden md:inline-block chunky px-4 py-2 rounded-full border-2 border-foreground bg-card text-sm font-bold uppercase">
            Ver todo →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CATEGORY BLOCKS */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Camisetas", emoji: "👕", bg: "var(--bubblegum)", to: "/tienda" as const },
            { label: "Hoodies", emoji: "🧥", bg: "var(--lime)", to: "/tienda" as const },
            { label: "Accesorios", emoji: "🎀", bg: "var(--sun)", to: "/tienda" as const },
          ].map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="chunky rounded-3xl border-2 border-foreground p-6 flex items-center justify-between hover:rotate-1 transition"
              style={{ background: c.bg }}
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-70">Categoría</div>
                <div className="font-display text-3xl mt-1">{c.label}</div>
              </div>
              <div className="text-6xl wobble">{c.emoji}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border-2 border-foreground bg-foreground text-background p-8 md:p-12 relative overflow-hidden chunky">
          <div className="absolute -top-10 -right-10 text-[200px] opacity-10 spin-slow">✦</div>
          <div className="absolute top-4 left-4 text-3xl">🛸</div>
          <span className="inline-block px-3 py-1 rounded-full border-2 border-background text-xs font-bold uppercase tracking-widest">
            03 · Nuevos productos
          </span>
          <h2 className="text-4xl md:text-5xl mt-3">Recién aterrizado</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {newOnes.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center relative">
        <div className="text-6xl wobble inline-block">🎂</div>
        <h2 className="text-4xl md:text-5xl mt-2">Descuento de cumpleaños</h2>
        <p className="mt-3 text-muted-foreground">Suscríbete y recibe un cupón especial el día de tu cumpleaños.</p>
        <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="tu@correo.com" className="flex-1 px-4 py-3 rounded-2xl border-2 border-foreground bg-background" />
          <button className="chunky px-6 py-3 rounded-2xl bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">
            Quiero entrar
          </button>
        </form>
      </section>
    </div>
  );
}
