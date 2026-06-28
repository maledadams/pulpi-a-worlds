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
  AdminSelect,
  AdminToast,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminCategories, getAdminSizeFormats } from "@/lib/admin-content";
import {
  adjustAdminStock,
  getAdminStockData,
  saveAdminCatalogProduct,
} from "@/lib/catalog";
import { formatPrice } from "@/data/products";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminProductRecord, AdminSizeFormatRecord } from "@/lib/admin-types";
import { PRODUCT_COLOR_PRESETS, buildProductColorRecord, normalizeProductColorName } from "@/lib/product-colors";
import { getSizeOptionsForFormat } from "@/lib/product-sizing";

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

function variantKey(size: string, color: string) {
  return `${size}::${color}`.toLowerCase();
}

function buildVariantId(slug: string, size: string, color: string) {
  return `${slug}-${size}-${color}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-");
}

function syncVariants(product: AdminProductRecord): AdminProductRecord {
  const colors = product.colors.map((color) => normalizeProductColorName(color.name));
  const existing = new Map(
    product.variants.map((variant) => {
      const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
      const color = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? colors[0] ?? "Unica";
      return [variantKey(size, color), variant] as const;
    }),
  );
  const variants = product.sizes.flatMap((size) =>
    colors.map((color) => {
      const current = existing.get(variantKey(size, color));
      return {
        id: current?.id ?? buildVariantId(product.slug, size, color),
        title: colors.length > 1 ? `${size} / ${color}` : size,
        available: current?.available ?? true,
        quantityAvailable: current?.quantityAvailable ?? 0,
        price: current?.price ?? product.price,
        compareAtPrice: current?.compareAtPrice ?? product.compareAtPrice,
        currencyCode: current?.currencyCode ?? "DOP",
        image: current?.image ?? product.featuredImage,
        selectedOptions: [
          { name: "Talla", value: size },
          { name: "Color", value: color },
        ],
      };
    }),
  );
  return {
    ...product,
    variants,
    stock: variants.reduce((sum, variant) => sum + Math.max(0, variant.quantityAvailable ?? 0), 0),
  };
}

function allowedSizes(
  categories: AdminCategoryRecord[],
  formats: AdminSizeFormatRecord[],
  categoryId: string,
) {
  const category = categories.find((entry) => entry.id === categoryId);
  return getSizeOptionsForFormat(category?.sizeFormat ?? "standard", formats);
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
    const [stock, categories, sizeFormats] = await Promise.all([
      getAdminStockData(),
      getAdminCategories(),
      getAdminSizeFormats(),
    ]);
    return { ...stock, categories, sizeFormats };
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
  const sizeOptions = allowedSizes(initial.categories, initial.sizeFormats, draft?.primaryCategory ?? "");
  const activeColors = new Set((draft?.colors ?? []).map((color) => normalizeProductColorName(color.name).toLowerCase()));

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

  const toggleCategory = (categoryId: string) => {
    updateDraft((current) => {
      const exists = current.categories.includes(categoryId);
      const categories = exists ? current.categories.filter((entry) => entry !== categoryId) : [...current.categories, categoryId];
      const safe = categories.length > 0 ? categories : [categoryId];
      return { ...current, categories: safe, primaryCategory: safe.includes(current.primaryCategory) ? current.primaryCategory : safe[0]! };
    });
  };

  const toggleSize = (size: string) => {
    updateDraft((current) => {
      const sizes = current.sizes.includes(size) ? current.sizes.filter((entry) => entry !== size) : [...current.sizes, size];
      if (sizes.length === 0) return current;
      return syncVariants({ ...current, sizes });
    });
  };

  const toggleColor = (name: string) => {
    updateDraft((current) => {
      const normalized = normalizeProductColorName(name);
      const exists = current.colors.some((color) => normalizeProductColorName(color.name) === normalized);
      if (exists && current.colors.length === 1) return current;
      const colors = exists
        ? current.colors.filter((color) => normalizeProductColorName(color.name) !== normalized)
        : [...current.colors, buildProductColorRecord(name)];
      return syncVariants({ ...current, colors });
    });
  };

  const saveStructure = () => {
    if (!draft) return;
    setBusy(true);
    void saveAdminCatalogProduct({ data: draft })
      .then((saved) => {
        setProducts((current) => current.map((product) => (product.id === saved.id ? cloneProduct(saved) : product)));
        setDraft(cloneProduct(saved));
        setMessage("Estructura de variantes guardada.");
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
      subtitle="Inventario por variante con entradas, salidas, reservas e historial permanente."
      actions={<AdminButton tone="primary" onClick={saveStructure} disabled={!draft || busy}>Guardar estructura</AdminButton>}
    >
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminPanel title="Productos" className="self-start xl:sticky xl:top-4">
          <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto" />
          <div className="mt-3 grid max-h-[70vh] gap-2 overflow-y-auto pr-1">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => setSelectedId(product.id)}
                className={`border p-3 text-left ${selectedId === product.id ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/10 bg-[#faf6f0]"}`}
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
              <div className="grid gap-5">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Categorias</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {initial.categories.map((category) => (
                      <button key={category.id} onClick={() => toggleCategory(category.id)} className={`border px-3 py-2 text-xs font-bold ${draft.categories.includes(category.id) ? "bg-[#231717] text-white" : "bg-[#faf6f0]"}`}>
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
                <AdminField label="Categoria principal">
                  <AdminSelect value={draft.primaryCategory} onChange={(event) => updateDraft((current) => ({ ...current, primaryCategory: event.target.value }))}>
                    {draft.categories.map((id) => <option key={id} value={id}>{initial.categories.find((category) => category.id === id)?.label ?? id}</option>)}
                  </AdminSelect>
                </AdminField>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Tallas</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizeOptions.map((size) => <button key={size} onClick={() => toggleSize(size)} className={`border px-3 py-2 text-xs font-bold ${draft.sizes.includes(size) ? "bg-[#231717] text-white" : "bg-[#faf6f0]"}`}>{size}</button>)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Colores</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRODUCT_COLOR_PRESETS.map((color) => <button key={color.id} onClick={() => toggleColor(color.label)} className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-bold ${activeColors.has(color.label.toLowerCase()) ? "bg-[#231717] text-white" : "bg-[#faf6f0]"}`}><span className="ui-circle h-3 w-3 border" style={{ background: color.hex }} />{color.label}</button>)}
                  </div>
                </div>
              </div>
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
