import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminSectionLabel,
  AdminSelect,
  AdminToast,
  type AdminToastTone,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { matchesAdminSearch } from "@/lib/admin-search";
import { deleteAdminDiscount, getAdminCategories, getAdminDiscounts, saveAdminDiscount } from "@/lib/admin-content";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminDiscountRecord } from "@/lib/admin-types";

function cloneDiscount(discount: AdminDiscountRecord): AdminDiscountRecord {
  return { ...discount, categoryIds: [...discount.categoryIds] };
}

function discountTitle(discount: AdminDiscountRecord) {
  return discount.kind === "code" ? discount.code || "Sin codigo" : discount.label || "Sin nombre";
}

function sortDiscounts(discounts: AdminDiscountRecord[]) {
  return [...discounts].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    return discountTitle(a).localeCompare(discountTitle(b));
  });
}

function createBlankDiscount(): AdminDiscountRecord {
  return {
    id: `draft-discount-${Date.now()}`,
    kind: "code",
    code: "",
    label: "",
    type: "percentage",
    value: 10,
    active: false,
    scope: "store",
    categoryIds: [],
    maxRedemptions: null,
    onePerCustomer: false,
  };
}

export const Route = createFileRoute("/admin/descuentos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => {
    const [discounts, categories] = await Promise.all([getAdminDiscounts(), getAdminCategories()]);
    return { discounts, categories };
  },
  head: () => ({ meta: [{ title: "Admin - Promociones" }] }),
  component: AdminDiscountsPage,
});

