import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/politicas")({
  head: () => ({ meta: [{ title: "Políticas — Pulpiña RD" }] }),
  component: Policies,
});

const SECTIONS = [
  {
    title: "Envíos",
    body: "Enviamos a toda República Dominicana en 2–5 días hábiles. Tarifas calculadas en checkout.",
  },
  {
    title: "Devoluciones",
    body: "Aceptamos cambios por talla dentro de 7 días. Las prendas en oferta son venta final.",
  },
  {
    title: "Privacidad",
    body: "Tus datos solo se usan para procesar pedidos y comunicaciones de la marca. Nunca los compartimos.",
  },
  {
    title: "Términos",
    body: "Al comprar en Pulpiña RD aceptas nuestras políticas de uso, privacidad y devolución.",
  },
];

function Policies() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
      <h1 className="text-4xl sm:text-5xl md:text-6xl">Políticas</h1>
      <div className="mt-8 space-y-3">
        {SECTIONS.map((section) => (
          <details
            key={section.title}
            className="rounded-2xl border-2 border-foreground bg-card p-4 sm:p-5"
            open
          >
            <summary className="cursor-pointer font-display text-lg sm:text-xl">
              {section.title}
            </summary>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{section.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
