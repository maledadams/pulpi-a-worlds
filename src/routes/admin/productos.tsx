import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  AdminTextarea,
  confirmAdminDestructiveAction,
  getAdminVibeButtonClassName,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  deleteAdminProductImage,
  getAdminCategories,
  getAdminSizeFormats,
  uploadAdminProductImage,
} from "@/lib/admin-content";
import {
  deleteAdminCatalogProduct,
  getAdminCatalogProducts,
  saveAdminCatalogProduct,
} from "@/lib/catalog";
import { formatPrice, getCategoryLabel } from "@/data/products";
import { PRODUCT_COLOR_PRESETS, buildProductColorRecord, normalizeProductColorName } from "@/lib/product-colors";
import { getSizeOptionsForFormat, normalizeSizeList } from "@/lib/product-sizing";
import { getInventoryStatus, getInventoryStatusTone, getVibeLabel } from "@/lib/admin-service";
import type { AdminCategoryRecord, AdminProductRecord, AdminSizeFormatRecord } from "@/lib/admin-types";

const PAGE_SIZE = 8;

function cloneProduct(product: AdminProductRecord): AdminProductRecord {
  return {
    ...product,
    categories: [...product.categories],
    images: product.images.map((image) => ({ ...image })),
    featuredImage: product.featuredImage ? { ...product.featuredImage } : null,
    sizes: [...product.sizes],
    colors: product.colors.map((color) => ({ ...color })),
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
  return `${slug.trim().toLowerCase().replace(/\s+/g, "-") || "product"}-${size}-${color}`
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

function syncDraftVariants(product: AdminProductRecord): AdminProductRecord {
  const slug = product.slug || product.name || product.id;
  const colorNames = product.colors.map((color) => normalizeProductColorName(color.name));
  const currentVariants = new Map(
    product.variants.map((variant) => {
      const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
      const color = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? colorNames[0] ?? "Unica";
      return [variantKey(size, color), variant] as const;
    }),
  );

  const variants = product.sizes.flatMap((size) =>
    colorNames.map((colorName) => {
      const existing = currentVariants.get(variantKey(size, colorName));
      return {
        id: existing?.id ?? buildVariantId(slug, size, colorName),
        title: colorNames.length > 1 ? `${size} / ${colorName}` : size,
        available: existing?.available ?? product.available,
        quantityAvailable: existing?.quantityAvailable ?? 0,
        price: existing?.price ?? product.price,
        compareAtPrice: existing?.compareAtPrice ?? product.compareAtPrice,
        currencyCode: existing?.currencyCode ?? "DOP",
        image: existing?.image ?? product.featuredImage ?? null,
        selectedOptions: [
          { name: "Talla", value: size },
          { name: "Color", value: colorName },
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

function createBlankProduct(categories: AdminCategoryRecord[], sizeFormats: AdminSizeFormatRecord[]): AdminProductRecord {
  const primaryCategory = categories[0]?.id ?? "tops";
  const initialSizes = getAllowedSizes(categories, sizeFormats, primaryCategory);
  return syncDraftVariants({
    id: `draft-${Date.now()}`,
    slug: "",
    name: "",
    vibe: "moon",
    sortOrder: 0,
    categories: [primaryCategory],
    primaryCategory,
    description: "",
    price: 0,
    compareAtPrice: null,
    available: true,
    hidden: false,
    stock: 0,
    featured: false,
    newArrival: false,
    isNsfw: false,
    images: [],
    featuredImage: null,
    sizes: initialSizes.length > 0 ? initialSizes.slice(0, Math.min(3, initialSizes.length)) : ["Unica"],
    colors: [buildProductColorRecord("black")],
    variants: [],
    tags: [],
    createdAt: new Date().toISOString(),
  });
}

function getCategoryRecord(categories: AdminCategoryRecord[], categoryId: string) {
  return categories.find((category) => category.id === categoryId) ?? categories[0] ?? null;
}

function getAllowedSizes(
  categories: AdminCategoryRecord[],
  sizeFormats: AdminSizeFormatRecord[],
  categoryId: string,
) {
  const category = getCategoryRecord(categories, categoryId);
  return getSizeOptionsForFormat(category?.sizeFormat ?? "standard", sizeFormats);
}

function normalizeDraftForSave(draft: AdminProductRecord) {
  const normalizedColors = Array.from(
    new Map(
      draft.colors
        .map((color) => buildProductColorRecord(color.name, color.hex))
        .map((color) => [normalizeProductColorName(color.name).toLowerCase(), color] as const),
    ).values(),
  );
  const trimmedImages = draft.images.slice(0, 5).map((image) => ({
    url: image.url,
    altText: image.altText?.trim() || draft.name.trim() || null,
  }));
  const featuredImage =
    trimmedImages.find((image) => image.url === draft.featuredImage?.url) ?? trimmedImages[0] ?? null;

  const normalizedVariants = syncDraftVariants({
    ...draft,
    slug: draft.slug.trim().toLowerCase().replace(/\s+/g, "-"),
    name: draft.name.trim(),
    description: draft.description.trim(),
    sortOrder: Math.max(0, Number(draft.sortOrder ?? 0)),
    stock: Math.max(0, Number(draft.stock ?? 0)),
    price: Math.max(0, Number(draft.price)),
    compareAtPrice:
      draft.compareAtPrice && Number(draft.compareAtPrice) > 0 ? Number(draft.compareAtPrice) : null,
    images: trimmedImages,
    featuredImage,
    sizes: normalizeSizeList(draft.sizes),
    colors: normalizedColors.length > 0 ? normalizedColors : [buildProductColorRecord("black")],
    variants: draft.variants.map((variant) => ({
      ...variant,
      available: variant.available,
      quantityAvailable: Math.max(0, Number(variant.quantityAvailable ?? 0)),
      price: Math.max(0, Number(variant.price ?? draft.price)),
      compareAtPrice:
        variant.compareAtPrice && Number(variant.compareAtPrice) > 0 ? Number(variant.compareAtPrice) : null,
    })),
  } satisfies AdminProductRecord);

  return {
    ...normalizedVariants,
    stock: normalizedVariants.variants.reduce((sum, variant) => sum + Math.max(0, variant.quantityAvailable ?? 0), 0),
  } satisfies AdminProductRecord;
}

export const Route = createFileRoute("/admin/productos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({
    categories: await getAdminCategories(),
    sizeFormats: await getAdminSizeFormats(),
    products: await getAdminCatalogProducts(),
  }),
  head: () => ({ meta: [{ title: "Admin - Productos" }] }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { categories, products, sizeFormats } = Route.useLoaderData();
  const [rows, setRows] = useState(() => products.map(cloneProduct));
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "moon" | "sunshine" | "men">("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminProductRecord | null>(products[0] ? cloneProduct(products[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((product) => {
      const matchesScope = scope === "all" || product.vibe === scope;
      const haystack = `${product.name} ${product.slug} ${product.id} ${product.categories.join(" ")}`.toLowerCase();
      return matchesScope && haystack.includes(lowered);
    });
  }, [rows, query, scope]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((product) => product.id === selectedId) ?? null;
  const sizeOptions = getAllowedSizes(categories, sizeFormats, draft?.primaryCategory ?? "tops");
  const activeColorKeys = useMemo(
    () => new Set((draft?.colors ?? []).map((color) => normalizeProductColorName(color.name).toLowerCase())),
    [draft],
  );
  const canUploadImages = Boolean(draft && !draft.id.startsWith("draft-") && draft.images.length < 5);

  useEffect(() => {
    setPage(0);
  }, [query, scope]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((product) => product.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(syncDraftVariants(cloneProduct(selected)));
    setSelectedImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [selected]);

  useEffect(() => {
    if (!saveMessage) return;
    const timeout = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const updateDraft = <K extends keyof AdminProductRecord>(key: K, value: AdminProductRecord[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const applyPrimaryCategory = (nextCategoryId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const allowedSizes = getAllowedSizes(categories, sizeFormats, nextCategoryId);
      const nextSizes = current.sizes.filter((size) => allowedSizes.includes(size));

      return syncDraftVariants({
        ...current,
        primaryCategory: nextCategoryId,
        categories: current.categories.includes(nextCategoryId) ? current.categories : [nextCategoryId, ...current.categories],
        sizes: nextSizes.length > 0 ? nextSizes : [allowedSizes[0]!],
      });
    });
  };

  const toggleCategory = (categoryId: string) => {
    setDraft((current) => {
      if (!current) return current;
      const exists = current.categories.includes(categoryId);
      const nextCategories = exists
        ? current.categories.filter((entry) => entry !== categoryId)
        : [...current.categories, categoryId];
      const safeCategories = nextCategories.length > 0 ? nextCategories : [categoryId];
      const nextPrimary = safeCategories.includes(current.primaryCategory) ? current.primaryCategory : safeCategories[0]!;

      return syncDraftVariants({
        ...current,
        categories: safeCategories,
        primaryCategory: nextPrimary,
      });
    });
  };

  const toggleSize = (size: string) => {
    setDraft((current) => {
      if (!current) return current;
      const nextSizes = current.sizes.includes(size)
        ? current.sizes.filter((entry) => entry !== size)
        : [...current.sizes, size];
      return syncDraftVariants({
        ...current,
        sizes: nextSizes.length > 0 ? nextSizes : [size],
      });
    });
  };

  const toggleColor = (colorName: string) => {
    setDraft((current) => {
      if (!current) return current;
      const key = normalizeProductColorName(colorName).toLowerCase();
      const exists = current.colors.some((color) => normalizeProductColorName(color.name).toLowerCase() === key);
      if (exists && current.colors.length <= 1) {
        return current;
      }
      if (exists) {
        const affectedVariants = current.variants.filter((variant) => {
          const variantColor = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? "";
          return normalizeProductColorName(variantColor).toLowerCase() === key;
        });
        if (
          affectedVariants.length > 0 &&
          !confirmAdminDestructiveAction(
            `Vas a quitar el color ${normalizeProductColorName(colorName)} y se eliminaran ${affectedVariants.length} variante(s) relacionadas. Esta accion no se puede deshacer. ¿Quieres continuar?`,
          )
        ) {
          return current;
        }
      }
      const nextColors = exists
        ? current.colors.filter((color) => normalizeProductColorName(color.name).toLowerCase() !== key)
        : [...current.colors, buildProductColorRecord(colorName)];
      const allowedColorKeys = new Set(
        nextColors.map((color) => normalizeProductColorName(color.name).toLowerCase()),
      );
      const retainedVariants = current.variants.filter((variant) => {
        const variantColor = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? "";
        return allowedColorKeys.has(normalizeProductColorName(variantColor).toLowerCase());
      });

      return syncDraftVariants({
        ...current,
        colors: nextColors.length > 0 ? nextColors : [buildProductColorRecord(colorName)],
        variants: retainedVariants,
      });
    });
  };

  const moveImage = (url: string, direction: -1 | 1) => {
    setDraft((current) => {
      if (!current) return current;
      const index = current.images.findIndex((image) => image.url === url);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.images.length) return current;
      const images = [...current.images];
      const [moved] = images.splice(index, 1);
      images.splice(nextIndex, 0, moved);
      return { ...current, images };
    });
  };

  const setFeaturedImage = (url: string) => {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        featuredImage: current.images.find((image) => image.url === url) ?? null,
      };
    });
  };

  const updateVariant = (
    variantId: string,
    updater: (variant: AdminProductRecord["variants"][number]) => AdminProductRecord["variants"][number],
  ) => {
    setDraft((current) => {
      if (!current) return current;
      return syncDraftVariants({
        ...current,
        variants: current.variants.map((variant) => (variant.id === variantId ? updater(variant) : variant)),
      });
    });
  };

  const handleSave = () => {
    if (!draft) return;
    setIsSaving(true);
    setSaveMessage("");
    void saveAdminCatalogProduct({ data: normalizeDraftForSave(draft) })
      .then((saved) => {
        setRows((current) => {
          const exists = current.some((product) => product.id === saved.id);
          return exists ? current.map((product) => (product.id === saved.id ? saved : product)) : [saved, ...current];
        });
        setSelectedId(saved.id);
        setDraft(cloneProduct(saved));
        setSaveMessage("Producto guardado.");
      })
      .catch(() => setSaveMessage("No se pudo guardar el producto ahora mismo."))
      .finally(() => setIsSaving(false));
  };

  const handleCreate = () => {
    const blank = createBlankProduct(categories, sizeFormats);
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(cloneProduct(blank));
    setSaveMessage("Nuevo producto draft creado.");
  };

  const handleDelete = () => {
    if (!draft) return;
    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar el producto ${draft.name || draft.id}. Esta accion no se puede deshacer. ¿Quieres continuar?`,
      )
    ) {
      return;
    }

    if (draft.id.startsWith("draft-")) {
      setRows((current) => current.filter((product) => product.id !== draft.id));
      setSaveMessage("Producto draft eliminado.");
      return;
    }

    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminCatalogProduct({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((product) => product.id !== draft.id));
        setSaveMessage("Producto eliminado.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el producto.");
      })
      .finally(() => setIsDeleting(false));
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
    setSaveMessage("Producto duplicado.");
  };

  const handleUploadImage = () => {
    if (!draft || !selectedImageFile || draft.images.length >= 5) return;
    setIsUploadingImage(true);
    setSaveMessage("");

    const formData = new FormData();
    formData.set("productId", draft.id);
    formData.set("label", draft.name.trim() || "Producto");
    formData.set("file", selectedImageFile);

    void uploadAdminProductImage({ data: formData })
      .then((saved) => {
        setRows((current) => current.map((product) => (product.id === saved.id ? saved : product)));
        setDraft(cloneProduct(saved));
        setSelectedImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSaveMessage("Imagen subida.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.");
      })
      .finally(() => setIsUploadingImage(false));
  };

  const handleDeleteImage = (url: string) => {
    if (!draft) return;
    if (!confirmAdminDestructiveAction("Vas a eliminar esta imagen del producto. ¿Quieres continuar?")) {
      return;
    }
    setSaveMessage("");
    void deleteAdminProductImage({ data: { productId: draft.id, url } })
      .then((saved) => {
        setRows((current) => current.map((product) => (product.id === saved.id ? saved : product)));
        setDraft(cloneProduct(saved));
        setSaveMessage("Imagen eliminada.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar la imagen.");
      });
  };

  return (
    <AdminShell
      section="productos"
      title="Productos"
      actions={
        <>
          <AdminButton tone="secondary" onClick={handleDuplicate} disabled={!draft}>
            Duplicar
          </AdminButton>
          <AdminButton tone="primary" onClick={handleCreate}>
            Nuevo producto
          </AdminButton>
          <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isSaving || isDeleting || isUploadingImage}>
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AdminButton>
          <AdminButton tone="primary" onClick={handleSave} disabled={!draft || isSaving || isDeleting || isUploadingImage}>
            {isSaving ? "Guardando..." : "Guardar"}
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-4">
        <AdminPanel
          title="Catalogo"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "moon", "sunshine", "men"] as const).map((entry) => (
                <AdminButton
                  key={entry}
                  tone={entry === "all" ? (scope === entry ? "active" : "ghost") : "custom"}
                  className={entry === "all" ? undefined : getAdminVibeButtonClassName(entry, scope === entry)}
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
              placeholder="Buscar por nombre, slug, id o categoria"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} resultados
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay productos aqui"
              body="Prueba otro filtro o crea un producto nuevo."
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
                      <th className="pb-3 pr-3">Visibilidad</th>
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
                          <div className="font-normal">{product.name || "Sin nombre"}</div>
                          <div className="text-xs text-[#6b5a55]">{product.id}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={
                              product.vibe === "moon" || product.vibe === "sunshine" || product.vibe === "men"
                                ? getAdminVibeButtonClassName(
                                    product.vibe,
                                    true,
                                    "pointer-events-none cursor-default rounded-[10px] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
                                  )
                                : "pointer-events-none cursor-default rounded-[10px] bg-[#f3eadf] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#5f4941]"
                            }
                          >
                            {getVibeLabel(product.vibe)}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex max-w-[320px] flex-wrap gap-1">
                            {product.categories.map((category) => (
                              <AdminTag key={category}>{getCategoryLabel(category)}</AdminTag>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3 font-bold">{formatPrice(product.price)}</td>
                        <td className="py-3 pr-3">
                          <div className={`inline-flex items-center ${product.hidden ? "text-[#9a3423]" : "text-emerald-700"}`}>
                            {product.hidden ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex rounded-xl px-2.5 py-1 text-[11px] font-black uppercase ${getInventoryStatusTone(product)}`}>
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

        {draft ? (
          <>
            <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
              <AdminPanel
                title={draft.name || "Producto nuevo"}
                titleClassName="font-body text-sm font-normal"
              >
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <AdminField label="Nombre">
                      <AdminInput value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
                    </AdminField>
                  </div>

                  <AdminField
                    label="Product ID"
                    hint="Cambia esto solo si sabes lo que haces. Mover IDs puede romper referencias existentes."
                  >
                    <div className="grid gap-2">
                      <AdminInput value={draft.id} onChange={(event) => updateDraft("id", event.target.value)} />
                      {selected && draft.id !== selected.id ? (
                        <div className="rounded-xl border border-[#9a3423]/20 bg-[#fff1ec] px-3 py-2 text-xs leading-5 text-[#9a3423]">
                          Cambiar el ID puede romper pedidos, colecciones o referencias internas que ya apunten a este producto.
                        </div>
                      ) : null}
                    </div>
                  </AdminField>

                  <div className="grid gap-3 md:grid-cols-2">
                    <AdminField label="Subtienda">
                      <AdminSelect value={draft.vibe} onChange={(event) => updateDraft("vibe", event.target.value as AdminProductRecord["vibe"])}>
                        <option value="moon">Moon</option>
                        <option value="sunshine">Sunshine</option>
                        <option value="men">Men</option>
                      </AdminSelect>
                    </AdminField>
                    <AdminField label="Categoria principal">
                      <AdminSelect value={draft.primaryCategory} onChange={(event) => applyPrimaryCategory(event.target.value)}>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </AdminSelect>
                    </AdminField>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <AdminField label="Precio base">
                      <AdminInput type="number" value={draft.price} onChange={(event) => updateDraft("price", Number(event.target.value))} />
                    </AdminField>
                    <AdminField label="Stock total real">
                      <AdminInput type="number" value={draft.stock ?? 0} disabled />
                    </AdminField>
                  </div>

                  <AdminField label="Descripcion">
                    <AdminTextarea rows={5} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
                  </AdminField>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <AdminCheckbox label="Disponible" checked={draft.available} onCheckedChange={(checked) => updateDraft("available", checked)} />
                    <AdminCheckbox label="Ocultar de la tienda" checked={draft.hidden} onCheckedChange={(checked) => updateDraft("hidden", checked)} />
                    <AdminCheckbox label="Destacado" checked={draft.featured} onCheckedChange={(checked) => updateDraft("featured", checked)} />
                    <AdminCheckbox label="Nuevo" checked={draft.newArrival} onCheckedChange={(checked) => updateDraft("newArrival", checked)} />
                    <AdminCheckbox label="NSFW" checked={draft.isNsfw} onCheckedChange={(checked) => updateDraft("isNsfw", checked)} />
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel title="Imagenes">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-[#5f4941]">
                      Sube entre 1 y 5 imagenes. La portada sale de la marcada como principal.
                    </div>
                    <AdminTag>{draft.images.length}/5</AdminTag>
                  </div>

                  {draft.images.length > 0 ? (
                    <div className="grid gap-3">
                      {draft.images.map((image, index) => (
                        <div key={image.url} className="overflow-hidden rounded-2xl border border-[#231717]/10 bg-[#faf6f0]">
                          <div className="grid gap-3 p-3 sm:grid-cols-[92px_minmax(0,1fr)]">
                            <div className="h-24 w-24 overflow-hidden rounded-2xl bg-[#f7f2ec]">
                              <img src={image.url} alt={draft.name} className="h-full w-full object-cover" />
                            </div>
                            <div className="grid gap-3">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-[#6b5a55]">
                                  Imagen {index + 1}
                                  {draft.featuredImage?.url === image.url ? " · Portada" : ""}
                                </div>
                                <div className="mt-1 truncate text-xs text-[#8b756d]">
                                  {image.altText || draft.name || "Sin nombre"}
                                </div>
                                <div className="mt-1 truncate text-[11px] text-[#a08f87]">{image.url}</div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <AdminButton tone="ghost" onClick={() => moveImage(image.url, -1)}>
                                  ↑
                                </AdminButton>
                                <AdminButton tone="ghost" onClick={() => moveImage(image.url, 1)}>
                                  ↓
                                </AdminButton>
                                <AdminButton tone={draft.featuredImage?.url === image.url ? "active" : "ghost"} onClick={() => setFeaturedImage(image.url)}>
                                  {draft.featuredImage?.url === image.url ? "Portada" : "Hacer portada"}
                                </AdminButton>
                                <AdminButton tone="danger" onClick={() => handleDeleteImage(image.url)}>
                                  Quitar
                                </AdminButton>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#231717]/20 bg-[#faf6f0] px-4 py-8 text-sm text-[#6b5a55]">
                      Este producto todavia no tiene imagenes.
                    </div>
                  )}

                  <div className="grid gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={(event) => setSelectedImageFile(event.target.files?.[0] ?? null)}
                      disabled={!canUploadImages}
                      className="block w-full rounded-xl border border-dashed border-[#231717]/20 bg-[#faf6f0] px-4 py-3 text-sm file:mr-3 file:rounded-xl file:border-0 file:bg-[#231717] file:px-3 file:py-2 file:text-xs file:font-black file:uppercase file:tracking-[0.14em] file:text-white"
                    />
                    {!canUploadImages && draft.id.startsWith("draft-") ? (
                      <div className="rounded-2xl border border-dashed border-[#231717]/20 px-3 py-3 text-xs leading-5 text-[#6b5a55]">
                        Guarda el producto primero para habilitar uploads reales a R2.
                      </div>
                    ) : null}
                    <AdminButton tone="primary" onClick={handleUploadImage} disabled={!selectedImageFile || !canUploadImages || isUploadingImage}>
                      {isUploadingImage ? "Subiendo imagen..." : draft.images.length >= 5 ? "Limite de 5 imagenes" : "Subir imagen"}
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>
            </div>

            <AdminPanel title="Categorias, tallas y colores">
              <div className="grid gap-6">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Categorias asignadas</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const active = draft.categories.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                            active
                              ? "border-[#231717] bg-[#231717] text-white"
                              : "border-[#231717]/20 bg-[#faf6f0] text-[#5f4941]"
                          }`}
                        >
                          {category.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Formato de tallas</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizeOptions.map((size) => {
                      const active = draft.sizes.includes(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                            active
                              ? "border-[#231717] bg-[#231717] text-white"
                              : "border-[#231717]/20 bg-[#faf6f0] text-[#5f4941]"
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Colores del producto</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRODUCT_COLOR_PRESETS.map((preset) => {
                      const active = activeColorKeys.has(preset.label.toLowerCase());
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => toggleColor(preset.label)}
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
                            active
                              ? "border-[#231717] bg-[#231717] text-white"
                              : "border-[#231717]/20 bg-[#faf6f0] text-[#5f4941]"
                          }`}
                        >
                          <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: preset.hex }} />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AdminPanel>

            <AdminPanel title="Stock y precio" className="overflow-hidden">
              {draft.variants.length === 0 ? (
                <AdminEmptyState title="Sin variantes" body="Agrega al menos una talla y un color para generar variantes editables." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[780px] text-left text-sm">
                    <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                      <tr>
                        <th className="pb-3 pr-3">Talla</th>
                        <th className="pb-3 pr-3">Color</th>
                        <th className="pb-3 pr-3">Disponible</th>
                        <th className="pb-3 pr-3">Stock</th>
                        <th className="pb-3 pr-3">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.variants.map((variant) => {
                        const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
                        const color = variant.selectedOptions.find((option) => option.name === "Color")?.value ?? "Unica";

                        return (
                          <tr key={variant.id} className="border-t border-[#231717]/10 align-top">
                            <td className="py-3 pr-3 font-semibold">{size}</td>
                            <td className="py-3 pr-3 font-semibold">{color}</td>
                            <td className="py-3 pr-3">
                              <AdminCheckbox
                                label="Activa"
                                checked={variant.available}
                                onCheckedChange={(checked) =>
                                  updateVariant(variant.id, (current) => ({
                                    ...current,
                                    available: checked,
                                  }))
                                }
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <AdminInput
                                type="number"
                                value={variant.quantityAvailable ?? 0}
                                onChange={(event) =>
                                  updateVariant(variant.id, (current) => ({
                                    ...current,
                                    quantityAvailable: Math.max(0, Number(event.target.value) || 0),
                                  }))
                                }
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <AdminInput
                                type="number"
                                value={variant.price}
                                onChange={(event) =>
                                  updateVariant(variant.id, (current) => ({
                                    ...current,
                                    price: Math.max(0, Number(event.target.value) || 0),
                                  }))
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </AdminPanel>
          </>
        ) : (
          <AdminPanel title="Editor">
            <AdminEmptyState
              title="Sin seleccion"
              body="Selecciona un producto de la lista o crea uno nuevo para empezar a editar."
              action={<AdminButton tone="primary" onClick={handleCreate}>Crear producto</AdminButton>}
            />
          </AdminPanel>
        )}
        <AdminToast message={saveMessage} />
      </div>
    </AdminShell>
  );
}
