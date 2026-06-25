import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminSelect,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
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

  const handleCreate = () => {
    const blank = createBlankDiscount();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(blank);
    setSaveMessage("Nueva promoción draft creada.");
  };

  const handleSave = () => {
    if (!draft) return;
    setIsSaving(true);
    setSaveMessage("");
    void saveAdminDiscount({ data: draft })
      .then((saved) => {
        setRows((current) => sortDiscounts([
          saved,
          ...current.filter((discount) => discount.id !== draft.id && discount.id !== saved.id),
        ]));
        setSelectedId(saved.id);
        setDraft(cloneDiscount(saved));
        setSaveMessage("Promoción guardada.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo guardar la promoción ahora mismo.");
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
        setSaveMessage("Promoción eliminada.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la promoción ahora mismo.");
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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
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
                  <div className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7c665f]">
                    {getVibeLabel(discount.scope)}
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
            </div>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              {saveMessage ? (
                <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                  {saveMessage}
                </div>
              ) : null}

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
                  <AdminInput type="number" value={draft.value} onChange={(event) => setDraft((current) => (current ? { ...current, value: Number(event.target.value) } : current))} />
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
    </AdminShell>
  );
}
