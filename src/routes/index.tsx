import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS, VIBES } from "@/data/products";
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
      { name: "description", content: "Elige tu vibra. Cuatro universos de moda alternativa hechos en RD." },
    ],
  }),
  component: Home,
});

const WORLDS = [
  { to: "/pulpina" as const, name: "Pulpiña", tag: "El centro del universo", logo: logoMain, mood: null, bg: "linear-gradient(135deg,#ffd6ea,#fff3b0,#c5f56a)" },
  { to: "/men" as const, name: "Pulpiña Men", tag: "Punk · Underground", logo: logoMen, mood: moodMen, bg: "linear-gradient(135deg,#0a0a0a,#3a0a0a)" },
  { to: "/moon" as const, name: "Pulpiña Moon", tag: "Romance gótico", logo: logoMoon, mood: moodMoon, bg: "linear-gradient(135deg,#15080c,#4a0e1c)" },
  { to: "/sunshine" as const, name: "Pulpiña Sunshine", tag: "Prendas de otro mundo", logo: logoSun, mood: moodSun, bg: "linear-gradient(135deg,#ff8fc9,#ffe66a,#c5f56a)" },
];

function Home() {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 8);
  const newOnes = PRODUCTS.filter((p) => p.newArrival).slice(0, 4);
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b-2 border-foreground">
        <div className="absolute inset-0 leopard opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-foreground text-background text-xs font-bold uppercase tracking-widest">Marca dominicana 🇩🇴</span>
            <h1 className="mt-4 text-5xl md:text-7xl leading-[0.95]">
              Elige tu <span className="text-accent">vibra</span>.
              <br />Vístete de otro mundo.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">
              Pulpiña es un universo con cuatro personalidades. Punk, gótico, kawaii y todo lo que está en el medio.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/tienda" className="sticker px-6 py-3 rounded-full bg-foreground text-background font-bold uppercase border-2 border-foreground">Comprar todo</Link>
              <a href="#vibras" className="sticker px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">Elige tu vibra</a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-6 -left-6 text-7xl wobble">✦</div>
            <div className="absolute -bottom-4 -right-4 text-7xl wobble">🐙</div>
            <div className="grid grid-cols-2 gap-3">
              {WORLDS.slice(1).map((w) => (
                <div key={w.name} className="aspect-square rounded-3xl border-2 border-foreground overflow-hidden sticker" style={{ background: w.bg }}>
                  {w.mood && <img src={w.mood} alt={w.name} className="h-full w-full object-cover mix-blend-luminosity opacity-90" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* VIBE SELECTOR */}
      <section id="vibras" className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-muted-foreground">01 — Universos</span>
            <h2 className="text-4xl md:text-5xl mt-1">Elige tu mundo</h2>
          </div>
          <Link to="/tienda" className="hidden md:block text-sm font-bold underline">Ver todo →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORLDS.map((w) => (
            <Link key={w.to} to={w.to} className="group sticker rounded-3xl border-2 border-foreground overflow-hidden bg-card">
              <div className="aspect-[4/5] relative" style={{ background: w.bg }}>
                {w.mood && <img src={w.mood} alt={w.name} className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition" />}
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
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* NEW ARRIVALS strip */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border-2 border-foreground bg-foreground text-background p-8 md:p-12 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 text-[200px] opacity-10">✦</div>
          <span className="text-xs uppercase tracking-widest font-bold opacity-70">03 — Nuevos productos</span>
          <h2 className="text-4xl md:text-5xl mt-1">Recién aterrizado</h2>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {newOnes.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="text-6xl wobble inline-block">🎂</div>
        <h2 className="text-4xl md:text-5xl mt-2">Descuento de cumpleaños</h2>
        <p className="mt-3 text-muted-foreground">Suscríbete y recibe un cupón especial el día de tu cumpleaños.</p>
        <form className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
          <input type="email" required placeholder="tu@correo.com" className="flex-1 px-4 py-3 rounded-full border-2 border-foreground bg-background" />
          <button className="sticker px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">Quiero entrar</button>
        </form>
      </section>
    </div>
  );
}
