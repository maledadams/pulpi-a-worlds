import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {  AdminButton,
  AdminCheckbox,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminPagination,
  AdminSectionLabel,
  AdminSelect,
  AdminToast,
  type AdminToastTone,
  AdminTextarea,
  confirmAdminDestructiveAction,
  getAdminVibeButtonClassName,
} from "@/components/admin/AdminControls";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { matchesAdminSearch } from "@/lib/admin-search";
import {
  deleteAdminCollection,
  getAdminCategories,
  getAdminCollections,
  saveAdminCollection,
} from "@/lib/admin-content";
import { getAdminCatalogProducts } from "@/lib/catalog";
import { getCompactCategoryLabel, getVibeLabel } from "@/lib/admin-service";
import type { AdminCollectionRecord } from "@/lib/admin-types";

const PAGE_SIZE = 6;

function cloneCollection(collection: AdminCollectionRecord): AdminCollectionRecord {
  return {
    ...collection,
    categoryIds: [...collection.categoryIds],
    productIds: [...collection.productIds],
  };
}

function createBlankCollection(): AdminCollectionRecord {
  return {
    id: `draft-collection-${Date.now()}`,
    slug: "",
    name: "",
    description: "",
    vibe: "store",
    published: true,
    showOnHome: false,
    homeOrder: 0,
    categoryIds: [],
    productIds: [],
  };
}

function getResolvedCollectionCount(collection: AdminCollectionRecord, products: Awaited<ReturnType<typeof getAdminCatalogProducts>>) {
  const scopedProducts =
    collection.vibe === "store"
      ? products
      : products.filter((product) => product.vibe === collection.vibe);
  const explicitIds = collection.productIds;
  const categoryIds = new Set(collection.categoryIds);
  return scopedProducts.filter((product) => {
    if (explicitIds.includes(product.id)) return true;
    return categoryIds.size > 0 && product.categories.some((category) => categoryIds.has(category));
  }).length;
}

export const Route = createFileRoute("/admin/colecciones")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => {
    const [products, categories, collections] = await Promise.all([
      getAdminCatalogProducts(),
      getAdminCategories(),
      getAdminCollections(),
    ]);
    return { categories, collections, products };
  },
  head: () => ({ meta: [{ title: "Admin - Colecciones" }] }),
  component: AdminCollectionsPage,
});

