import { createFileRoute } from "@tanstack/react-router";
import { Instagram, Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/contacto")({
  head: () => ({ meta: [{ title: "Contacto — Pulpiña RD" }] }),
  component: Contact,
});

const FAQS = [
  { q: "¿Hacen envíos a todo el país?", a: "Sí, enviamos a toda la República Dominicana. El tiempo estimado es de 2 a 5 días hábiles." },
  { q: "¿Puedo cambiar o devolver una prenda?", a: "Aceptamos cambios dentro de 7 días por talla o defecto de fábrica. Las piezas en oferta son finales." },
  { q: "¿Cuándo sale el próximo drop?", a: "Suscríbete a nuestra lista para recibir los drops antes que nadie." },
];

function Contact() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-5xl md:text-7xl">Contáctanos</h1>
      <p className="text-muted-foreground mt-2 max-w-xl">¿Dudas, colaboraciones o solo quieres saludar? Escríbenos.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-8">
        <form onSubmit={(e) => e.preventDefault()} className="p-6 rounded-3xl border-2 border-foreground bg-card space-y-3">
          <input required placeholder="Tu nombre" className="w-full px-4 py-3 rounded-full border-2 border-foreground bg-background" />
          <input required type="email" placeholder="Tu correo" className="w-full px-4 py-3 rounded-full border-2 border-foreground bg-background" />
          <textarea required rows={5} placeholder="Tu mensaje" className="w-full px-4 py-3 rounded-2xl border-2 border-foreground bg-background" />
          <button className="sticker w-full px-6 py-3 rounded-full bg-accent text-accent-foreground font-bold uppercase border-2 border-foreground">Enviar mensaje</button>
        </form>
        <div className="space-y-3">
          <a href="https://instagram.com" className="flex items-center gap-3 p-4 rounded-2xl border-2 border-foreground bg-card hover:bg-muted">
            <Instagram /> @pulpina.rd
          </a>
          <a href="mailto:hola@pulpina.do" className="flex items-center gap-3 p-4 rounded-2xl border-2 border-foreground bg-card hover:bg-muted">
            <Mail /> hola@pulpina.do
          </a>
          <div className="flex items-center gap-3 p-4 rounded-2xl border-2 border-foreground bg-card">
            <MapPin /> Santo Domingo, RD
          </div>
        </div>
      </div>

      <h2 className="mt-16 text-3xl md:text-4xl">Preguntas frecuentes</h2>
      <div className="mt-4 grid gap-2">
        {FAQS.map((f) => (
          <details key={f.q} className="p-4 rounded-2xl border-2 border-foreground bg-card">
            <summary className="font-bold cursor-pointer">{f.q}</summary>
            <p className="mt-2 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
