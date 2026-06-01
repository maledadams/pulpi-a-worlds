import { createFileRoute, Link } from "@tanstack/react-router";
import logoMen from "@/assets/logo-men.png";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";
import logo from "@/assets/logo-pulpina.png";

export const Route = createFileRoute("/nosotros")({
  head: () => ({ meta: [{ title: "Nosotros — Pulpiña RD" }] }),
  component: About,
});

function About() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-12 text-center sm:py-16">
        <img src={logo} alt="Pulpiña" className="mx-auto h-24 wobble sm:h-32" />
        <h1 className="mt-4 text-4xl sm:text-5xl md:text-7xl">Somos Pulpiña</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Una marca dominicana de moda alternativa con tres mundos bien definidos. Nacimos para
          vestir a quienes no encajan en una sola caja.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:gap-6 sm:py-8 md:grid-cols-3">
        {[
          { logo: logoMen, name: "Men", desc: "Punk underground. Cuero, púas y actitud." },
          { logo: logoMoon, name: "Moon", desc: "Romance gótico. Encajes, rosas y misterio." },
          { logo: logoSun, name: "Sunshine", desc: "Kawaii y Y2K. Rosa, brillo y glamour." },
        ].map((section) => (
          <div
            key={section.name}
            className="sticker rounded-3xl border border-foreground/20 bg-card p-5 text-center sm:p-6"
          >
            <img src={section.logo} alt={section.name} className="mx-auto h-24 sm:h-32" />
            <h3 className="mt-3 font-display text-2xl">{section.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{section.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl md:text-4xl">Nuestra historia</h2>
        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          Pulpiña nació como un espacio para personas que aman vestirse fuera del molde. Hoy somos
          una marca con presencia en eventos como ComicCon RD y desfiles propios, construyendo
          comunidad alrededor de lo alternativo, lo expresivo y lo auténtico.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-foreground/20 bg-muted text-sm text-muted-foreground">
            Foto desfile
          </div>
          <div className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-foreground/20 bg-muted text-sm text-muted-foreground">
            Foto ComicCon
          </div>
        </div>
        <Link
          to="/tienda"
          className="sticker mt-8 inline-block rounded-full border border-foreground/20 bg-foreground px-6 py-3 font-bold uppercase text-background"
        >
          Ver la tienda
        </Link>
      </section>
    </div>
  );
}
