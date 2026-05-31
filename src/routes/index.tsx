import { createFileRoute, Link } from "@tanstack/react-router";
import { PRODUCTS } from "@/data/products";
import { ProductCard } from "@/components/product/ProductCard";
import { Star, OctopusMark } from "@/components/ui/Decor";
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
      { title: "Pulpina RD - Prendas de otro mundo" },
      {
        name: "description",
        content: "Tienda de moda alternativa con vibes Moon, Sunshine y Men.",
      },
    ],
  }),
  component: Home,
});

const VIBES = [
  {
    to: "/moon" as const,
    name: "Pulpina Moon",
    tag: "Romance gotico",
    logo: logoMoon,
    mood: moodMoon,
    bg: "linear-gradient(135deg,#15080c,#4a0e1c)",
  },
  {
    to: "/sunshine" as const,
    name: "Pulpina Sunshine",
    tag: "Kawaii - Y2K",
    logo: logoSun,
    mood: moodSun,
    bg: "linear-gradient(135deg,#ff8fc9,#ffe66a,#c5f56a)",
  },
  {
    to: "/men" as const,
    name: "Pulpina Men",
    tag: "Punk - Underground",
    logo: logoMen,
    mood: moodMen,
    bg: "linear-gradient(135deg,#0a0a0a,#3a0a0a)",
  },
] as const;

function Home() {
  const featured = PRODUCTS.filter((p) => p.featured).slice(0, 4);
  const newOnes = PRODUCTS.filter((p) => p.newArrival).slice(0, 4);

  return (
    <div>
      <HomeHeroCarousel />

      <div className="overflow-hidden border-b-2 border-foreground bg-foreground text-background">
        <div className="marquee flex gap-8 whitespace-nowrap py-3 font-display text-xl uppercase tracking-widest">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="flex shrink-0 items-center gap-8">
              <span>Moon</span> <Star className="inline h-4 w-4" />
              <span>Sunshine</span> <Star className="inline h-4 w-4" />
              <span>Men</span> <Star className="inline h-4 w-4" />
              <span>Tienda</span> <Star className="inline h-4 w-4" />
              <span>New In</span> <Star className="inline h-4 w-4" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Sobre Pulpina
        </span>
        <h2 className="mt-2 text-3xl md:text-4xl">Una marca, tres vibes.</h2>
        <p className="mt-4 text-base text-muted-foreground md:text-lg">
          Pulpina es una tienda de moda alternativa con tres direcciones claras:
          <strong> Men</strong>, <strong>Moon</strong> y <strong>Sunshine</strong>. La vista
          general vive en <strong>Tienda</strong>.
        </p>
      </section>

      <section id="vibras" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              01 - Vibes
            </span>
            <h2 className="mt-1 text-4xl md:text-5xl">Elige tu vibe</h2>
          </div>
          <Link
            to="/tienda"
            className="hidden text-sm font-bold underline underline-offset-4 md:block"
          >
            Ver todo
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {VIBES.map((vibe) => (
            <Link
              key={vibe.to}
              to={vibe.to}
              className="group overflow-hidden rounded-3xl border-2 border-foreground bg-card"
            >
              <div className="relative aspect-[4/5]" style={{ background: vibe.bg }}>
                <img
                  src={vibe.mood}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:opacity-85"
                />
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <img
                    src={vibe.logo}
                    alt={vibe.name}
                    className="max-h-52 max-w-[86%] object-contain drop-shadow-2xl md:max-h-60"
                  />
                </div>
              </div>
              <div className="bg-card p-4">
                <div className="font-display text-xl">{vibe.name}</div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  {vibe.tag}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              02 - Destacados
            </span>
            <h2 className="mt-1 text-4xl md:text-5xl">Lo mas Pulpina</h2>
          </div>
          <Link
            to="/tienda"
            className="hidden text-sm font-bold underline underline-offset-4 md:block"
          >
            Ver tienda
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              soldOutMode="standard"
              showSubtitle={false}
              tone="store"
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl border-2 border-foreground bg-foreground p-8 text-background md:p-12">
          <span className="text-xs font-bold uppercase tracking-widest opacity-70">
            03 - Nuevos productos
          </span>
          <h2 className="mt-1 text-4xl md:text-5xl">Recien aterrizado</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <OctopusMark className="mx-auto h-16 w-16 wobble text-accent" />
        <h2 className="mt-3 text-4xl md:text-5xl">Descuento de cumpleanos</h2>
        <p className="mt-3 text-muted-foreground">
          Suscribete y recibe un cupon especial el dia de tu cumpleanos.
        </p>
        <form
          className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="email"
            required
            placeholder="tu@correo.com"
            className="flex-1 rounded-full border-2 border-foreground bg-background px-4 py-3"
          />
          <button className="sticker rounded-full border-2 border-foreground bg-accent px-6 py-3 font-bold uppercase text-accent-foreground">
            Quiero entrar
          </button>
        </form>
      </section>
    </div>
  );
}
