import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS, formatPrice, VIBES } from "@/data/products";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Preview — Pulpiña RD" }] }),
  component: Admin,
});

function Admin() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl">Admin Preview</h1>
          <p className="text-muted-foreground text-sm mt-1">Concepto del panel de administración. Conectado a Shopify en producción.</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-muted">Mockup</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {[
          { l: "Productos", v: PRODUCTS.length },
          { l: "En stock", v: PRODUCTS.filter((p) => p.available).length },
          { l: "Agotados", v: PRODUCTS.filter((p) => !p.available).length },
        ].map((s) => (
          <div key={s.l} className="p-5 rounded-2xl border-2 border-foreground bg-card">
            <div className="text-xs uppercase font-bold text-muted-foreground">{s.l}</div>
            <div className="font-display text-3xl mt-1">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border-2 border-foreground bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              <th className="p-3">Producto</th>
              <th className="p-3">Línea</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 flex items-center gap-2">
                  <span className="h-8 w-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `linear-gradient(135deg,${p.swatch[0]},${p.swatch[1]})` }}>{p.emoji}</span>
                  <span className="font-semibold">{p.name}</span>
                </td>
                <td className="p-3">{VIBES[p.vibe].name}</td>
                <td className="p-3 capitalize">{p.category}</td>
                <td className="p-3">{formatPrice(p.salePrice ?? p.price)}</td>
                <td className="p-3">{p.stock}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.available ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                    {p.available ? "Activo" : "Agotado"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
