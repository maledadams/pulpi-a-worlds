import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminAutosaveIndicator,
  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminToast,
  type AdminToastTone,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { deleteAdminDiscount, getAdminDiscounts, saveAdminDiscount } from "@/lib/admin-content";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminDiscountRecord } from "@/lib/admin-types";

function cloneDiscount(discount: AdminDiscountRecord): AdminDiscountRecord {
  return { ...discount };
}

function sortDiscounts(discounts: AdminDiscountRecord[]) {
  return [...discounts].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    return a.code.localeCompare(b.code);
  });
}

function createBlankDiscount(): AdminDiscountRecord {
  return {
    id: `draft-discount-${Date.now()}`,
    code: "",
    label: "",
    type: "percentage",
    value: 10,
    active: false,
    scope: "store",
    maxRedemptions: null,
    onePerCustomer: false,
  };
}

export const Route = createFileRoute("/admin/descuentos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({ discounts: await getAdminDiscounts() }),
  head: () => ({ meta: [{ title: "Admin - Promociones" }] }),
  component: AdminDiscountsPage,
});

function AdminDiscountsPage() {
  const { discounts } = Route.useLoaderData();
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
    const lowered = query.trim().toLowerCase();
    return rows.filter((discount) => `${discount.code} ${discount.label}`.toLowerCase().includes(lowered));
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
    showSaveMessage("Nueva promoción draft creada.", "success");
  };

  const performSave = (value: AdminDiscountRecord, options: { silent?: boolean } = {}) => {
    return saveAdminDiscount({ data: value }).then((saved) => {
      setRows((current) => sortDiscounts([
        saved,
        ...current.filter((discount) => discount.id !== value.id && discount.id !== saved.id),
      ]));
      if (saved.id !== value.id) setSelectedId(saved.id);
      setDraft((current) => (current && current.id === value.id ? cloneDiscount(saved) : current));
      if (!options.silent) showSaveMessage("Promoción guardada.", "success");
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
        showSaveMessage(getAdminErrorMessage(error, "No se pudo guardar la promoción ahora mismo."), "error");
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleDelete = () => {
    if (!draft) return;
    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar la promoción ${draft.code || draft.id}. Esta acción no se puede deshacer. ¿Quieres continuar?`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminDiscount({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((discount) => discount.id !== draft.id));
        showSaveMessage("Promoción eliminada.", "success");
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo eliminar la promoción ahora mismo."), "error");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  return (
    <AdminShell
      section="descuentos"
      title="Promociones"
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nueva promoción
        </AdminButton>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <AdminPanel title="Promociones">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por codigo o nombre"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} promociones
            </div>
          </div>

          {!filtered.length ? (
            <AdminEmptyState
              title="No hay promociones"
              body="Prueba otra búsqueda o crea una nueva promoción."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear promoción
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
                      <div className="text-sm font-black">{discount.code || "Sin codigo"}</div>
                      <div className="mt-1 text-xs text-[#6b5a55]">{discount.label || "Sin nombre"}</div>
                    </div>
                    <AdminTag tone={discount.active ? "dark" : "soft"}>{discount.active ? "Activo" : "Pausado"}</AdminTag>
                  </div>
                  <div className="mt-4 text-2xl font-black">
                    {discount.type === "percentage" ? `${discount.value}%` : `RD$${discount.value}`}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#7c665f]">
                    <span>{getVibeLabel(discount.scope)}</span>
                    {discount.onePerCustomer ? <AdminTag tone="info">1 x cliente</AdminTag> : null}
                    {discount.maxRedemptions !== null ? (
                      <AdminTag tone="info">Limite {discount.maxRedemptions}</AdminTag>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft?.code || "Editor"}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isDeleting || isSaving}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AdminButton>
              <AdminButton tone="primary" onClick={handleSave} disabled={!draft || isSaving || isDeleting}>
                {isSaving ? "Guardando..." : "Guardar"}
              </AdminButton>
              <AdminAutosaveIndicator status={autosave.status} errorMessage={autosave.errorMessage} />
            </div>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              <AdminField label="Codigo">
                <AdminInput value={draft.code} onChange={(event) => setDraft((current) => (current ? { ...current, code: event.target.value } : current))} />
              </AdminField>
              <AdminField label="Nombre interno">
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
              <AdminField label="Aplica a">
                <AdminSelect value={draft.scope} onChange={(event) => setDraft((current) => (current ? { ...current, scope: event.target.value as AdminDiscountRecord["scope"] } : current))}>
                  <option value="store">General</option>
                  <option value="moon">Moon</option>
                  <option value="sunshine">Sunshine</option>
                  <option value="men">Men</option>
                </AdminSelect>
              </AdminField>
              <AdminField
                label="Limite de usos totales"
                hint="Dejar en blanco para uso ilimitado. Solo aplica a codigos escritos en el checkout (Aplica a: General)."
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
              <AdminCheckbox
                label="Descuento activo"
                checked={draft.active}
                onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, active: checked } : current))}
              />
            </div>
          ) : (
            <AdminEmptyState
              title="Sin descuento seleccionado"
              body="Selecciona una promocion de la lista o crea una nueva."
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
