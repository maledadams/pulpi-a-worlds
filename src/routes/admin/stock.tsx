import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type RefObject } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminAutosaveIndicator,
  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminPagination,
  AdminSectionLabel,
  AdminToast,
  type AdminToastTone,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminCategories } from "@/lib/admin-content";
import { adjustAdminStock, getAdminStockData, saveAdminCatalogProduct } from "@/lib/catalog";
import { formatPrice } from "@/data/products";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminProductRecord } from "@/lib/admin-types";
import { useScrollFollow } from "@/hooks/use-scroll-follow";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";

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

const LOW_STOCK_THRESHOLD = 4;

function hasLowStock(product: AdminProductRecord) {
  return product.variants.some((variant) => Math.max(0, variant.quantityAvailable ?? 0) <= LOW_STOCK_THRESHOLD);
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
  const listFollower = useScrollFollow(1280);
  const [products, setProducts] = useState(() => initial.products.map(cloneProduct));
  const [movements, setMovements] = useState(initial.movements);
  const [selectedId, setSelectedId] = useState(initial.products[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminProductRecord | null>(initial.products[0] ? cloneProduct(initial.products[0]) : null);
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<AdminToastTone>("info");
  const showMessage = (text: string, tone: AdminToastTone = "info") => {
    setMessage(text);
    setMessageTone(tone);
  };
  const [movementPage, setMovementPage] = useState(0);
  const movementPages = Math.max(1, Math.ceil(movements.length / 8));
  const safeMovementPage = Math.min(movementPage, movementPages - 1);
  const pagedMovements = movements.slice(safeMovementPage * 8, safeMovementPage * 8 + 8);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products
      .filter((product) => `${product.name} ${product.slug} ${product.id}`.toLowerCase().includes(needle))
      .filter((product) => !lowStockOnly || hasLowStock(product));
  }, [products, query, lowStockOnly]);
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
    setMovementPage(0);
  }, [movements]);

  const updateDraft = (updater: (product: AdminProductRecord) => AdminProductRecord) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const performSave = (value: AdminProductRecord, options: { silent?: boolean } = {}) => {
    return saveAdminCatalogProduct({ data: value }).then((saved) => {
      setProducts((current) => current.map((product) => (product.id === saved.id ? cloneProduct(saved) : product)));
      setDraft((current) => (current && current.id === value.id ? cloneProduct(saved) : current));
      if (!options.silent) showMessage("Cambios guardados.", "success");
    });
  };

  const autosave = useAdminAutosave(draft, (value) => performSave(value, { silent: true }), {
    resetKey: selectedId,
  });

  const saveChanges = () => {
    if (!draft) return;
    setBusy(true);
    void performSave(draft)
      .catch((error) => showMessage(error instanceof Error ? error.message : "No se pudo guardar.", "error"))
      .finally(() => setBusy(false));
  };

  const registerMovement = (variantId: string, direction: 1 | -1) => {
    if (!reason.trim() || quantity < 1) {
      showMessage("Indica una cantidad y un motivo antes de registrar el movimiento.", "error");
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
        showMessage(direction > 0 ? "Entrada registrada." : "Salida registrada.", "success");
      })
      .catch((error) => showMessage(error instanceof Error ? error.message : "No se pudo ajustar el stock.", "error"))
      .finally(() => setBusy(false));
  };

  const removeVariant = (variantId: string) => {
    if (!draft) return;
    const variant = draft.variants.find((entry) => entry.id === variantId);
    if (!variant) return;
    if (draft.variants.length <= 1) {
      showMessage("El producto debe conservar al menos una variante.", "error");
      return;
    }
    if ((variant.quantityAvailable ?? 0) > 0) {
      showMessage("Primero registra una salida para dejar esta variante en cero.", "error");
      return;
    }
    if (!confirmAdminDestructiveAction(`Quitar la variante ${variant.title}? Su historial se conservara.`)) return;
    setDraft({ ...draft, variants: draft.variants.filter((entry) => entry.id !== variantId) });
  };

  return (
    <AdminShell
      section="stock"
      title="Stock"
      actions={
        <>
          <AdminButton tone="primary" onClick={saveChanges} disabled={!draft || busy}>Guardar cambios</AdminButton>
          <AdminAutosaveIndicator status={autosave.status} errorMessage={autosave.errorMessage} />
        </>
      }
    >
      <div ref={listFollower.containerRef} className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div
          ref={listFollower.floatingRef as RefObject<HTMLDivElement>}
          className="will-change-transform transition-transform duration-500 ease-out"
          style={{ transform: `translate3d(0, ${listFollower.offset}px, 0)` }}
        >
        <AdminPanel title="Productos">
          <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" />
          <button
            type="button"
            onClick={() => setLowStockOnly((current) => !current)}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.1em] transition ${
              lowStockOnly ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/15 bg-[#faf6f0] text-[#5f4941] hover:bg-[#f3eadf]"
            }`}
          >
            {lowStockOnly ? "Mostrando solo stock bajo" : "Filtrar solo stock bajo"}
          </button>
          <div className="mt-3 grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
            {filtered.map((product) => {
              const lowStock = hasLowStock(product);
              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  className={`rounded-xl border p-3 text-left transition ${selectedId === product.id ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/10 bg-[#faf6f0] hover:bg-[#f3eadf]"}`}
                >
                  <div className="font-bold">{product.name}</div>
                  <div className="mt-1 flex items-center justify-between text-xs opacity-75">
                    <span>{getVibeLabel(product.vibe)}</span>
                    <span className={lowStock && selectedId !== product.id ? "font-bold text-[#9a3423] opacity-100" : undefined}>
                      {product.stock ?? 0} unidades
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </AdminPanel>
        </div>

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
                <AdminField label="Cantidad"><AdminInput type="number" min={1} value={quantity === 1 ? "" : quantity} placeholder="1" onChange={(event) => setQuantity(event.target.value === "" ? 1 : Math.max(1, Number(event.target.value) || 1))} /></AdminField>
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
                        <td className="py-3 pr-3"><AdminInput type="number" value={variant.price === 0 ? "" : variant.price} onChange={(event) => updateDraft((current) => ({ ...current, variants: current.variants.map((entry) => entry.id === variant.id ? { ...entry, price: event.target.value === "" ? 0 : Math.max(0, Number(event.target.value) || 0) } : entry) }))} /><div className="mt-1 text-xs text-[#6b5a55]">{formatPrice(variant.price)}</div></td>
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
      <AdminToast message={message} tone={messageTone} />
    </AdminShell>
  );
}
