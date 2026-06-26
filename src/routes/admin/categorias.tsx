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
  confirmAdminDestructiveAction,
  getAdminVibeButtonClassName,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  deleteAdminCategory,
  getAdminCategories,
  getAdminSizeFormats,
  saveAdminCategory,
  saveAdminSizeFormat,
} from "@/lib/admin-content";
import { getAdminCatalogProducts } from "@/lib/catalog";
import {
  cloneSizeFormat,
  getSizeFormatRecord,
  normalizeSizeLabel,
} from "@/lib/product-sizing";
import { getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminSizeFormatRecord } from "@/lib/admin-types";
import type { Vibe } from "@/data/products";

const PAGE_SIZE = 9;

function cloneCategory(category: AdminCategoryRecord): AdminCategoryRecord {
  return {
    ...category,
    vibes: [...category.vibes],
  };
}

function createBlankCategory(): AdminCategoryRecord {
  return {
    id: `draft-category-${Date.now()}`,
    previousId: undefined,
    label: "",
    isNsfw: false,
    vibes: ["moon"],
    sizeFormat: "standard",
    productCount: 0,
    sortOrder: 0,
  };
}

export const Route = createFileRoute("/admin/categorias")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({
    categories: await getAdminCategories(),
    products: await getAdminCatalogProducts(),
    sizeFormats: await getAdminSizeFormats(),
  }),
  head: () => ({ meta: [{ title: "Admin - Categorias" }] }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const { categories, products, sizeFormats: initialSizeFormats } = Route.useLoaderData();
  const [rows, setRows] = useState(() => categories.map(cloneCategory));
  const [sizeFormats, setSizeFormats] = useState(() => initialSizeFormats.map(cloneSizeFormat));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<AdminCategoryRecord | null>(categories[0] ? cloneCategory(categories[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReplacementId, setDeleteReplacementId] = useState("");
  const [selectedFormatId, setSelectedFormatId] = useState<AdminSizeFormatRecord["id"]>(initialSizeFormats[0]?.id ?? "standard");
  const [formatMessage, setFormatMessage] = useState("");
  const [newSize, setNewSize] = useState("");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((category) => {
      const haystack = `${category.label} ${category.id} ${category.vibes.join(" ")} ${category.sizeFormat}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((category) => category.id === selectedId) ?? null;
  const selectedFormat = sizeFormats.find((format) => format.id === selectedFormatId) ?? getSizeFormatRecord(selectedFormatId, sizeFormats);
  const usedSizesForSelectedFormat = useMemo(() => {
    const categoryById = new Map(rows.map((category) => [category.id, category]));
    return new Set(
      products
        .filter((product) => {
          const category = categoryById.get(product.primaryCategory);
          return (category?.sizeFormat ?? "standard") === selectedFormatId;
        })
        .flatMap((product) => product.sizes),
    );
  }, [products, rows, selectedFormatId]);

  useEffect(() => {
    setPage(0);
  }, [query]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((category) => category.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(cloneCategory(selected));
    setDeleteReplacementId("");
  }, [selected]);

  const toggleVibe = (vibe: Vibe) => {
    setDraft((current) => {
      if (!current) return current;

      const exists = current.vibes.includes(vibe);
      const nextVibes = exists ? current.vibes.filter((entry) => entry !== vibe) : [...current.vibes, vibe];
      return {
        ...current,
        vibes: nextVibes.length > 0 ? nextVibes : [vibe],
      };
    });
  };

  const handleCreate = () => {
    const blank = createBlankCategory();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(blank);
    setSaveMessage("Nueva categoria draft creada.");
  };

  const handleSave = () => {
    if (!draft) return;

    const normalized = {
      ...draft,
      previousId: draft.id.startsWith("draft-category-") ? undefined : selected?.id ?? draft.previousId,
      label: draft.label.trim(),
      id: draft.id.startsWith("draft-category-")
        ? draft.label.trim().toLowerCase().replace(/\s+/g, "-") || draft.id
        : draft.id,
    };

    void saveAdminCategory({ data: normalized })
      .then((saved) => {
        setRows((current) => {
          const exists = current.some((category) => category.id === draft.id || category.id === saved.id);
          if (!exists) return [saved, ...current];
          return current.map((category) => (category.id === draft.id || category.id === saved.id ? saved : category));
        });
        setSelectedId(saved.id);
        setDraft(cloneCategory(saved));
        setSaveMessage("Categoria guardada.");
      })
      .catch(() => {
        setSaveMessage("No se pudo guardar la categoria ahora mismo.");
      });
  };

  const handleDelete = () => {
    if (!draft) return;
    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar la categoria ${draft.label || draft.id}. Esta accion puede afectar productos enlazados. ¿Quieres continuar?`,
      )
    ) {
      return;
    }

    if (draft.id.startsWith("draft-category-")) {
      setRows((current) => current.filter((category) => category.id !== draft.id));
      setSaveMessage("Categoria draft eliminada.");
      return;
    }

    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminCategory({ data: { id: draft.id, replacementCategoryId: deleteReplacementId || undefined } })
      .then(() => {
        setRows((current) => current.filter((category) => category.id !== draft.id));
        setSaveMessage("Categoria eliminada.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la categoria.");
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const updateSelectedFormat = (updater: (current: AdminSizeFormatRecord) => AdminSizeFormatRecord) => {
    setSizeFormats((current) =>
      current.map((format) => (format.id === selectedFormatId ? updater(cloneSizeFormat(format)) : format)),
    );
  };

  const handleAddSize = () => {
    const normalized = normalizeSizeLabel(newSize);
    if (!normalized) return;

    updateSelectedFormat((current) => {
      if (current.sizes.includes(normalized)) return current;
      return {
        ...current,
        sizes: [...current.sizes, normalized],
      };
    });
    setNewSize("");
    setFormatMessage("");
  };

  const handleRemoveSize = (size: string) => {
    if (usedSizesForSelectedFormat.has(size)) {
      setFormatMessage("No puedes quitar una talla que ya esta en uso en productos guardados.");
      return;
    }
    if (!confirmAdminDestructiveAction(`Vas a quitar la talla ${size} de este formato. ¿Quieres continuar?`)) {
      return;
    }

    updateSelectedFormat((current) => {
      if (current.sizes.length <= 1) return current;
      return {
        ...current,
        sizes: current.sizes.filter((entry) => entry !== size),
      };
    });
    setFormatMessage("");
  };

  const handleSaveFormat = () => {
    const payload = {
      ...selectedFormat,
      sizes: selectedFormat.sizes,
    };

    void saveAdminSizeFormat({ data: payload })
      .then((saved) => {
        setSizeFormats((current) => current.map((format) => (format.id === saved.id ? cloneSizeFormat(saved) : format)));
        setFormatMessage("Formato guardado.");
      })
      .catch(() => {
        setFormatMessage("No se pudo guardar el formato de tallas.");
      });
  };

  return (
    <AdminShell
      section="categorias"
      title="Categorias"
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nueva categoria
        </AdminButton>
      }
    >
      <div className="grid gap-4 xl:auto-rows-fr xl:grid-cols-[minmax(0,1.1fr)_430px]">
        <AdminPanel>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o id" />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} categorias
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay categorias aqui"
              body="Prueba otra busqueda o crea una categoria nueva."
              action={<AdminButton tone="primary" onClick={handleCreate}>Crear categoria</AdminButton>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                    <tr>
                      <th className="pb-3 pr-3">Categoria</th>
                      <th className="pb-3 pr-3">Subtiendas</th>
                      <th className="pb-3 pr-3">Formato</th>
                      <th className="pb-3 pr-3">Productos</th>
                      <th className="pb-3 pr-3">Orden</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((category) => {
                      const format = getSizeFormatRecord(category.sizeFormat, sizeFormats);
                      return (
                        <tr
                          key={category.id}
                          onClick={() => setSelectedId(category.id)}
                          className={`cursor-pointer border-t border-[#231717]/10 transition-colors ${
                            selectedId === category.id ? "bg-[#f7f2ec]" : "hover:bg-[#faf6f0]"
                          }`}
                        >
                          <td className="py-3 pr-3">
                            <div className="font-bold">{category.label || "Sin nombre"}</div>
                            <div className="text-xs text-[#6b5a55]">{category.id}</div>
                          </td>
                          <td className="py-3 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {category.vibes
                                .filter((vibe): vibe is "moon" | "sunshine" | "men" => vibe !== "pulpina")
                                .map((vibe) => (
                                <span
                                  key={vibe}
                                  className={getAdminVibeButtonClassName(vibe, true, "pointer-events-none px-2.5 py-1 text-[11px] shadow-none")}
                                >
                                  {getVibeLabel(vibe)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <AdminTag tone={category.sizeFormat === "shoes" ? "warn" : category.sizeFormat === "onesize" ? "soft" : "dark"}>
                              {format.label}
                            </AdminTag>
                          </td>
                          <td className="py-3 pr-3 font-bold">{category.productCount}</td>
                          <td className="py-3 pr-3 font-bold">{category.sortOrder}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <AdminPagination page={safePage} pages={pages} onChange={setPage} />
              </div>
            </>
          )}
        </AdminPanel>

        <div className="grid auto-rows-fr gap-4">
          <AdminPanel
            title={draft?.label || "Editor"}
            className="h-full"
            actions={
              <div className="flex flex-wrap gap-2">
                <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isDeleting}>
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </AdminButton>
                <AdminButton tone="primary" onClick={handleSave} disabled={!draft || isDeleting}>
                  Guardar
                </AdminButton>
              </div>
            }
          >
            {draft ? (
              <div className="grid h-full content-start gap-4">
                {saveMessage ? (
                  <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                    {saveMessage}
                  </div>
                ) : null}

                <AdminField label="Nombre visible">
                  <AdminInput value={draft.label} onChange={(event) => setDraft((current) => (current ? { ...current, label: event.target.value } : current))} />
                </AdminField>

                <AdminField label="Orden de navegacion">
                  <AdminInput
                    type="number"
                    value={draft.sortOrder}
                    onChange={(event) =>
                      setDraft((current) =>
                        current ? { ...current, sortOrder: Math.max(0, Number(event.target.value) || 0) } : current,
                      )
                    }
                  />
                </AdminField>

                <AdminCheckbox
                  label="Categoria NSFW"
                  checked={draft.isNsfw}
                  hint="Marca esta categoria como solo para contenido adulto y control de visibilidad."
                  onCheckedChange={(checked) =>
                    setDraft((current) => (current ? { ...current, isNsfw: checked } : current))
                  }
                />

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Subtiendas activas</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(["moon", "sunshine", "men"] as const).map((vibe) => {
                      const active = draft.vibes.includes(vibe);
                      return (
                        <button
                          key={vibe}
                          type="button"
                          onClick={() => toggleVibe(vibe)}
                          className={getAdminVibeButtonClassName(vibe, active, "px-3 py-3 text-sm")}
                        >
                          {getVibeLabel(vibe)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AdminField label="Formato de tallas">
                  <AdminSelect value={draft.sizeFormat} onChange={(event) => setDraft((current) => (current ? { ...current, sizeFormat: event.target.value as AdminCategoryRecord["sizeFormat"] } : current))}>
                    {sizeFormats.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>

                <AdminField
                  label="Reasignar antes de eliminar"
                  hint="Si la categoria ya esta siendo usada, elige aqui a donde migrarla antes de borrarla."
                >
                  <AdminSelect value={deleteReplacementId} onChange={(event) => setDeleteReplacementId(event.target.value)}>
                    <option value="">Sin reemplazo</option>
                    {rows
                      .filter((category) => category.id !== draft.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                  </AdminSelect>
                </AdminField>

              </div>
            ) : (
              <AdminEmptyState
                title="Sin categoria seleccionada"
                body="Selecciona una fila de la tabla o crea una nueva categoria para editar."
                action={<AdminButton tone="primary" onClick={handleCreate}>Crear categoria</AdminButton>}
              />
            )}
          </AdminPanel>

          <AdminPanel
            title="Formatos de talla"
            className="h-full"
            actions={
              <AdminButton tone="primary" onClick={handleSaveFormat}>
                Guardar formato
              </AdminButton>
            }
          >
              <div className="grid h-full content-start gap-4">
              {formatMessage ? (
                <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                  {formatMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {sizeFormats.map((format) => (
                  <AdminButton
                    key={format.id}
                    tone={selectedFormatId === format.id ? "active" : "ghost"}
                    onClick={() => {
                      setSelectedFormatId(format.id);
                      setFormatMessage("");
                      setNewSize("");
                    }}
                  >
                    {format.label}
                  </AdminButton>
                ))}
              </div>

              <AdminField label="Nombre del formato">
                <AdminInput
                  value={selectedFormat.label}
                  onChange={(event) => {
                    const nextLabel = event.target.value;
                    updateSelectedFormat((current) => ({ ...current, label: nextLabel }));
                  }}
                />
              </AdminField>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Tallas disponibles</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedFormat.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleRemoveSize(size)}
                      disabled={usedSizesForSelectedFormat.has(size)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                        usedSizesForSelectedFormat.has(size)
                          ? "cursor-not-allowed border-[#231717]/10 bg-[#efebe7] text-[#a08f87]"
                          : "border-[#231717]/15 bg-[#faf6f0] text-[#5f4941] hover:border-[#231717] hover:bg-[#f3eadf]"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <AdminField label="Agregar talla nueva">
                  <AdminInput
                    value={newSize}
                    onChange={(event) => setNewSize(event.target.value)}
                    placeholder={selectedFormat.id === "shoes" ? "Ej: 47" : "Ej: 7XL"}
                  />
                </AdminField>
                <div className="flex items-end">
                  <AdminButton tone="secondary" onClick={handleAddSize}>
                    Agregar talla
                  </AdminButton>
                </div>
              </div>

            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
