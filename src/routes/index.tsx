import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Star, Sparkle, Burst, Squiggle, OctopusMark } from "@/components/ui/Decor";
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
      { name: "description", content: "Marca dominicana de moda alternativa. Cuatro universos: Pulpiña, Men, Moon y Sunshine." },
    ],
  }),
  component: Home,
});

const WORLDS = [
  { to: "/pulpina" as const, name: "Pulpiña", tag: "El centro del universo", logo: logoMain, mood: null, bg: "linear-gradient(135deg,#ffd6ea,#fff3b0,#c5f56a)" },
  { to: "/men" as const, name: "Pulpiña Men", tag: "Punk · Underground", logo: logoMen, mood: moodMen, bg: "linear-gradient(135deg,#0a0a0a,#3a0a0a)" },
  { to: "/moon" as const, name: "Pulpiña Moon", tag: "Romance gótico", logo: logoMoon, mood: moodMoon, bg: "linear-gradient(135deg,#15080c,#4a0e1c)" },
  { to: "/sunshine" as const, name: "Pulpiña Sunshine", tag: "Kawaii · Y2K", logo: logoSun, mood: moodSun, bg: "linear-gradient(135deg,#ff8fc9,#ffe66a,#c5f56a)" },
];

function Home() {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 4);
  const newOnes = PRODUCTS.filter((p) => p.newArrival).slice(0, 4);

  return (
    <div>
      {/* HERO — neutral Pulpiña General */}
      <section className="relative overflow-hidden border-b-2 border-foreground bg-secondary">
        <Star className="absolute top-10 left-[8%] h-8 w-8 text-accent" />
        <Sparkle className="absolute top-24 right-[12%] h-10 w-10 text-foreground/30" />
        <Burst className="absolute bottom-10 left-[14%] h-12 w-12 text-accent/40" />
        <Squiggle className="absolute bottom-16 right-[6%] h-3 w-32 text-foreground/40" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-widest border-2 border-foreground">
              <Star className="h-3 w-3" /> Marca dominicana
            </span>
            <h1 className="mt-4 text-5xl md:text-7xl leading-[0.95]">
              Bienvenid@ al<br />
              universo <span className="text-accent">Pulpiña</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Una tienda alternativa con cuatro mundos. Empieza por la vista general
              o entra directo a tu vibra favorita.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tienda" className="sticker px-6 py-3 rounded-full bg-foreground text-background font-bold uppercase border-2 border-foreground">
                Comprar todo
              </Link>
              <a href="#vibras" className="sticker px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">
                Elige tu vibra
              </a>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-md aspect-square rounded-[2.5rem] border-2 border-foreground bg-card overflow-hidden grain">
              <img src={logoMain} alt="Pulpiña" className="absolute inset-0 m-auto h-3/4 w-3/4 object-contain wobble" />
              <Sparkle className="absolute top-4 right-4 h-8 w-8 text-accent" />
              <Burst className="absolute bottom-4 left-4 h-10 w-10 text-foreground/30" />
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="border-b-2 border-foreground bg-foreground text-background overflow-hidden">
        <div className="marquee whitespace-nowrap py-3 font-display text-xl uppercase tracking-widest flex gap-8">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex items-center gap-8 shrink-0">
              <span>Pulpiña</span> <Star className="h-4 w-4 inline" />
              <span>Pulpiña Men</span> <Star className="h-4 w-4 inline" />
              <span>Pulpiña Moon</span> <Star className="h-4 w-4 inline" />
              <span>Pulpiña Sunshine</span> <Star className="h-4 w-4 inline" />
              <span>Hecho en RD</span> <Star className="h-4 w-4 inline" />
            </span>
          ))}
        </div>
      </div>

      {/* INTRO */}
      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Sobre Pulpiña</span>
        <h2 className="mt-2 text-3xl md:text-4xl">Una marca, cuatro mundos.</h2>
        <p className="mt-4 text-base md:text-lg text-muted-foreground">
          Pulpiña es una marca dominicana de moda alternativa. Cada línea cuenta una historia
          distinta: la energía punk de <strong>Men</strong>, el romance gótico de <strong>Moon</strong>,
          la dulzura kawaii de <strong>Sunshine</strong>, y el corazón retro de <strong>Pulpiña</strong>.
        </p>
      </section>

      {/* VIBE SELECTOR */}
      <section id="vibras" className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">01 — Universos</span>
            <h2 className="text-4xl md:text-5xl mt-1">Elige tu mundo</h2>
          </div>
          <Link to="/tienda" className="hidden md:block text-sm font-bold underline underline-offset-4">Ver todo →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORLDS.map((w) => (
            <Link key={w.to} to={w.to} className="group sticker rounded-3xl border-2 border-foreground overflow-hidden bg-card">
              <div className="aspect-[4/5] relative" style={{ background: w.bg }}>
                {w.mood && <img src={w.mood} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition" />}
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img src={w.logo} alt={w.name} className="max-h-40 max-w-[80%] object-contain drop-shadow-2xl group-hover:scale-105 transition" />
                </div>
              </div>
              <div className="p-4 bg-card">
                <div className="font-display text-xl">{w.name}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{w.tag}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">02 — Destacados</span>
            <h2 className="text-4xl md:text-5xl mt-1">Lo más Pulpiña</h2>
          </div>
          <Link to="/tienda" className="hidden md:block text-sm font-bold underline underline-offset-4">Ver tienda →</Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border-2 border-foreground bg-foreground text-background p-8 md:p-12 relative overflow-hidden">
          <Burst className="absolute -top-10 -right-10 h-48 w-48 text-background/10" />
          <Sparkle className="absolute bottom-6 left-6 h-10 w-10 text-background/20" />
          <span className="text-xs uppercase tracking-widest font-bold opacity-70">03 — Nuevos productos</span>
          <h2 className="text-4xl md:text-5xl mt-1">Recién aterrizado</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {newOnes.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* NEWSLETTER / BIRTHDAY */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <OctopusMark className="h-16 w-16 mx-auto text-accent wobble" />
        <h2 className="text-4xl md:text-5xl mt-3">Descuento de cumpleaños</h2>
        <p className="mt-3 text-muted-foreground">Suscríbete y recibe un cupón especial el día de tu cumpleaños.</p>
        <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="tu@correo.com" className="flex-1 px-4 py-3 rounded-full border-2 border-foreground bg-background" />
          <button className="sticker px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">Quiero entrar</button>
        </form>
      </section>
    </div>
  );
}
