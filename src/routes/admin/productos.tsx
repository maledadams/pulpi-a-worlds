import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  downloadAdminCsv,
  getAdminChipClassName,
  getAdminVibeButtonClassName,
  getAdminVibeTagClassName,
} from "@/components/admin/AdminControls";
import { useAdminAutosave } from "@/hooks/use-admin-autosave";
import { cn } from "@/lib/utils";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { matchesAdminSearch } from "@/lib/admin-search";
import { compressImageForUpload } from "@/lib/image-resize";
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

function buildVariantId(slug: string, size: string) {
  return `${slug.trim().toLowerCase().replace(/\s+/g, "-") || "product"}-${size}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-");
}

// Variants are keyed by SIZE ONLY - color is a display attribute of the product,
// not part of variant identity. This means changing a product's color never
// touches stock: existing per-size variants (id, quantity, price) are matched
// and preserved purely by their Talla value, regardless of what color they had.
function syncDraftVariants(product: AdminProductRecord): AdminProductRecord {
  const slug = product.slug || product.name || product.id;
  const colorName = normalizeProductColorName(product.colors[0]?.name ?? "Unica");
  const currentVariantsBySize = new Map(
    product.variants.map((variant) => {
      const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "Unica";
      return [size, variant] as const;
    }),
  );

  const variants = product.sizes.map((size) => {
    const existing = currentVariantsBySize.get(size);
    return {
      id: existing?.id ?? buildVariantId(slug, size),
      title: size,
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
  });

  return {
    ...product,
    variants,
    stock: variants.reduce((sum, variant) => sum + Math.max(0, variant.quantityAvailable ?? 0), 0),
  };
}

function createBlankProduct(): AdminProductRecord {
  return syncDraftVariants({
    id: `draft-${Date.now()}`,
    slug: "",
    name: "",
    vibe: "moon",
    secondaryVibe: null,
    sortOrder: 0,
    categories: [],
    primaryCategory: "",
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
    sizes: [],
    colors: [],
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
  // Position 0 is always the cover, everywhere - see moveImage/setFeaturedImage.
  const featuredImage = trimmedImages[0] ?? null;

  const normalizedVariants = syncDraftVariants({
    ...draft,
    slug: (draft.slug.trim() || draft.name.trim())
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, ""),
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
  loader: async () => {
    const [categories, sizeFormats, products] = await Promise.all([
      getAdminCategories(),
      getAdminSizeFormats(),
      getAdminCatalogProducts(),
    ]);
    return { categories, sizeFormats, products };
  },
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
  const [saveTone, setSaveTone] = useState<AdminToastTone>("info");
  const showSaveMessage = (text: string, tone: AdminToastTone = "info") => {
    setSaveMessage(text);
    setSaveTone(tone);
  };
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [persistedIds, setPersistedIds] = useState(() => new Set(products.map((product) => product.id)));

  // "Nuevo producto" asks first: a new product, or a sub-product of a mother.
  const [createPicker, setCreatePicker] = useState<"closed" | "choose" | "sub">("closed");
  const [motherQuery, setMotherQuery] = useState("");
  const rowsById = useMemo(() => new Map(rows.map((product) => [product.id, product])), [rows]);

  const filtered = useMemo(() => {
    const matches = rows.filter((product) => {
      const matchesScope = scope === "all" || product.vibe === scope;
      return (
        matchesScope &&
        matchesAdminSearch([product.name, product.slug, product.id, ...product.categories], query)
      );
    });
    // Sub-products are listed right under their mother.
    const matchIds = new Set(matches.map((product) => product.id));
    const subsByMother = new Map<string, AdminProductRecord[]>();
    for (const product of matches) {
      if (!product.motherId || !matchIds.has(product.motherId)) continue;
      subsByMother.set(product.motherId, [...(subsByMother.get(product.motherId) ?? []), product]);
    }
    return matches.flatMap((product) =>
      product.motherId && matchIds.has(product.motherId) ? [] : [product, ...(subsByMother.get(product.id) ?? [])],
    );
  }, [rows, query, scope]);

  const motherCandidates = useMemo(
    () =>
      rows
        .filter(
          (product) =>
            !product.motherId &&
            persistedIds.has(product.id) &&
            matchesAdminSearch([product.name, product.id, product.slug], motherQuery),
        )
        .slice(0, 8),
    [rows, persistedIds, motherQuery],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((product) => product.id === selectedId) ?? null;
  const sizeOptions = getAllowedSizes(categories, sizeFormats, draft?.primaryCategory ?? "tops");
  const activeColorName = normalizeProductColorName(draft?.colors[0]?.name ?? "").toLowerCase();
  // Sub-products: inherited fields are greyed out; a family can't repeat a color.
  const isSub = Boolean(draft?.motherId);
  const lockedClass = isSub ? "cursor-not-allowed opacity-60" : undefined;
  const familyKey = draft ? draft.motherId || draft.id : "";
  const takenColors = new Set(
    rows
      .filter((product) => draft && product.id !== draft.id && (product.id === familyKey || product.motherId === familyKey))
      .map((product) => normalizeProductColorName(product.colors[0]?.name ?? "").toLowerCase())
      .filter(Boolean),
  );

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

  // "En oferta" is a product-wide sale, not a per-Talla one - every variant
  // charges the same sale price so the badge shown on the card always
  // matches what checkout actually charges, regardless of which size gets
  // added to cart.
  const setProductPricing = (price: number, compareAtPrice: number | null) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            price,
            compareAtPrice,
            variants: current.variants.map((variant) => ({ ...variant, price, compareAtPrice })),
          }
        : current,
    );
  };

  // Asks before changing state: the confirmation is an async dialog, which
  // can't run inside a setDraft updater (and updaters may run twice).
  const applyPrimaryCategory = async (nextCategoryId: string) => {
    if (!draft) return;
    const allowedSizes = getAllowedSizes(categories, sizeFormats, nextCategoryId);
    const droppedSizes = draft.sizes.filter((size) => !allowedSizes.includes(size));

    if (droppedSizes.length > 0) {
      const droppedHasStock = draft.variants.some((variant) => {
        const size = variant.selectedOptions.find((option) => option.name === "Talla")?.value ?? "";
        return droppedSizes.includes(size) && (variant.quantityAvailable ?? 0) > 0;
      });
      const warning = droppedHasStock
        ? `Esta categoria usa otro formato de tallas: se van a quitar ${droppedSizes.join(", ")}, incluyendo variantes con stock. Esta accion no se puede deshacer facilmente. ¿Quieres continuar?`
        : `Esta categoria usa otro formato de tallas: se van a quitar ${droppedSizes.join(", ")}. ¿Quieres continuar?`;
      if (!(await confirmAdminDestructiveAction(warning))) return;
    }

    setDraft((current) => {
      if (!current) return current;
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
      if (nextCategories.length === 0) {
        showSaveMessage("El producto debe tener al menos una categoria.", "error");
        return current;
      }
      const nextPrimary = nextCategories.includes(current.primaryCategory) ? current.primaryCategory : nextCategories[0]!;

      return syncDraftVariants({
        ...current,
        categories: nextCategories,
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
      if (nextSizes.length === 0) {
        showSaveMessage("El producto debe tener al menos una talla.", "error");
        return current;
      }
      return syncDraftVariants({
        ...current,
        sizes: nextSizes,
      });
    });
  };

  // Single-select: picking a color card just relabels the product's one color.
  // Existing variants (and their stock) are untouched - syncDraftVariants matches
  // them by size only, so no stock is added, removed, or reset here.
  const setColor = (colorName: string) => {
    setDraft((current) => {
      if (!current) return current;
      return syncDraftVariants({
        ...current,
        colors: [buildProductColorRecord(colorName)],
      });
    });
  };

  // The first image is always the storefront cover everywhere else (product
  // cards, category previews, etc.) - keep featuredImage in sync with
  // position 0 instead of a separate pointer that reordering could silently
  // leave stale.
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
      return { ...current, images, featuredImage: images[0] ?? null };
    });
  };

  const setFeaturedImage = (url: string) => {
    setDraft((current) => {
      if (!current) return current;
      const index = current.images.findIndex((image) => image.url === url);
      if (index <= 0) return current;
      const images = [...current.images];
      const [moved] = images.splice(index, 1);
      images.unshift(moved);
      return { ...current, images, featuredImage: images[0] ?? null };
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

  const performSave = (value: AdminProductRecord, options: { silent?: boolean } = {}) => {
    // The Product ID field is only editable before the first save (see the
    // persistedIds-gated field below) and then locks forever - saving while
    // it's still the auto-generated draft-<timestamp> placeholder means
    // nobody can ever give this product a real id again.
    if (value.id.trim().startsWith("draft-")) {
      return Promise.reject(
        new Error("Este producto todavia tiene el ID temporal. Cambia el Product ID por uno real antes de guardar."),
      );
    }
    const normalized = normalizeDraftForSave(value);
    const slugConflict = rows.find((product) => product.id !== value.id && product.slug === normalized.slug);
    if (slugConflict) {
      return Promise.reject(
        new Error(
          `Ya existe otro producto ("${slugConflict.name || slugConflict.id}") con ese mismo nombre. Cambia el nombre o el slug antes de guardar.`,
        ),
      );
    }
    return saveAdminCatalogProduct({ data: normalized }).then((saved) => {
      setRows((current) => {
        const exists = current.some((product) => product.id === saved.id);
        return exists ? current.map((product) => (product.id === saved.id ? saved : product)) : [saved, ...current];
      });
      setPersistedIds((current) => new Set(current).add(saved.id));
      if (saved.id !== value.id) setSelectedId((current) => (current === value.id ? saved.id : current));
      setDraft((current) => (current && current.id === value.id ? cloneProduct(saved) : current));
      if (!options.silent) showSaveMessage("Producto guardado.", "success");
      if (rows.some((product) => product.motherId === saved.id)) void refreshSavedRows(saved.id);
    });
  };

  const autosave = useAdminAutosave(draft, (value) => performSave(value, { silent: true }), {
    resetKey: selectedId,
  });

  // A rejected autosave (e.g. a color the family already has) used to fail
  // silently; say why. Unsaved draft ids are expected until a real id is typed.
  useEffect(() => {
    if (autosave.status !== "error" || !autosave.errorMessage || draft?.id.trim().startsWith("draft-")) return;
    showSaveMessage(autosave.errorMessage, "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosave.status, autosave.errorMessage]);

  const handleSave = () => {
    if (!draft) return;
    setIsSaving(true);
    setSaveMessage("");
    void performSave(draft)
      .catch((error) => showSaveMessage(getAdminErrorMessage(error, "No se pudo guardar el producto ahora mismo."), "error"))
      .finally(() => setIsSaving(false));
  };

  const handleCreate = () => {
    setCreatePicker("closed");
    const blank = createBlankProduct();
    setRows((current) => [blank, ...current]);
    setSelectedId(blank.id);
    setDraft(cloneProduct(blank));
    showSaveMessage("Nuevo producto draft creado.", "success");
  };

  // A sub-product starts from its mother: the inherited fields (greyed out in
  // the editor and enforced by the server), her tags, sizes and sale. The
  // link is only stored when it's first saved, like any new product.
  const handleCreateSub = (mother: AdminProductRecord) => {
    setCreatePicker("closed");
    setMotherQuery("");
    const blank = createBlankProduct();
    const sub = syncDraftVariants({
      ...blank,
      motherId: mother.id,
      vibe: mother.vibe,
      secondaryVibe: mother.secondaryVibe,
      primaryCategory: mother.primaryCategory,
      categories: [...mother.categories],
      description: mother.description,
      isNsfw: mother.isNsfw,
      tags: [...mother.tags],
      price: mother.price,
      compareAtPrice: mother.compareAtPrice,
      sizes: [...mother.sizes],
    });
    setRows((current) => [sub, ...current]);
    setSelectedId(sub.id);
    setDraft(cloneProduct(sub));
    showSaveMessage(`Sub-producto de ${mother.name} creado. Elige su color.`, "success");
  };

  // Mothers and subs are saved one by one on the server (a mother's save
  // updates her subs), so re-read the catalog after those changes.
  // The row open in the editor is left alone so nothing being typed is lost.
  const refreshSavedRows = (keepId = "") =>
    getAdminCatalogProducts()
      .then((fresh) => {
        const freshById = new Map(fresh.map((product) => [product.id, product]));
        setRows((current) =>
          current
            .filter((product) => !persistedIds.has(product.id) || freshById.has(product.id))
            .map((product) => (product.id === keepId ? product : (freshById.get(product.id) ?? product))),
        );
      })
      .catch(() => {});

  const handleDelete = async () => {
    if (!draft) return;
    const subs = rows
      .filter((product) => product.motherId === draft.id && persistedIds.has(product.id))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const familyNote =
      subs.length > 0
        ? ` Tiene ${subs.length} ${subs.length === 1 ? "sub-producto" : "sub-productos"}: "${subs[0]!.name}" pasara a ser el producto madre${subs.length > 1 ? " y los demas quedaran ligados a el" : ""}.`
        : "";
    if (
      !(await confirmAdminDestructiveAction(
        `Vas a eliminar el producto ${draft.name || draft.id}.${familyNote} Esta accion no se puede deshacer. ¿Quieres continuar?`,
      ))
    ) {
      return;
    }

    if (!persistedIds.has(draft.id)) {
      setRows((current) => current.filter((product) => product.id !== draft.id));
      showSaveMessage("Producto draft eliminado.", "success");
      return;
    }

    setIsDeleting(true);
    setSaveMessage("");
    void deleteAdminCatalogProduct({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((product) => product.id !== draft.id));
        showSaveMessage("Producto eliminado.", "success");
        if (subs.length > 0) void refreshSavedRows();
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo eliminar el producto."), "error");
      })
      .finally(() => setIsDeleting(false));
  };

  const handleDuplicate = () => {
    if (!draft) return;
    // A plain field-copy would keep the original's variant ids, which
    // silently aliases the copy's stock to the original's (any adjustment on
    // one updates the other, since inventory lookups resolve by variant id
    // across the whole catalog). syncDraftVariants regenerates fresh ids from
    // the new slug and starts stock at 0 - the duplicate is a new catalog
    // entry, it shouldn't appear to already have the original's inventory.
    const duplicate = syncDraftVariants({
      ...cloneProduct(draft),
      // A copy is its own product; making a sub is done from "Nuevo producto".
      motherId: null,
      id: `draft-${Date.now()}`,
      slug: `${draft.slug || "producto"}-copy-${Date.now()}`,
      name: `${draft.name || "Producto"} Copy`,
      variants: [],
      createdAt: new Date().toISOString(),
    });
    setRows((current) => [duplicate, ...current]);
    setSelectedId(duplicate.id);
    setDraft(duplicate);
    showSaveMessage("Producto duplicado.", "success");
    // Persist immediately rather than waiting on autosave: the duplicate is
    // already fully valid data, and autosave's baseline-reset on selecting
    // this new row would otherwise treat it as "already saved" and never
    // schedule a save at all - navigating away would lose it silently.
    void performSave(duplicate, { silent: true }).catch(() => {
      showSaveMessage("El producto se duplico pero no se pudo guardar automaticamente. Revisa los campos y presiona Guardar.", "error");
    });
  };

  const handleUploadImage = () => {
    if (!draft || !selectedImageFile || draft.images.length >= 5) return;
    setIsUploadingImage(true);
    setSaveMessage("");

    const ensureSaved = persistedIds.has(draft.id)
      ? Promise.resolve(draft)
      : saveAdminCatalogProduct({ data: normalizeDraftForSave(draft) })
          .then((saved) => {
            setRows((current) => {
              const exists = current.some((product) => product.id === saved.id);
              return exists
                ? current.map((product) => (product.id === saved.id ? saved : product))
                : [saved, ...current];
            });
            setPersistedIds((current) => new Set(current).add(saved.id));
            setSelectedId(saved.id);
            setDraft(cloneProduct(saved));
            return saved;
          })
          .catch(() => {
            throw new Error("Completa los campos obligatorios (nombre, descripcion, categoria, talla, color) antes de subir imagenes.");
          });

    void ensureSaved
      .then((persistedProduct) => compressImageForUpload(selectedImageFile).then((file) => ({ persistedProduct, file })))
      .then(({ persistedProduct, file }) => {
        const formData = new FormData();
        formData.set("productId", persistedProduct.id);
        formData.set("label", persistedProduct.name.trim() || "Producto");
        formData.set("file", file);
        return uploadAdminProductImage({ data: formData });
      })
      .then((saved) => {
        setRows((current) => current.map((product) => (product.id === saved.id ? saved : product)));
        setDraft(cloneProduct(saved));
        setSelectedImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        showSaveMessage("Imagen subida.", "success");
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo subir la imagen."), "error");
      })
      .finally(() => setIsUploadingImage(false));
  };

  const handleDeleteImage = async (url: string) => {
    if (!draft) return;
    if (!(await confirmAdminDestructiveAction("Vas a eliminar esta imagen del producto. ¿Quieres continuar?"))) {
      return;
    }
    setSaveMessage("");
    void deleteAdminProductImage({ data: { productId: draft.id, url } })
      .then((saved) => {
        setRows((current) => current.map((product) => (product.id === saved.id ? saved : product)));
        setDraft(cloneProduct(saved));
        showSaveMessage("Imagen eliminada.", "success");
      })
      .catch((error) => {
        showSaveMessage(getAdminErrorMessage(error, "No se pudo eliminar la imagen."), "error");
      });
  };

  const handleExportCsv = () => {
    downloadAdminCsv(
      `productos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["ID", "Nombre", "Subtienda", "Subtienda secundaria", "Categorias", "Precio", "Stock", "Visible", "Destacado", "Nuevo"],
      filtered.map((product) => [
        product.id,
        product.name,
        getVibeLabel(product.vibe),
        product.secondaryVibe ? getVibeLabel(product.secondaryVibe) : "",
        product.categories.map((category) => getCategoryLabel(category)).join(" / "),
        product.price,
        product.stock ?? 0,
        product.hidden ? "No" : "Si",
        product.featured ? "Si" : "No",
        product.newArrival ? "Si" : "No",
      ]),
    );
  };

  return (
    <AdminShell
      section="productos"
      title="Productos"
      actions={
        <>
          <AdminButton tone="ghost" onClick={handleExportCsv} disabled={filtered.length === 0}>
            Exportar CSV
          </AdminButton>
          <AdminButton tone="danger" onClick={handleDelete} disabled={!draft || isSaving || isDeleting || isUploadingImage}>
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </AdminButton>
          <AdminButton tone="secondary" onClick={() => setCreatePicker("choose")}>
            Nuevo producto
          </AdminButton>
          <AdminButton tone="secondary" onClick={handleDuplicate} disabled={!draft}>
            Duplicar
          </AdminButton>
          <AdminButton tone="save" onClick={handleSave} disabled={!draft || isSaving || isDeleting || isUploadingImage}>
            {isSaving ? "Guardando..." : "Guardar"}
          </AdminButton>        </>
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
          <div className="mb-4 flex flex-col gap-3 amd:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, slug, id o categoria"
            />
            <div className="shrink-0 px-1 py-2.5 text-sm text-[var(--admin-faint)]">
              {filtered.length} resultados
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay productos aqui"
              body="Prueba otro filtro o crea un producto nuevo."
              action={<AdminButton tone="primary" onClick={() => setCreatePicker("choose")}>Crear producto</AdminButton>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs font-medium text-[var(--admin-faint)]">
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
                        className={`cursor-pointer border-t border-[var(--admin-line)] align-top transition-colors ${
                          selectedId === product.id ? "border-transparent bg-[var(--admin-accent-soft)] [&+tr]:border-transparent" : "hover:bg-[var(--admin-accent-soft)]"
                        }`}
                      >
                        <td className={`py-3 pr-3 ${product.motherId ? "pl-6" : ""}`}>
                          <div className="font-normal">{product.name || "Sin nombre"}</div>
                          <div className="text-xs text-[var(--admin-muted)]">{product.id}</div>
                          {product.motherId ? (
                            <div className="mt-0.5 text-xs text-[var(--admin-faint)]">
                              ↳ Sub de {rowsById.get(product.motherId)?.name || product.motherId}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={
                                product.vibe === "moon" || product.vibe === "sunshine" || product.vibe === "men"
                                  ? getAdminVibeTagClassName(product.vibe)
                                  : "pointer-events-none cursor-default rounded-full bg-[var(--admin-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--admin-muted)]"
                              }
                            >
                              {getVibeLabel(product.vibe)}
                            </span>
                            {product.secondaryVibe ? (
                              <span
                                className={getAdminVibeTagClassName(product.secondaryVibe)}
                              >
                                + {getVibeLabel(product.secondaryVibe)}
                              </span>
                            ) : null}
                          </div>
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
                          <div className={`inline-flex items-center ${product.hidden ? "text-[var(--admin-danger)]" : "text-[var(--admin-ok)]"}`}>
                            {product.hidden ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getInventoryStatusTone(product)}`}>
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
            <div className="grid grid-cols-1 gap-4 a2xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
              <AdminPanel editor
                title={draft.name || "Producto nuevo"}
                titleClassName="font-body text-sm font-normal"
              >
                <div className="grid gap-4">
                  <div className="grid gap-3">
                    <AdminField label="Nombre">
                      <AdminInput value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} />
                    </AdminField>
                  </div>

                  {isSub ? (
                    <AdminField
                      label="Madre Product-ID"
                      hint="No se puede cambiar. Para cambiarlo, elimina este producto y crealo de nuevo como sub-producto."
                    >
                      <AdminInput value={draft.motherId ?? ""} disabled className="cursor-not-allowed opacity-60" />
                    </AdminField>
                  ) : null}

                  {!persistedIds.has(draft.id) ? (
                    <AdminField
                      label="Product ID"
                      hint="Se usa como referencia interna unica para este producto. Una vez guardado no se puede editar."
                    >
                      <AdminInput
                        value={draft.id}
                        onChange={(event) => updateDraft("id", event.target.value)}
                        className={
                          draft.id.trim().startsWith("draft-")
                            ? "border-red-500 bg-[var(--admin-danger-soft)] focus:border-red-500 focus-visible:ring-red-200"
                            : undefined
                        }
                      />
                      {draft.id.trim().startsWith("draft-") ? (
                        <span className="text-xs font-bold text-red-600">
                          Este es un ID temporal - cambialo por uno real (ej. el mismo slug) antes de guardar. No se puede editar despues.
                        </span>
                      ) : null}
                    </AdminField>
                  ) : (
                    <AdminField label="Product ID">
                      <AdminInput value={draft.id} disabled className="cursor-not-allowed opacity-60" />
                    </AdminField>
                  )}

                  <AdminField
                    label="Slug"
                    hint="Define la URL publica del producto (/producto/slug). Cambiarlo rompe enlaces ya compartidos a este producto."
                  >
                    <div className="flex gap-2">
                      <AdminInput value={draft.slug} onChange={(event) => updateDraft("slug", event.target.value)} />
                      <AdminButton
                        tone="ghost"
                        onClick={() => updateDraft("slug", draft.name.trim().toLowerCase().replace(/\s+/g, "-"))}
                        disabled={!draft.name.trim()}
                      >
                        Regenerar desde nombre
                      </AdminButton>
                    </div>
                  </AdminField>

                  <div className="grid gap-3 amd:grid-cols-2">
                    <AdminField label="Subtienda">
                      <AdminSelect
                        disabled={isSub}
                        className={lockedClass}
                        value={draft.vibe}
                        onChange={(event) => {
                          const nextVibe = event.target.value as AdminProductRecord["vibe"];
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  vibe: nextVibe,
                                  secondaryVibe: current.secondaryVibe === nextVibe ? null : current.secondaryVibe,
                                }
                              : current,
                          );
                        }}
                      >
                        <option value="moon">Moon</option>
                        <option value="sunshine">Sunshine</option>
                        <option value="men">Men</option>
                      </AdminSelect>
                    </AdminField>
                    <AdminField label="Categoria principal">
                      <AdminSelect disabled={isSub} className={lockedClass} value={draft.primaryCategory} onChange={(event) => applyPrimaryCategory(event.target.value)}>
                        {!draft.primaryCategory ? <option value="">Selecciona una categoria</option> : null}
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </AdminSelect>
                    </AdminField>
                  </div>

                  <AdminField
                    label="Tambien en (opcional)"
                    hint="El producto aparece en su subtienda principal y, si eliges una aqui, tambien en esta segunda."
                  >
                    <AdminSelect
                      disabled={isSub}
                      className={lockedClass}
                      value={draft.secondaryVibe ?? ""}
                      onChange={(event) =>
                        updateDraft(
                          "secondaryVibe",
                          event.target.value ? (event.target.value as AdminProductRecord["secondaryVibe"]) : null,
                        )
                      }
                    >
                      <option value="">Ninguna</option>
                      {(["moon", "sunshine", "men"] as const)
                        .filter((vibe) => vibe !== draft.vibe)
                        .map((vibe) => (
                          <option key={vibe} value={vibe}>
                            {getVibeLabel(vibe)}
                          </option>
                        ))}
                    </AdminSelect>
                  </AdminField>

                  <AdminField label="Precio base">
                    <AdminInput
                      type="number"
                      min={0}
                      step="0.01"
                      value={
                        draft.compareAtPrice !== null
                          ? draft.compareAtPrice === 0 ? "" : draft.compareAtPrice
                          : draft.price === 0 ? "" : draft.price
                      }
                      onChange={(event) => {
                        const next = event.target.value === "" ? 0 : Number(event.target.value);
                        if (draft.compareAtPrice !== null) {
                          setProductPricing(draft.price, next);
                        } else {
                          setProductPricing(next, null);
                        }
                      }}
                      onBlur={() => {
                        const current = draft.compareAtPrice !== null ? draft.compareAtPrice : draft.price;
                        if (!(current >= 0)) {
                          if (draft.compareAtPrice !== null) setProductPricing(draft.price, 0);
                          else setProductPricing(0, null);
                          showSaveMessage("El precio no puede ser negativo - se ajusto a 0.", "error");
                        }
                      }}
                    />
                  </AdminField>

                  <AdminField
                    label="Precio ofertado"
                    hint={draft.compareAtPrice === null ? "Activa \"En oferta\" para editar el precio de venta." : undefined}
                  >
                    <AdminInput
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={draft.compareAtPrice === null}
                      value={draft.compareAtPrice !== null ? (draft.price === 0 ? "" : draft.price) : ""}
                      onChange={(event) =>
                        setProductPricing(event.target.value === "" ? 0 : Number(event.target.value), draft.compareAtPrice)
                      }
                      onBlur={() => {
                        if (draft.compareAtPrice !== null && !(draft.price >= 0)) {
                          setProductPricing(0, draft.compareAtPrice);
                          showSaveMessage("El precio no puede ser negativo - se ajusto a 0.", "error");
                        }
                      }}
                    />
                  </AdminField>

                  <AdminField label="Descripcion">
                    <AdminTextarea disabled={isSub} className={lockedClass} rows={5} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
                  </AdminField>

                  <div className="grid gap-3 amd:grid-cols-2 axl:grid-cols-3">
                    <AdminCheckbox label="Disponible" checked={draft.available} onCheckedChange={(checked) => updateDraft("available", checked)} />
                    <AdminCheckbox label="Ocultar de la tienda" checked={draft.hidden} onCheckedChange={(checked) => updateDraft("hidden", checked)} />
                    <AdminCheckbox disabled={isSub} label="Destacado" checked={draft.featured} onCheckedChange={(checked) => updateDraft("featured", checked)} />
                    <AdminCheckbox label="Nuevo" checked={draft.newArrival} onCheckedChange={(checked) => updateDraft("newArrival", checked)} />
                    <AdminCheckbox disabled={isSub} label="NSFW" checked={draft.isNsfw} onCheckedChange={(checked) => updateDraft("isNsfw", checked)} />
                    <AdminCheckbox
                      label="En oferta"
                      checked={draft.compareAtPrice !== null}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProductPricing(draft.price, draft.price);
                        } else {
                          setProductPricing(draft.compareAtPrice ?? draft.price, null);
                        }
                      }}
                    />
                  </div>
                </div>
              </AdminPanel>

              <AdminPanel editor title="Imagenes" className="flex flex-col">
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-[var(--admin-muted)]">
                      Sube entre 1 y 5 imagenes. La portada sale de la marcada como principal.
                    </div>
                    <AdminTag>{draft.images.length}/5</AdminTag>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1">
                    {draft.images.length > 0 ? (
                      <div className="grid gap-3">
                        {draft.images.map((image, index) => (
                          <div key={image.url} className="overflow-hidden rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]">
                            <div className="grid gap-3 p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
                              <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-[var(--admin-soft)]">
                                <img src={image.url} alt={draft.name} className="h-full w-full object-cover" />
                              </div>
                              <div className="grid gap-3">
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-[var(--admin-muted)]">
                                    Imagen {index + 1}
                                    {draft.featuredImage?.url === image.url ? " · Portada" : ""}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-[var(--admin-faint)]">
                                    {image.altText || draft.name || "Sin nombre"}
                                  </div>
                                  <div className="mt-1 truncate text-[11px] text-[var(--admin-faint)]">{image.url}</div>
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
                      <div className="rounded-2xl border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-surface)] px-4 py-8 text-sm text-[var(--admin-muted)]">
                        Este producto todavia no tiene imagenes.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                      onChange={(event) => setSelectedImageFile(event.target.files?.[0] ?? null)}
                      disabled={draft.images.length >= 5}
                      className="block w-full rounded-xl border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-surface)] px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--admin-soft)] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[var(--admin-ink)]"
                    />
                    {!persistedIds.has(draft.id) ? (
                      <div className="rounded-2xl border border-dashed border-[var(--admin-line-strong)] px-3 py-3 text-xs leading-5 text-[var(--admin-muted)]">
                        El producto se guardara automaticamente al subir la primera imagen.
                      </div>
                    ) : null}
                    <AdminButton tone="primary" onClick={handleUploadImage} disabled={!selectedImageFile || isUploadingImage || draft.images.length >= 5}>
                      {isUploadingImage ? "Subiendo imagen..." : draft.images.length >= 5 ? "Limite de 5 imagenes" : "Subir imagen"}
                    </AdminButton>
                  </div>
                </div>
              </AdminPanel>
            </div>

            <AdminPanel editor title="Categorias, tallas y colores">
              <div className="grid gap-6">
                <div>
                  <AdminSectionLabel>Categorias asignadas</AdminSectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        disabled={isSub}
                        onClick={() => toggleCategory(category.id)}
                        className={getAdminChipClassName(draft.categories.includes(category.id), lockedClass)}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <AdminSectionLabel>Formato de tallas</AdminSectionLabel>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sizeOptions.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={getAdminChipClassName(draft.sizes.includes(size))}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <AdminSectionLabel>Color del producto</AdminSectionLabel>
                  <p className="mt-1 text-xs text-[var(--admin-faint)]">
                    Cada producto tiene un solo color. Cambiarlo solo actualiza como se muestra - no afecta el stock.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PRODUCT_COLOR_PRESETS.map((preset) => {
                      const active = activeColorName === preset.label.toLowerCase();
                      // Each family member has its own color.
                      const taken = !active && takenColors.has(normalizeProductColorName(preset.label).toLowerCase());
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={taken}
                          title={taken ? "Este color ya lo tiene otro producto de esta familia" : undefined}
                          onClick={() => setColor(preset.label)}
                          className={getAdminChipClassName(active, cn("inline-flex items-center gap-2", taken && "cursor-not-allowed opacity-35 line-through"))}
                        >
                          <span className={`h-3 w-3 rounded-full border ${active ? "border-white" : "border-black/10"}`} style={{ backgroundColor: preset.hex }} />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </AdminPanel>

          </>
        ) : (
          <AdminPanel title="Editor">
            <AdminEmptyState
              title="Sin seleccion"
              body="Selecciona un producto de la lista o crea uno nuevo para empezar a editar."
              action={<AdminButton tone="primary" onClick={() => setCreatePicker("choose")}>Crear producto</AdminButton>}
            />
          </AdminPanel>
        )}
        <AdminToast message={saveMessage} tone={saveTone} />
      </div>

      {/* "Nuevo producto": choose a new product or a sub-product first; the
          editor stays on the current product until one is chosen. */}
      <AlertDialog.Root
        open={createPicker !== "closed"}
        onOpenChange={(open) => {
          if (!open) {
            setCreatePicker("closed");
            setMotherQuery("");
          }
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-[#130808]/40" />
          <AlertDialog.Content className="admin-shell fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-5 shadow-[0_24px_48px_-28px_rgb(19_8_8/0.45)] focus:outline-none">
            {createPicker === "choose" ? (
              <>
                <AlertDialog.Title className="text-base font-semibold">¿Qué quieres crear?</AlertDialog.Title>
                <AlertDialog.Description className="mt-1 text-sm text-[var(--admin-muted)]">
                  Un sub-producto es el mismo producto en otro color, ligado a su producto madre.
                </AlertDialog.Description>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleCreate}
                    className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-field)] p-4 text-left transition-colors hover:bg-[var(--admin-accent-soft)]"
                  >
                    <span className="block text-sm font-semibold">Producto nuevo</span>
                    <span className="mt-1 block text-xs text-[var(--admin-muted)]">Un producto independiente, como siempre.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatePicker("sub")}
                    className="rounded-xl border border-[var(--admin-line)] bg-[var(--admin-field)] p-4 text-left transition-colors hover:bg-[var(--admin-accent-soft)]"
                  >
                    <span className="block text-sm font-semibold">Sub-producto</span>
                    <span className="mt-1 block text-xs text-[var(--admin-muted)]">Otro color de un producto que ya existe.</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <AlertDialog.Title className="text-base font-semibold">Sub-producto</AlertDialog.Title>
                <AlertDialog.Description className="mt-1 text-sm text-[var(--admin-muted)]">
                  ¿De qué producto es? Busca el producto madre por su nombre o su ID.
                </AlertDialog.Description>
                <AdminInput
                  autoFocus
                  className="mt-4"
                  value={motherQuery}
                  onChange={(event) => setMotherQuery(event.target.value)}
                  placeholder="Nombre o ID del producto madre"
                />
                <div className="mt-2 grid max-h-72 gap-1 overflow-y-auto">
                  {motherCandidates.length === 0 ? (
                    <p className="px-1 py-3 text-sm text-[var(--admin-faint)]">No hay productos con ese nombre o ID.</p>
                  ) : (
                    motherCandidates.map((mother) => (
                      <button
                        key={mother.id}
                        type="button"
                        onClick={() => handleCreateSub(mother)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--admin-accent-soft)]"
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: mother.colors[0]?.hex ?? "transparent" }}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{mother.name || "Sin nombre"}</span>
                          <span className="block truncate text-xs text-[var(--admin-muted)]">{mother.id}</span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              {createPicker === "sub" ? (
                <AdminButton tone="ghost" onClick={() => setCreatePicker("choose")}>
                  Atrás
                </AdminButton>
              ) : null}
              <AlertDialog.Cancel asChild>
                <AdminButton tone="secondary">Cancelar</AdminButton>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </AdminShell>
  );
}
