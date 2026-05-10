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
      <section className="mx-auto max-w-5xl px-4 py-16 text-center">
        <img src={logo} alt="Pulpiña" className="mx-auto h-32 wobble" />
        <h1 className="mt-4 text-5xl md:text-7xl">Somos Pulpiña</h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
          Una marca dominicana de moda alternativa con cuatro universos de estilo.
          Nacimos para vestir a quienes no encajan en una sola caja.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-3 gap-6">
        {[
          { logo: logoMen, name: "Men", desc: "Punk underground. Cuero, púas y actitud." },
          { logo: logoMoon, name: "Moon", desc: "Romance gótico. Encajes, rosas y misterio." },
          { logo: logoSun, name: "Sunshine", desc: "Kawaii y Y2K. Rosa, brillo y glamour." },
        ].map((s) => (
          <div key={s.name} className="sticker p-6 rounded-3xl border-2 border-foreground bg-card text-center">
            <img src={s.logo} alt={s.name} className="h-32 mx-auto" />
            <h3 className="mt-3 font-display text-2xl">{s.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-3xl md:text-4xl">Nuestra historia</h2>
        <p className="mt-4 text-muted-foreground">
          Pulpiña empezó como un espacio para personas que aman vestirse fuera del molde.
          Hoy somos una marca con presencia en eventos como ComicCon RD y desfiles propios,
          construyendo una comunidad que celebra lo alternativo, lo expresivo y lo auténtico.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="aspect-[4/3] rounded-2xl border-2 border-foreground bg-muted flex items-center justify-center text-muted-foreground text-sm">Foto desfile</div>
          <div className="aspect-[4/3] rounded-2xl border-2 border-foreground bg-muted flex items-center justify-center text-muted-foreground text-sm">Foto ComicCon</div>
        </div>
        <Link to="/tienda" className="sticker mt-8 inline-block px-6 py-3 rounded-full bg-foreground text-background font-bold uppercase border-2 border-foreground">Ver la tienda</Link>
      </section>
    </div>
  );
}
