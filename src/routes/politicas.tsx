import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/politicas")({
  head: () => ({ meta: [{ title: "Políticas — Pulpiña RD" }] }),
  component: Policies,
});

const SECTIONS = [
  { title: "Envíos", body: "Enviamos a toda República Dominicana en 2–5 días hábiles. Tarifas calculadas en checkout." },
  { title: "Devoluciones", body: "Aceptamos cambios por talla dentro de 7 días. Las prendas en oferta son venta final." },
  { title: "Privacidad", body: "Tus datos solo se usan para procesar pedidos y comunicaciones de la marca. Nunca los compartimos." },
  { title: "Términos", body: "Al comprar en Pulpiña RD aceptas nuestras políticas de uso, privacidad y devolución." },
];

function Policies() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-5xl md:text-6xl">Políticas</h1>
      <div className="mt-8 space-y-3">
        {SECTIONS.map((s) => (
          <details key={s.title} className="p-5 rounded-2xl border-2 border-foreground bg-card" open>
            <summary className="font-display text-xl cursor-pointer">{s.title}</summary>
            <p className="mt-2 text-muted-foreground">{s.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