function AdminDiscountsPage() {
  const { discounts, categories } = Route.useLoaderData();
  const [rows, setRows] = useState(() => sortDiscounts(discounts.map(cloneDiscount)));
  const [selectedId, setSelectedId] = useState(discounts[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AdminDiscountRecord | null>(discounts[0] ? cloneDiscount(discounts[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveTone, setSaveTone] = useState<AdminToastTone>("info");
  const showSaveMessage = (text: string, tone: AdminToastTone = "info") => {
    setSaveMessage(text);
    setSaveTone(tone);
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    return rows.filter((discount) => matchesAdminSearch([discount.code, discount.label, discount.id], query));
  }, [rows, query]);

  const selected = rows.find((discount) => discount.id === selectedId) ?? null;

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((discount) => discount.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(cloneDiscount(selected));
  }, [selected]);

  useEffect(() => {
    if (!saveMessage) return;
    const timeout = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const handleCreate = () => {
    const blank = createBlankDiscount();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(blank);
    showSaveMessage("Nuevo descuento draft creado.", "success");
  };

  const performSave = (value: AdminDiscountRecord, options: { silent?: boolean } = {}) => {
    return saveAdminDiscount({ data: value }).then((saved) => {
      setRows((current) => sortDiscounts([
        saved,
        ...current.filter((discount) => discount.id !== value.id && discount.id !== saved.id),
      ]));
      if (saved.id !== value.id) setSelectedId(saved.id);
      setDraft((current) => (current && current.id === value.id ? cloneDiscount(saved) : current));
      if (!options.silent) showSaveMessage("Descuento guardado.", "success");
    });
  };

  const autosave = useAdminAutosave(draft, (value) => performSave(value, { silent: true }), {
    resetKey: selectedId,
  });

  const handleSave = () => {
    if (!draft) return;
    setIsSaving(true);
    setSaveMessage("");
    void performSave(draft)
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo guardar el descuento ahora mismo."), "error");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleDelete = () => {
    if (!draft) return;
    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar ${discountTitle(draft)}. Esta acción no se puede deshacer. ¿Quieres continuar?`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminDiscount({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((discount) => discount.id !== draft.id));
        showSaveMessage("Descuento eliminado.", "success");
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo eliminar el descuento ahora mismo."), "error");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const active = current.categoryIds.includes(categoryId);
      return {
        ...current,
        categoryIds: active
          ? current.categoryIds.filter((entry) => entry !== categoryId)
          : [...current.categoryIds, categoryId],
      };
    });
  };

  return (
    <AdminShell
      section="descuentos"
      title="Promociones"
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nuevo descuento
        </AdminButton>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <AdminPanel title="Descuentos">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por codigo o nombre"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} descuentos
            </div>
          </div>

          {!filtered.length ? (
            <AdminEmptyState
              title="No hay descuentos"
              body="Prueba otra búsqueda o crea un nuevo descuento."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear descuento
                </AdminButton>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((discount) => (
                <button
                  key={discount.id}
                  type="button"
                  onClick={() => setSelectedId(discount.id)}
                  className={`rounded-3xl border p-4 text-left transition-colors ${
                    selectedId === discount.id
                      ? "border-[#231717] bg-[#f7f2ec]"
                      : "border-[#231717]/10 bg-[#faf6f0] hover:bg-[#f3eadf]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-black">{discountTitle(discount)}</div>
                      <div className="mt-1 text-xs text-[#6b5a55]">
                        {discount.kind === "code" ? discount.label || "Sin nombre" : "Promoción automática"}
                      </div>
                    </div>
                    <AdminTag tone={discount.active ? "dark" : "soft"}>{discount.active ? "Activo" : "Pausado"}</AdminTag>
                  </div>
                  <div className="mt-4 text-2xl font-black">
                    {discount.type === "percentage" ? `${discount.value}%` : `RD$${discount.value}`}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#7c665f]">
                    <AdminTag tone="info">{discount.kind === "code" ? "Código" : "Promoción"}</AdminTag>
                    {discount.kind === "promotion" ? <span>{getVibeLabel(discount.scope)}</span> : null}
                    {discount.kind === "promotion" && discount.categoryIds.length > 0 ? (
                      <AdminTag tone="info">{discount.categoryIds.length} categorías</AdminTag>
                    ) : null}
                    {discount.kind === "code" && discount.onePerCustomer ? <AdminTag tone="info">1 x cliente</AdminTag> : null}
                    {discount.kind === "code" && discount.maxRedemptions !== null ? (
                      <AdminTag tone="info">Limite {discount.maxRedemptions}</AdminTag>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft ? discountTitle(draft) : "Editor"}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isDeleting || isSaving}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AdminButton>
              <AdminButton tone="primary" onClick={handleSave} disabled={!draft || isSaving || isDeleting}>
                {isSaving ? "Guardando..." : "Guardar"}
              </AdminButton>            </div>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              <AdminField
                label="Tipo de descuento"
                hint={
                  draft.kind === "code"
                    ? "El cliente escribe este codigo en el checkout. No cambia los precios mostrados en la tienda."
                    : "Se aplica automaticamente al precio mostrado, sin codigo. Eliges a que aplica abajo."
                }
              >
                <AdminSelect
                  value={draft.kind}
                  onChange={(event) =>
                    setDraft((current) =>
                      current ? { ...current, kind: event.target.value as AdminDiscountRecord["kind"] } : current,
                    )
                  }
                >
                  <option value="code">Código (checkout)</option>
                  <option value="promotion">Promoción (precio mostrado)</option>
                </AdminSelect>
              </AdminField>

              {draft.kind === "code" ? (
                <AdminField label="Codigo">
                  <AdminInput
                    value={draft.code}
                    onChange={(event) => setDraft((current) => (current ? { ...current, code: event.target.value } : current))}
                  />
                </AdminField>
              ) : null}

              <AdminField label={draft.kind === "code" ? "Nombre interno" : "Nombre"}>
                <AdminInput value={draft.label} onChange={(event) => setDraft((current) => (current ? { ...current, label: event.target.value } : current))} />
              </AdminField>
              <div className="grid gap-3 md:grid-cols-2">
                <AdminField label="Tipo">
                  <AdminSelect value={draft.type} onChange={(event) => setDraft((current) => (current ? { ...current, type: event.target.value as AdminDiscountRecord["type"] } : current))}>
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Valor">
                  <AdminInput type="number" value={draft.value === 0 ? "" : draft.value} onChange={(event) => setDraft((current) => (current ? { ...current, value: event.target.value === "" ? 0 : Number(event.target.value) } : current))} />
                </AdminField>
              </div>

              {draft.kind === "promotion" ? (
                <>
                  <AdminField label="Aplica a" hint="Que tienda ve el precio con descuento.">
                    <AdminSelect value={draft.scope} onChange={(event) => setDraft((current) => (current ? { ...current, scope: event.target.value as AdminDiscountRecord["scope"] } : current))}>
                      <option value="store">General (toda la tienda)</option>
                      <option value="moon">Moon</option>
                      <option value="sunshine">Sunshine</option>
                      <option value="men">Men</option>
                    </AdminSelect>
                  </AdminField>
                  <div>
                    <AdminSectionLabel>Categorías (opcional)</AdminSectionLabel>
                    <p className="mt-1 text-xs text-[#8b756d]">
                      Deja todas sin marcar para aplicar a todo lo de "{getVibeLabel(draft.scope)}". Marca solo las
                      categorías donde quieres que aplique el descuento.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {categories.map((category: AdminCategoryRecord) => {
                        const active = draft.categoryIds.includes(category.id);
                        return (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => toggleCategory(category.id)}
                            className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                              active ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/20 bg-[#faf6f0] text-[#5f4941]"
                            }`}
                          >
                            {category.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AdminField
                    label="Limite de usos totales"
                    hint="Dejar en blanco para uso ilimitado."
                  >
                    <AdminInput
                      type="number"
                      min={1}
                      value={draft.maxRedemptions ?? ""}
                      onChange={(event) =>
                        setDraft((current) => {
                          if (!current) return current;
                          const raw = event.target.value.trim();
                          return { ...current, maxRedemptions: raw ? Math.max(1, Number(raw)) : null };
                        })
                      }
                    />
                  </AdminField>
                  <AdminCheckbox
                    label="Solo un uso por cliente"
                    hint="Impide que el mismo correo vuelva a usar este codigo en otro pedido."
                    checked={draft.onePerCustomer}
                    onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, onePerCustomer: checked } : current))}
                  />
                </>
              )}

              <AdminCheckbox
                label="Descuento activo"
                hint={draft.kind === "code" ? "El codigo se puede usar en el checkout." : "El precio con descuento se muestra en la tienda ahora mismo."}
                checked={draft.active}
                onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, active: checked } : current))}
              />
            </div>
          ) : (
            <AdminEmptyState
              title="Sin descuento seleccionado"
              body="Selecciona un descuento de la lista o crea uno nuevo."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear descuento
                </AdminButton>
              }
            />
          )}
        </AdminPanel>
      </div>
      <AdminToast message={saveMessage} tone={saveTone} />
    </AdminShell>
  );
}
