import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {  AdminButton,
  getAdminVibeTagClassName,
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
import {
  deleteAdminDiscount,
  getAdminCategories,
  getAdminCollections,
  getAdminDiscounts,
  getAdminSettingsRecord,
  saveAdminDiscount,
} from "@/lib/admin-content";
import { getAdminThemeDiscountLinks, listAdminThemeAssets } from "@/lib/themes";
import { PromoBannerFields } from "@/components/admin/PromoBannerFields";
import { PromoAnnouncements } from "@/components/admin/PromoAnnouncements";
import type { LibraryAsset } from "@/components/admin/themes/ThemeEditorParts";
import { useCatalogProducts } from "@/context/catalog";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminDiscountRecord } from "@/lib/admin-types";

function cloneDiscount(discount: AdminDiscountRecord): AdminDiscountRecord {
  return {
    ...discount,
    categoryIds: [...discount.categoryIds],
    banner: discount.banner ? { ...discount.banner } : null,
  };
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
    const [discounts, categories, themeLinks, library, collections, settings] = await Promise.all([
      getAdminDiscounts(),
      getAdminCategories(),
      getAdminThemeDiscountLinks(),
      // Promotion banners use the theme image library.
      listAdminThemeAssets(),
      getAdminCollections(),
      getAdminSettingsRecord(),
    ]);
    return {
      discounts,
      categories,
      themeLinks,
      library,
      collections,
      announcements: settings.announcements,
    };
  },
  head: () => ({ meta: [{ title: "Admin - Promociones" }] }),
  component: AdminDiscountsPage,
});

