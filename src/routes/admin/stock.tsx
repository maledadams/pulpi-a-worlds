import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminPagination,
  AdminSectionLabel,
  AdminToast,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminCategories } from "@/lib/admin-content";
import { adjustAdminStock, getAdminStockData, saveAdminCatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/data/products";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminProductRecord } from "@/lib/admin-types";

function cloneProduct(product: AdminProductRecord): AdminProductRecord {
  return {
    ...product,
    categories: [...product.categories],
    sizes: [...product.sizes],
    colors: product.colors.map((color) => ({ ...color })),
    images: product.images.map((image) => ({ ...image })),
    featuredImage: product.featuredImage ? { ...product.featuredImage } : null,
    variants: product.variants.map((variant) => ({
      ...variant,
      image: variant.image ? { ...variant.image } : null,
      selectedOptions: variant.selectedOptions.map((option) => ({ ...option })),
    })),
    tags: [...product.tags],
  };
}

function categoryLabel(categories: AdminCategoryRecord[], categoryId: string) {
  return categories.find((entry) => entry.id === categoryId)?.label ?? categoryId;
}

function formatMovementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()} ${hours}:${minutes} UTC`;
}

export const Route = createFileRoute("/admin/stock")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => {
    const [stock, categories] = await Promise.all([getAdminStockData(), getAdminCategories()]);
    return { ...stock, categories };
  },
  head: () => ({ meta: [{ title: "Admin - Stock" }] }),
  component: AdminStockPage,
});

function AdminStockPage() {
  const initial = Route.useLoaderData();
  const [products, setProducts] = useState(() => initial.products.map(cloneProduct));
  const [movements, setMovements] = useState(initial.movements);
  const [selectedId, setSelectedId] = useState(initial.products[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminProductRecord | null>(initial.products[0] ? cloneProduct(initial.products[0]) : null);
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [movementPage, setMovementPage] = useState(1);
  const movementPages = Math.max(1, Math.ceil(movements.length / 8));
  const safeMovementPage = Math.min(movementPage, movementPages);
  const pagedMovements = movements.slice((safeMovementPage - 1) * 8, safeMovementPage * 8);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => `${product.name} ${product.slug} ${product.id}`.toLowerCase().includes(needle));
  }, [products, query]);
  const selected = products.find((product) => product.id === selectedId) ?? null;

  useEffect(() => {
    setDraft(selected ? cloneProduct(selected) : null);
    setQuantity(1);
    setReason("");
  }, [selected]);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    setMovementPage(1);
  }, [movements]);

  const updateDraft = (updater: (product: AdminProductRecord) => AdminProductRecord) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const saveChanges = () => {
    if (!draft) return;
    setBusy(true);
    void saveAdminCatalogProduct({ data: draft })
      .then((saved) => {
        setProducts((current) => current.map((product) => (product.id === saved.id ? cloneProduct(saved) : product)));
        setDraft(cloneProduct(saved));
        setMessage("Cambios guardados.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo guardar."))
      .finally(() => setBusy(false));
  };

  const registerMovement = (variantId: string, direction: 1 | -1) => {
    if (!reason.trim() || quantity < 1) {
      setMessage("Indica una cantidad y un motivo antes de registrar el movimiento.");
      return;
    }
    setBusy(true);
    void adjustAdminStock({ data: { variantId, delta: direction * quantity, reason } })
      .then((result) => {
        setProducts(result.products.map(cloneProduct));
        setMovements(result.movements);
        const refreshed = result.products.find((product) => product.id === selectedId);
        setDraft(refreshed ? cloneProduct(refreshed) : null);
        setQuantity(1);
        setReason("");
        setMessage(direction > 0 ? "Entrada registrada." : "Salida registrada.");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "No se pudo ajustar el stock."))
      .finally(() => setBusy(false));
  };

  const removeVariant = (variantId: string) => {
    if (!draft) return;
    const variant = draft.variants.find((entry) => entry.id === variantId);
    if (!variant) return;
    if (draft.variants.length <= 1) {
      setMessage("El producto debe conservar al menos una variante.");
      return;
    }
    if ((variant.quantityAvailable ?? 0) > 0) {
      setMessage("Primero registra una salida para dejar esta variante en cero.");
      return;
    }
    if (!confirmAdminDestructiveAction(`Quitar la variante ${variant.title}? Su historial se conservara.`)) return;
    setDraft({ ...draft, variants: draft.variants.filter((entry) => entry.id !== variantId) });
  };

  return (
    <AdminShell
      section="stock"
      title="Stock"
      subtitle="Inventario por variante con entradas, salidas, reservas e historial permanente. La estructura del producto (categorias, tallas, colores) se edita en Productos."
      actions={<AdminButton tone="primary" onClick={saveChanges} disabled={!draft || busy}>Guardar cambios</AdminButton>}
    >
      <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminPanel title="Productos" className="self-start xl:sticky xl:top-4">
          <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" />
          <div className="mt-3 grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                className={`rounded-xl border p-3 text-left transition ${selectedId === product.id ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/10 bg-[#faf6f0] hover:bg-[#f3eadf]"}`}
              >
                <div className="font-bold">{product.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs opacity-75">
                  <span>{getVibeLabel(product.vibe)}</span><span>{product.stock ?? 0} unidades</span>
                </div>
              </button>
            ))}
          </div>
        </AdminPanel>

        {draft ? (
          <div className="grid gap-4">
            <AdminPanel title={draft.name} actions={<AdminTag>{draft.stock ?? 0} unidades</AdminTag>}>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <AdminSectionLabel>Categorias</AdminSectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.categories.map((categoryId) => (
                      <AdminTag key={categoryId}>{categoryLabel(initial.categories, categoryId)}</AdminTag>
                    ))}
                  </div>
                </div>
                <div>
                  <AdminSectionLabel>Tallas</AdminSectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.sizes.map((size) => (
                      <AdminTag key={size}>{size}</AdminTag>
                    ))}
                  </div>
                </div>
                <div>
                  <AdminSectionLabel>Colores</AdminSectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.colors.map((color) => (
                      <AdminTag key={color.name}>{color.name}</AdminTag>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#8b756d]">
                Para cambiar categorias, tallas o colores, edita este producto en Productos.
              </p>
            </AdminPanel>

            <AdminPanel title="Variantes, precio y movimientos" className="overflow-hidden">
              <div className="mb-4 grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                <AdminField label="Cantidad"><AdminInput type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} /></AdminField>
                <AdminField label="Motivo obligatorio"><AdminInput value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. reposicion del proveedor, ajuste por dano" /></AdminField>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[920px] text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c665f]"><tr><th className="pb-3">Variante</th><th className="pb-3">Disponible</th><th className="pb-3">Stock</th><th className="pb-3">Precio</th><th className="pb-3">Registrar</th><th className="pb-3">Quitar</th></tr></thead>
                  <tbody>
                    {draft.variants.map((variant) => (
                      <tr key={variant.id} className="border-t border-[#231717]/10 align-top">
                        <td className="py-3 pr-3"><div className="font-bold">{variant.title}</div><div className="text-[10px] text-[#7c665f]">{variant.id}</div></td>
                        <td className="py-3 pr-3"><AdminCheckbox label="Activa" checked={variant.available} onCheckedChange={(checked) => updateDraft((current) => ({ ...current, variants: current.variants.map((entry) => entry.id === variant.id ? { ...entry, available: checked } : entry) }))} /></td>
                        <td className="py-3 pr-3 text-lg font-black">{variant.quantityAvailable ?? 0}</td>
                        <td className="py-3 pr-3"><AdminInput type="number" value={variant.price} onChange={(event) => updateDraft((current) => ({ ...current, variants: current.variants.map((entry) => entry.id === variant.id ? { ...entry, price: Math.max(0, Number(event.target.value) || 0) } : entry) }))} /><div className="mt-1 text-xs text-[#6b5a55]">{formatPrice(variant.price)}</div></td>
                        <td className="py-3 pr-3"><div className="flex gap-2"><AdminButton tone="primary" disabled={busy} onClick={() => registerMovement(variant.id, 1)}>+ Entrada</AdminButton><AdminButton tone="warning" disabled={busy} onClick={() => registerMovement(variant.id, -1)}>- Salida</AdminButton></div></td>
                        <td className="py-3"><AdminButton tone="danger" onClick={() => removeVariant(variant.id)}>Quitar</AdminButton></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminPanel>

            <AdminPanel title="Historial de movimientos">
              {movements.length === 0 ? <AdminEmptyState title="Sin movimientos" body="Las entradas, salidas, reservas y cancelaciones apareceran aqui." /> : (
                <>
                  <div className="overflow-x-auto"><table className="min-w-[780px] text-left text-sm"><thead className="text-[11px] font-black uppercase tracking-[0.14em] text-[#7c665f]"><tr><th className="pb-3">Fecha</th><th className="pb-3">Producto</th><th className="pb-3">Movimiento</th><th className="pb-3">Saldo</th><th className="pb-3">Motivo</th></tr></thead><tbody>{pagedMovements.map((movement) => <tr key={movement.id} className="border-t border-[#231717]/10"><td className="py-3 pr-3 text-xs">{formatMovementDate(movement.createdAt)}</td><td className="py-3 pr-3"><div className="font-bold">{movement.productName}</div><div className="text-xs text-[#6b5a55]">{movement.variantLabel}</div></td><td className={`py-3 pr-3 font-black ${movement.delta > 0 ? "text-emerald-700" : "text-[#9a3423]"}`}>{movement.delta > 0 ? "+" : ""}{movement.delta}</td><td className="py-3 pr-3 font-bold">{movement.balanceAfter}</td><td className="py-3"><div>{movement.reason}</div>{movement.referenceId ? <div className="text-xs text-[#6b5a55]">{movement.referenceId}</div> : null}</td></tr>)}</tbody></table></div>
                  <div className="mt-3">
                    <AdminPagination page={safeMovementPage} pages={movementPages} onChange={setMovementPage} />
                  </div>
                </>
              )}
            </AdminPanel>
          </div>
        ) : <AdminPanel title="Stock"><AdminEmptyState title="Sin producto" body="Selecciona un producto para administrar su inventario." /></AdminPanel>}
      </div>
      <AdminToast message={message} />
    </AdminShell>
  );
}
