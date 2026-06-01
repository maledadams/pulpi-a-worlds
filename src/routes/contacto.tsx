import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/contacto")({
  head: () => ({ meta: [{ title: "Contacto — Pulpiña RD" }] }),
  component: Contact,
});

const FAQS = [
  {
    q: "¿Hacen envíos a todo el país?",
    a: "Sí, enviamos a toda la República Dominicana. El tiempo estimado es de 2 a 5 días hábiles.",
  },
  {
    q: "¿Puedo cambiar o devolver una prenda?",
    a: "Aceptamos cambios dentro de 7 días por talla o defecto de fábrica. Las piezas en oferta son finales.",
  },
  {
    q: "¿Cuándo sale el próximo drop?",
    a: "Suscríbete a nuestra lista para recibir los drops antes que nadie.",
  },
];

function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <h1 className="text-4xl sm:text-5xl md:text-7xl">Contáctanos</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
        ¿Dudas, colaboraciones o solo quieres saludar? Escríbenos.
      </p>

      <div className="mt-8 grid gap-6 sm:mt-10 md:grid-cols-2 md:gap-8">
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-3 rounded-3xl border border-foreground/15 bg-card p-5 sm:p-6"
        >
          <input
            required
            placeholder="Tu nombre"
            className="w-full rounded-full border border-foreground/15 bg-background px-4 py-3"
          />
          <input
            required
            type="email"
            placeholder="Tu correo"
            className="w-full rounded-full border border-foreground/15 bg-background px-4 py-3"
          />
          <textarea
            required
            rows={5}
            placeholder="Tu mensaje"
            className="w-full rounded-2xl border border-foreground/15 bg-background px-4 py-3"
          />
          <button className="sticker w-full rounded-full border border-foreground/15 bg-accent px-6 py-3 font-bold uppercase text-accent-foreground">
            Enviar mensaje
          </button>
        </form>
        <div className="space-y-3">
          <a
            href="https://instagram.com"
            className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4 hover:bg-muted"
          >
            <Instagram /> @pulpina.rd
          </a>
          <a
            href="mailto:hola@pulpina.do"
            className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4 hover:bg-muted"
          >
            <Mail /> hola@pulpina.do
          </a>
          <div className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4">
            <MapPin /> Santo Domingo, RD
          </div>
        </div>
      </div>

      <h2 className="mt-12 text-2xl sm:mt-16 sm:text-3xl md:text-4xl">Preguntas frecuentes</h2>
      <div className="mt-4 grid gap-2">
        {FAQS.map((item) => (
          <details key={item.q} className="rounded-2xl border border-foreground/15 bg-card p-4">
            <summary className="cursor-pointer font-bold">{item.q}</summary>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