function AdminDiscountsPage() {
  const { discounts, categories, themeLinks, library, collections, announcements: savedAnnouncements } =
    Route.useLoaderData();
  const [announcements, setAnnouncements] = useState(savedAnnouncements);
  const [assets, setAssets] = useState<LibraryAsset[]>(library);
  const products = useCatalogProducts();
  // Discounts a published theme owns turn on and off with it (theme engine spec §5.9).
  const themeLink = (id: string) => themeLinks[id];
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
      if (saved.id !== value.id) setSelectedId((current) => (current === value.id ? saved.id : current));
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

  const handleDelete = async () => {
    if (!draft) return;
    if (
      !(await confirmAdminDestructiveAction(
        `Vas a eliminar ${discountTitle(draft)}. Esta acción no se puede deshacer. ¿Quieres continuar?`,
      ))
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
        <AdminButton tone="create" onClick={handleCreate}>
          Nuevo descuento
        </AdminButton>
      }
    >
      <div className="grid grid-cols-1 items-start gap-4 axl:grid-cols-[minmax(0,1fr)_390px]">
        <AdminPanel title="Descuentos">
          <div className="mb-4 flex flex-col gap-3 amd:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por codigo o nombre"
            />
            <div className="shrink-0 px-1 py-2.5 text-sm text-[var(--admin-faint)]">
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
            <div className="grid gap-3 amd:grid-cols-2 axl:grid-cols-3">
              {filtered.map((discount) => (
                <button
                  key={discount.id}
                  type="button"
                  onClick={() => setSelectedId(discount.id)}
                  className={`rounded-3xl border p-4 text-left transition-colors ${
                    selectedId === discount.id
                      ? "border-transparent bg-[var(--admin-accent-soft)]"
                      : "border-[var(--admin-line)] bg-[var(--admin-surface)] hover:bg-[var(--admin-accent-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{discountTitle(discount)}</div>
                      <div className="mt-1 text-xs text-[var(--admin-muted)]">
                        {discount.kind === "code" ? discount.label || "Sin nombre" : "Promoción automática"}
                      </div>
                    </div>
                    {themeLink(discount.id) ? (
                      <AdminTag tone={themeLink(discount.id)!.on ? "success" : "warn"}>
                        {themeLink(discount.id)!.on ? "Activo" : "Pausado"} · Tema
                      </AdminTag>
                    ) : (
                      <AdminTag tone={discount.active ? "success" : "warn"}>{discount.active ? "Activo" : "Pausado"}</AdminTag>
                    )}
                  </div>
                  <div className="mt-4 text-2xl font-semibold">
                    {discount.type === "percentage" ? `${discount.value}%` : `RD$${discount.value}`}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--admin-faint)]">
                    <AdminTag tone="dark">{discount.kind === "code" ? "Código" : "Promoción"}</AdminTag>
                    {discount.kind === "promotion" ? (
                      discount.scope === "moon" || discount.scope === "sunshine" || discount.scope === "men" ? (
                        <span className={getAdminVibeTagClassName(discount.scope)}>{getVibeLabel(discount.scope)}</span>
                      ) : (
                        <AdminTag tone="plum">{getVibeLabel(discount.scope)}</AdminTag>
                      )
                    ) : null}
                    {discount.kind === "promotion" && discount.categoryIds.length > 0 ? (
                      <AdminTag tone="dark">{discount.categoryIds.length} categorías</AdminTag>
                    ) : null}
                    {discount.kind === "code" && discount.onePerCustomer ? <AdminTag tone="dark">1 x cliente</AdminTag> : null}
                    {discount.webOnly ? <AdminTag tone="info">Solo web</AdminTag> : null}
                    {discount.kind === "code" && discount.maxRedemptions !== null ? (
                      <AdminTag tone="info">Limite {discount.maxRedemptions}</AdminTag>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel editor
          title={draft ? discountTitle(draft) : "Editor"}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="save" onClick={handleSave} disabled={!draft || isSaving || isDeleting}>
                {isSaving ? "Guardando..." : "Guardar"}
              </AdminButton>
              <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isDeleting || isSaving}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
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
              <div className="grid gap-3 amd:grid-cols-2">
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
                    <p className="mt-1 text-xs text-[var(--admin-faint)]">
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
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                              active ? "border-transparent bg-[var(--admin-select)] text-[var(--admin-on-invert)]" : "bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:bg-[var(--admin-soft-hover)]"
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

              <AdminSectionLabel>Anuncios de esta promoción</AdminSectionLabel>
              {draft.id.startsWith("draft-discount-") ? (
                <p className="text-xs text-[var(--admin-muted)]">
                  Primero ponle nombre o código; cuando se guarde, puedes agregarle anuncios.
                </p>
              ) : (
                <PromoAnnouncements
                  discountId={draft.id}
                  announcements={announcements}
                  onSaved={(saved) => {
                    setAnnouncements(saved);
                    showSaveMessage("Anuncios guardados.", "success");
                  }}
                  onError={(message) => showSaveMessage(message, "error")}
                />
              )}

              <AdminSectionLabel>Banner</AdminSectionLabel>
              <PromoBannerFields
                banner={draft.banner}
                onChange={(banner) => setDraft((current) => (current ? { ...current, banner } : current))}
                assets={assets}
                onUploaded={(asset) => setAssets((current) => [asset, ...current])}
                onError={(message) => showSaveMessage(message, "error")}
                collections={collections}
                products={products}
              />

              {draft.kind === "promotion" ? (
                <AdminCheckbox
                  label="Solo en la web"
                  hint="El precio rebajado sale solo en la tienda online. Los pedidos que creas desde el admin (WhatsApp, Instagram, en tienda) llevan el precio normal."
                  checked={Boolean(draft.webOnly)}
                  onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, webOnly: checked } : current))}
                />
              ) : null}

              {themeLink(draft.id) ? (
                <AdminCheckbox
                  label="Descuento activo"
                  hint={`Controlado por el tema ${themeLink(draft.id)!.themes.join(", ")}: se enciende y se apaga solo con el tema. Ahora está ${themeLink(draft.id)!.on ? "activo" : "pausado"}.`}
                  checked={themeLink(draft.id)!.on}
                  onCheckedChange={() => undefined}
                  disabled
                />
              ) : (
                <AdminCheckbox
                  label="Descuento activo"
                  hint={draft.kind === "code" ? "El codigo se puede usar en el checkout." : "El precio con descuento se muestra en la tienda ahora mismo."}
                  checked={draft.active}
                  onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, active: checked } : current))}
                />
              )}
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
