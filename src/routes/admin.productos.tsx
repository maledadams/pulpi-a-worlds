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
  AdminTextarea,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { formatPrice, getCategoryLabel } from "@/data/products";
import {
  ADMIN_CATEGORIES,
  ADMIN_PRODUCTS,
  getInventoryStatus,
  getInventoryStatusTone,
  getVibeLabel,
} from "@/lib/admin-service";
import type { AdminProductRecord } from "@/lib/admin-types";

const PAGE_SIZE = 8;

function cloneProduct(product: AdminProductRecord): AdminProductRecord {
  return {
    ...product,
    categories: [...product.categories],
    images: [...product.images],
    variants: [...product.variants],
    tags: [...product.tags],
  };
}

function createBlankProduct(): AdminProductRecord {
  return {
    id: `draft-${Date.now()}`,
    slug: "",
    name: "",
    vibe: "moon",
    categories: ["tops"],
    primaryCategory: "tops",
    description: "",
    price: 0,
    compareAtPrice: null,
    available: true,
    stock: 0,
    featured: false,
    newArrival: false,
    isNsfw: false,
    images: [],
    featuredImage: null,
    variants: [],
    tags: [],
    createdAt: new Date().toISOString(),
  };
}

export const Route = createFileRoute("/admin/productos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({ products: ADMIN_PRODUCTS }),
  head: () => ({ meta: [{ title: "Admin - Productos" }] }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { products } = Route.useLoaderData();
  const [rows, setRows] = useState(() => products.map(cloneProduct));
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "moon" | "sunshine" | "men">("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminProductRecord | null>(products[0] ? cloneProduct(products[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((product) => {
      const matchesScope = scope === "all" || product.vibe === scope;
      const haystack = `${product.name} ${product.slug} ${product.categories.join(" ")} ${product.tags.join(" ")}`.toLowerCase();
      const matchesQuery = haystack.includes(lowered);
      return matchesScope && matchesQuery;
    });
  }, [rows, query, scope]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((product) => product.id === selectedId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [query, scope]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    const selectedStillVisible = filtered.some((product) => product.id === selectedId);
    const nextSelected = selectedStillVisible ? selectedId : filtered[0]!.id;
    if (nextSelected !== selectedId) {
      setSelectedId(nextSelected);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(cloneProduct(selected));
  }, [selectedId, selected]);

  const updateDraft = <K extends keyof AdminProductRecord>(key: K, value: AdminProductRecord[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => {
      if (!current) return current;

      const exists = current.categories.includes(categoryId);
      const categories = exists
        ? current.categories.filter((entry) => entry !== categoryId)
        : [...current.categories, categoryId];
      const nextCategories = categories.length ? categories : [categoryId];

      return {
        ...current,
        categories: nextCategories,
        primaryCategory: nextCategories.includes(current.primaryCategory) ? current.primaryCategory : nextCategories[0]!,
        isNsfw: nextCategories.some((entry) => ["lingerie", "kinkwear", "sex-toys"].includes(entry)),
      };
    });
  };

  const handleSave = () => {
    if (!draft) return;

    const normalized = {
      ...draft,
      slug: draft.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      name: draft.name.trim(),
      stock: Math.max(0, Number(draft.stock ?? 0)),
      price: Math.max(0, Number(draft.price)),
      compareAtPrice:
        draft.compareAtPrice && Number(draft.compareAtPrice) > 0 ? Number(draft.compareAtPrice) : null,
    };

    setRows((current) => current.map((product) => (product.id === normalized.id ? normalized : product)));
    setSaveMessage("Cambios listos en la interfaz. Falta conectar persistencia D1.");
  };

  const handleCreate = () => {
    const blank = createBlankProduct();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(cloneProduct(blank));
    setSaveMessage("Nuevo producto draft creado.");
  };

  const handleDuplicate = () => {
    if (!draft) return;
    const duplicate = {
      ...cloneProduct(draft),
      id: `draft-${Date.now()}`,
      slug: `${draft.slug || "producto"}-copy`,
      name: `${draft.name || "Producto"} Copy`,
      createdAt: new Date().toISOString(),
    };
    setRows((current) => [duplicate, ...current]);
    setSelectedId(duplicate.id);
    setDraft(duplicate);
    setSaveMessage("Producto duplicado en la interfaz.");
  };

  return (
    <AdminShell
      section="productos"
      title="Productos"
      subtitle="Catálogo compacto con búsqueda, paginación y editor lateral. Gestiona productos sin perderte entre pantallas gigantes."
      actions={
        <>
          <AdminButton tone="secondary" onClick={handleDuplicate} disabled={!draft}>
            Duplicar
          </AdminButton>
          <AdminButton tone="primary" onClick={handleCreate}>
            Nuevo producto
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_400px]">
        <AdminPanel
          title="Catalogo"
          eyebrow="Productos"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "moon", "sunshine", "men"] as const).map((entry) => (
                <AdminButton
                  key={entry}
                  tone={scope === entry ? "primary" : "ghost"}
                  onClick={() => setScope(entry)}
                >
                  {entry === "all" ? "Todos" : getVibeLabel(entry)}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, slug, categoria o tag"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} resultados
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay productos aqui"
              body="Prueba otro filtro o crea un nuevo producto draft para empezar a estructurar el catalogo."
              action={<AdminButton tone="primary" onClick={handleCreate}>Crear producto</AdminButton>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                    <tr>
                      <th className="pb-3 pr-3">Producto</th>
                      <th className="pb-3 pr-3">Subtienda</th>
                      <th className="pb-3 pr-3">Categorias</th>
                      <th className="pb-3 pr-3">Precio</th>
                      <th className="pb-3 pr-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((product) => (
                      <tr
                        key={product.id}
                        onClick={() => setSelectedId(product.id)}
                        className={`cursor-pointer border-t border-[#231717]/10 align-top transition-colors ${
                          selectedId === product.id ? "bg-[#f7f2ec]" : "hover:bg-[#faf6f0]"
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-bold">{product.name || "Sin nombre"}</div>
                          <div className="text-xs text-[#6b5a55]">{product.slug || "sin-slug"}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <AdminTag>{getVibeLabel(product.vibe)}</AdminTag>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex max-w-[320px] flex-wrap gap-1">
                            {product.categories.map((category) => (
                              <AdminTag
                                key={category}
                                tone={product.isNsfw && ["lingerie", "kinkwear", "sex-toys"].includes(category) ? "warn" : "soft"}
                              >
                                {getCategoryLabel(category)}
                              </AdminTag>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-bold">{formatPrice(product.price)}</td>
                        <td className="py-3 pr-3">
                          <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black uppercase ${getInventoryStatusTone(product)}`}>
                            {getInventoryStatus(product)}
                          </span>
                        </td>
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
          title={draft?.name || "Editor"}
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

              <div
                className="aspect-[1.2/1] rounded-3xl border border-[#231717]/10"
                style={{
                  background: `linear-gradient(135deg, ${
                    draft.vibe === "moon" ? "#45121e" : draft.vibe === "men" ? "#241d1d" : "#ffd1e5"
                  }, ${draft.vibe === "sunshine" ? "#fff4a3" : "#f7efe7"})`,
                }}
              >
                {draft.featuredImage?.url ? (
                  <img src={draft.featuredImage.url} alt={draft.name} className="h-full w-full rounded-3xl object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl font-black text-white/80">
                    {(draft.name || "NP").slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <AdminField label="Nombre">
                  <AdminInput value={draft.name} onChange={(e) => updateDraft("name", e.target.value)} />
                </AdminField>
                <AdminField label="Slug">
                  <AdminInput value={draft.slug} onChange={(e) => updateDraft("slug", e.target.value)} />
                </AdminField>
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Subtienda">
                    <AdminSelect value={draft.vibe} onChange={(e) => updateDraft("vibe", e.target.value as AdminProductRecord["vibe"])}>
                      <option value="moon">Moon</option>
                      <option value="sunshine">Sunshine</option>
                      <option value="men">Men</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Categoria principal">
                    <AdminSelect value={draft.primaryCategory} onChange={(e) => updateDraft("primaryCategory", e.target.value)}>
                      {ADMIN_CATEGORIES.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </AdminSelect>
                  </AdminField>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Precio">
                    <AdminInput type="number" value={draft.price} onChange={(e) => updateDraft("price", Number(e.target.value))} />
                  </AdminField>
                  <AdminField label="Precio oferta">
                    <AdminInput
                      type="number"
                      value={draft.compareAtPrice ?? ""}
                      onChange={(e) => updateDraft("compareAtPrice", e.target.value ? Number(e.target.value) : null)}
                    />
                  </AdminField>
                </div>
                <AdminField label="Stock">
                  <AdminInput type="number" value={draft.stock ?? 0} onChange={(e) => updateDraft("stock", Number(e.target.value))} />
                </AdminField>
                <AdminField label="Descripcion">
                  <AdminTextarea rows={5} value={draft.description} onChange={(e) => updateDraft("description", e.target.value)} />
                </AdminField>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Categorias asignadas</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ADMIN_CATEGORIES.map((category) => {
                    const active = draft.categories.includes(category.id);
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

              <div className="grid gap-3">
                <AdminCheckbox
                  label="Disponible"
                  checked={draft.available}
                  onCheckedChange={(checked) => updateDraft("available", checked)}
                />
                <AdminCheckbox
                  label="Destacado"
                  checked={draft.featured}
                  onCheckedChange={(checked) => updateDraft("featured", checked)}
                />
                <AdminCheckbox
                  label="Nuevo"
                  checked={draft.newArrival}
                  onCheckedChange={(checked) => updateDraft("newArrival", checked)}
                />
                <AdminCheckbox
                  label="NSFW"
                  checked={draft.isNsfw}
                  onCheckedChange={(checked) => updateDraft("isNsfw", checked)}
                  hint="Marca visual y de logica para gate en tienda general."
                />
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Variantes actuales</div>
                <div className="mt-2 grid gap-2">
                  {draft.variants.length ? (
                    draft.variants.slice(0, 6).map((variant) => (
                      <div key={variant.id} className="rounded-2xl border border-[#231717]/10 px-3 py-2">
                        <div className="text-sm font-bold">{variant.title}</div>
                        <div className="mt-1 text-xs text-[#6b5a55]">
                          {variant.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#231717]/20 px-3 py-4 text-sm text-[#6b5a55]">
                      Este draft aun no tiene variantes reales. La estructura D1 ya esta preparada para eso.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Sin seleccion"
              body="Selecciona un producto de la lista o crea uno nuevo para empezar a editar."
              action={<AdminButton tone="primary" onClick={handleCreate}>Crear producto</AdminButton>}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}