function AdminCollectionsPage() {
  const { categories, collections, products } = Route.useLoaderData();
  const [rows, setRows] = useState(() => collections.map(cloneCollection));
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "store" | "moon" | "sunshine" | "men">("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(collections[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminCollectionRecord | null>(collections[0] ? cloneCollection(collections[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveTone, setSaveTone] = useState<AdminToastTone>("info");
  const showSaveMessage = (text: string, tone: AdminToastTone = "info") => {
    setSaveMessage(text);
    setSaveTone(tone);
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((collection) => {
      const matchesScope = scope === "all" || collection.vibe === scope;
      return (
        matchesScope &&
        matchesAdminSearch([collection.name, collection.description, collection.id, collection.slug], query)
      );
    });
  }, [rows, query, scope]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((collection) => collection.id === selectedId) ?? null;

  const assignableProducts = useMemo(() => {
    if (!draft) return [];
    return products.filter((product) => draft.vibe === "store" || product.vibe === draft.vibe);
  }, [draft, products]);
  const filteredAssignableProducts = useMemo(() => {
    return assignableProducts.filter((product) =>
      matchesAdminSearch([product.name, product.id, product.slug, ...product.tags], productQuery),
    );
  }, [assignableProducts, productQuery]);

  useEffect(() => {
    setPage(0);
  }, [query, scope]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((collection) => collection.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(cloneCollection(selected));
    setProductQuery("");
  }, [selected]);

  useEffect(() => {
    if (!saveMessage) return;
    const timeout = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const active = current.categoryIds.includes(categoryId);
      return {
        ...current,
        categoryIds: active ? current.categoryIds.filter((entry) => entry !== categoryId) : [...current.categoryIds, categoryId],
      };
    });
  };

  const toggleProduct = (productId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const active = current.productIds.includes(productId);
      return {
        ...current,
        productIds: active ? current.productIds.filter((entry) => entry !== productId) : [...current.productIds, productId],
      };
    });
  };

  const handleCreate = () => {
    const blank = createBlankCollection();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(blank);
    showSaveMessage("Nueva coleccion draft creada.", "success");
  };

  const performSave = (value: AdminCollectionRecord, options: { silent?: boolean } = {}) => {
    const normalized = {
      ...value,
      slug: value.name.trim().toLowerCase().replace(/\s+/g, "-"),
      name: value.name.trim(),
      description: value.description.trim(),
    };

    return saveAdminCollection({ data: normalized }).then((saved) => {
      setRows((current) => {
        const exists = current.some((collection) => collection.id === value.id || collection.id === saved.id);
        if (!exists) return [saved, ...current];
        return current.map((collection) =>
          collection.id === value.id || collection.id === saved.id ? saved : collection,
        );
      });
      if (saved.id !== value.id) setSelectedId(saved.id);
      setDraft((current) => (current && current.id === value.id ? cloneCollection(saved) : current));
      if (!options.silent) showSaveMessage("Coleccion guardada.", "success");
    });
  };

  const autosave = useAdminAutosave(draft, (value) => performSave(value, { silent: true }), {
    resetKey: selectedId,
  });

  const handleSave = () => {
    if (!draft) return;
    void performSave(draft).catch((error) => {
      showSaveMessage(getAdminErrorMessage(error, "No se pudo guardar la coleccion ahora mismo."), "error");
    });
  };

  const handleDelete = () => {
    if (!draft) return;

    const productCount = getResolvedCollectionCount(draft, products);
    const warnings = [
      productCount > 0 ? `tiene ${productCount} producto(s) asignado(s)` : null,
      draft.showOnHome ? "se muestra actualmente en el inicio" : null,
    ].filter((entry): entry is string => Boolean(entry));
    const warningText = warnings.length > 0 ? ` Esta coleccion ${warnings.join(" y ")}.` : "";

    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar la coleccion ${draft.name || draft.id}.${warningText} Esta accion no se puede deshacer. ¿Quieres continuar?`,
      )
    ) {
      return;
    }

    if (draft.id.startsWith("draft-collection-")) {
      setRows((current) => current.filter((collection) => collection.id !== draft.id));
      showSaveMessage("Coleccion draft eliminada.", "success");
      return;
    }

    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminCollection({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((collection) => collection.id !== draft.id));
        showSaveMessage("Coleccion eliminada.", "success");
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo eliminar la coleccion."), "error");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  return (
    <AdminShell
      section="colecciones"
      title="Colecciones"
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nueva coleccion
        </AdminButton>
      }
    >
      <div className="grid grid-cols-1 gap-4">
        <AdminPanel
          title="Colecciones"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "store", "moon", "sunshine", "men"] as const).map((entry) => (
                <AdminButton
                  key={entry}
                  tone={entry === "all" || entry === "store" ? (scope === entry ? "active" : "ghost") : "custom"}
                  className={
                    entry === "moon" || entry === "sunshine" || entry === "men"
                      ? getAdminVibeButtonClassName(entry, scope === entry)
                      : undefined
                  }
                  onClick={() => setScope(entry)}
                >
                  {entry === "all" ? "Todas" : getVibeLabel(entry)}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o descripcion"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} colecciones
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay colecciones aqui"
              body="Prueba otro filtro o crea una nueva coleccion draft para seguir armando la tienda."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear coleccion
                </AdminButton>
              }
            />
          ) : (
            <>
              <div className="grid gap-3 lg:grid-cols-2">
                {paged.map((collection) => (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => setSelectedId(collection.id)}
                    className={`rounded-3xl border p-4 text-left transition-colors ${
                      selectedId === collection.id
                        ? "border-[#231717] bg-[#f7f2ec]"
                        : "border-[#231717]/10 bg-[#faf6f0] hover:bg-[#f3eadf]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black">{collection.name || "Sin nombre"}</div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-1">
                        {collection.published ? <AdminTag tone="dark">Publica</AdminTag> : <AdminTag tone="warn">Oculta</AdminTag>}
                        {collection.showOnHome ? <AdminTag tone="soft">Inicio #{collection.homeOrder}</AdminTag> : null}
                      </div>
                    </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                      <AdminTag>{getVibeLabel(collection.vibe)}</AdminTag>
                      <AdminTag>{getResolvedCollectionCount(collection, products)} productos</AdminTag>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <AdminPagination page={safePage} pages={pages} onChange={setPage} />
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft?.name || "Editor"}
          actions={
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isDeleting}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </AdminButton>
              <AdminButton tone="primary" onClick={handleSave} disabled={!draft || isDeleting}>
                Guardar
              </AdminButton>            </div>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              <AdminField label="Nombre">
                <AdminInput value={draft.name} onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))} />
              </AdminField>
              <AdminField label="Subtienda">
                <AdminSelect value={draft.vibe} onChange={(event) => setDraft((current) => (current ? { ...current, vibe: event.target.value as AdminCollectionRecord["vibe"], productIds: [] } : current))}>
                  <option value="store">General</option>
                  <option value="moon">Moon</option>
                  <option value="sunshine">Sunshine</option>
                  <option value="men">Men</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Descripcion">
                <AdminTextarea rows={4} value={draft.description} onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))} />
              </AdminField>
              <AdminCheckbox
                label="Publicar coleccion"
                hint="Si esta apagada, la pagina de la coleccion no existe y no aparece en el sitemap."
                checked={draft.published}
                onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, published: checked } : current))}
              />
              <AdminCheckbox
                label="Mostrar en inicio"
                checked={draft.showOnHome}
                hint="Si esta activa, esta coleccion se publica como rail editable en el inicio."
                onCheckedChange={(checked) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          showOnHome: checked,
                          homeOrder: checked ? current.homeOrder : 0,
                        }
                      : current,
                  )
                }
              />
              <AdminField label="Orden en inicio" hint="Menor numero = aparece antes en el home.">
                <AdminInput
                  type="number"
                  min={0}
                  value={draft.homeOrder}
                  disabled={!draft.showOnHome}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, homeOrder: Math.max(0, Number(event.target.value) || 0) }
                        : current,
                    )
                  }
                  />
              </AdminField>

              <div>
                <AdminSectionLabel>Categorias destacadas</AdminSectionLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((category) => {
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

              <div>
                <div className="flex items-center justify-between gap-3">
                  <AdminSectionLabel>Productos incluidos</AdminSectionLabel>
                  <div className="text-xs font-semibold text-[#6b5a55]">{draft.productIds.length} seleccionados</div>
                </div>
                <div className="mt-2">
                  <AdminInput
                    value={productQuery}
                    onChange={(event) => setProductQuery(event.target.value)}
                    placeholder="Buscar producto por nombre, id o slug"
                  />
                </div>
                <div className="mt-2 grid max-h-[320px] gap-2 overflow-y-auto pr-1">
                  {filteredAssignableProducts.map((product) => {
                    const active = draft.productIds.includes(product.id);
                    return (
                      <label
                        key={product.id}
                        className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                          active ? "border-[#231717] bg-[#f7f2ec]" : "border-[#231717]/10 bg-[#faf6f0]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleProduct(product.id)}
                          className="mt-1 h-4 w-4 rounded border-[#231717] accent-[#231717]"
                        />
                        <span className="min-w-0">
                          <span className="block font-normal">{product.name}</span>
                          <span className="mt-0.5 block text-xs text-[#6b5a55]">
                            {getVibeLabel(product.vibe)} / {getCompactCategoryLabel(product.primaryCategory)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Sin coleccion seleccionada"
              body="Selecciona una coleccion o crea una nueva para editar su contenido."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear coleccion
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
