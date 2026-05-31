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
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { ADMIN_DISCOUNTS, getVibeLabel } from "@/lib/admin-service";
import type { AdminDiscountRecord } from "@/lib/admin-types";

function cloneDiscount(discount: AdminDiscountRecord): AdminDiscountRecord {
  return { ...discount };
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
  loader: () => ({ discounts: ADMIN_DISCOUNTS }),
  head: () => ({ meta: [{ title: "Admin - Descuentos" }] }),
  component: AdminDiscountsPage,
});

function AdminDiscountsPage() {
  const { discounts } = Route.useLoaderData();
  const [rows, setRows] = useState(() => discounts.map(cloneDiscount));
  const [selectedId, setSelectedId] = useState(discounts[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<AdminDiscountRecord | null>(discounts[0] ? cloneDiscount(discounts[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");

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
    setSaveMessage("Nuevo descuento draft creado.");
  };

  const handleSave = () => {
    if (!draft) return;
    const normalized = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      label: draft.label.trim(),
    };
    setRows((current) => current.map((discount) => (discount.id === draft.id ? normalized : discount)));
    setSaveMessage("Descuento listo en la interfaz. Falta persistencia real.");
  };

  return (
    <AdminShell
      section="descuentos"
      title="Descuentos"
      subtitle="Promociones simples y directas. Sin motor complejo todavia, pero ya con el flujo compacto para operar codigos."
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nuevo descuento
        </AdminButton>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <AdminPanel title="Campanas" eyebrow="Promociones">
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
              body="Prueba otra busqueda o crea una nueva promocion."
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
          eyebrow="Detalle"
          actions={
            <AdminButton tone="primary" onClick={handleSave} disabled={!draft}>
              Guardar
            </AdminButton>
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
