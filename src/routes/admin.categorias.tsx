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
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  ADMIN_CATEGORIES,
  getAdminCategoryProducts,
  getVibeLabel,
} from "@/lib/admin-service";
import type { AdminCategoryRecord } from "@/lib/admin-types";
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
    label: "",
    isNsfw: false,
    vibes: ["moon"],
    productCount: 0,
  };
}

export const Route = createFileRoute("/admin/categorias")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({ categories: ADMIN_CATEGORIES }),
  head: () => ({ meta: [{ title: "Admin - Categorias" }] }),
  component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
  const { categories } = Route.useLoaderData();
  const [rows, setRows] = useState(() => categories.map(cloneCategory));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<AdminCategoryRecord | null>(categories[0] ? cloneCategory(categories[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((category) => {
      const haystack = `${category.label} ${category.id} ${category.vibes.join(" ")}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((category) => category.id === selectedId) ?? null;
  const relatedProducts = draft ? getAdminCategoryProducts(draft.id) : [];

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
  }, [selected]);

  const toggleVibe = (vibe: Vibe) => {
    setDraft((current) => {
      if (!current) return current;

      const exists = current.vibes.includes(vibe);
      const nextVibes = exists ? current.vibes.filter((entry) => entry !== vibe) : [...current.vibes, vibe];
      return {
        ...current,
        vibes: nextVibes.length ? nextVibes : [vibe],
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
      label: draft.label.trim(),
      id: draft.id.startsWith("draft-category-")
        ? draft.label.trim().toLowerCase().replace(/\s+/g, "-") || draft.id
        : draft.id,
    };

    setRows((current) => {
      const exists = current.some((category) => category.id === draft.id);
      if (!exists) return [normalized, ...current];
      return current.map((category) => (category.id === draft.id ? normalized : category));
    });
    if (selectedId === draft.id) {
      setSelectedId(normalized.id);
    }
    setSaveMessage("Cambios listos en la interfaz. Falta persistir en D1.");
  };

  return (
    <AdminShell
      section="categorias"
      title="Categorias"
      subtitle="Taxonomia compacta con editor lateral. La meta aqui es mantener claro que existe, que es NSFW y en cuales subtiendas debe aparecer."
      actions={
        <AdminButton tone="primary" onClick={handleCreate}>
          Nueva categoria
        </AdminButton>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_390px]">
        <AdminPanel title="Mapa de categorias" eyebrow="Catalogo">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o id"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} categorias
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay categorias aqui"
              body="Prueba otra busqueda o crea una categoria draft para seguir estructurando la tienda."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear categoria
                </AdminButton>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                    <tr>
                      <th className="pb-3 pr-3">Categoria</th>
                      <th className="pb-3 pr-3">Subtiendas</th>
                      <th className="pb-3 pr-3">NSFW</th>
                      <th className="pb-3 pr-3">Productos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((category) => (
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
                            {category.vibes.map((vibe) => (
                              <AdminTag key={vibe}>{getVibeLabel(vibe)}</AdminTag>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          {category.isNsfw ? <AdminTag tone="warn">NSFW</AdminTag> : <AdminTag>SFW</AdminTag>}
                        </td>
                        <td className="py-3 pr-3 font-bold">{category.productCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <AdminPagination page={safePage} pages={pages} onChange={setPage} />
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft?.label || "Editor"}
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

              <AdminField label="Nombre visible">
                <AdminInput
                  value={draft.label}
                  onChange={(event) => setDraft((current) => (current ? { ...current, label: event.target.value } : current))}
                />
              </AdminField>

              <AdminField
                label="Slug interno"
                hint="Si el draft es nuevo, al guardar intentamos normalizarlo desde el nombre."
              >
                <AdminInput
                  value={draft.id}
                  onChange={(event) => setDraft((current) => (current ? { ...current, id: event.target.value } : current))}
                />
              </AdminField>

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
                        className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                          active ? "border-[#231717] bg-[#231717] text-white" : "border-[#231717]/12 bg-[#faf6f0] text-[#5f4941]"
                        }`}
                      >
                        {getVibeLabel(vibe)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <AdminCheckbox
                label="Categoria NSFW"
                checked={draft.isNsfw}
                onCheckedChange={(checked) => setDraft((current) => (current ? { ...current, isNsfw: checked } : current))}
                hint="Si esta activa, esta categoria debe quedar escondida en la tienda general hasta activar el gate NSFW."
              />

              <div className="rounded-2xl border border-[#231717]/10 p-3">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Uso actual</div>
                <div className="mt-2 text-2xl font-black">{relatedProducts.length}</div>
                <div className="mt-1 text-sm text-[#6b5a55]">
                  productos mock encontrados con esta categoria
                </div>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Productos relacionados</div>
                <div className="mt-2 grid gap-2">
                  {relatedProducts.length ? (
                    relatedProducts.slice(0, 8).map((product) => (
                      <div key={product.id} className="rounded-2xl border border-[#231717]/10 px-3 py-2">
                        <div className="text-sm font-bold">{product.name}</div>
                        <div className="mt-1 text-xs text-[#6b5a55]">{getVibeLabel(product.vibe)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#231717]/20 px-3 py-4 text-sm text-[#6b5a55]">
                      Ningun producto mock usa esta categoria todavia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Sin categoria seleccionada"
              body="Selecciona una fila de la tabla o crea una nueva categoria para editar."
              action={
                <AdminButton tone="primary" onClick={handleCreate}>
                  Crear categoria
                </AdminButton>
              }
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
