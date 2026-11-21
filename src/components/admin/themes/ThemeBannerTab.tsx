import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import { AssetPicker, type LibraryAsset } from "@/components/admin/themes/ThemeEditorParts";
import type { Product } from "@/data/products";
import type { AdminCollectionRecord } from "@/lib/admin-types";
import { BANNER_MIN_WIDTH, TIENDA_BANNER_MIN_WIDTH, bannerImageProblem } from "@/lib/theme-banner";
import { MAX_BANNERS, type ThemeDocument, type ThemeHomeBanner } from "@/lib/theme-schema";

type LinkKind = ThemeHomeBanner["link"]["kind"];
type Field = "homeBanners" | "tiendaBanners";

const LINK_KINDS: Array<{ id: LinkKind; label: string }> = [
  { id: "none", label: "Ningún lado (solo imagen)" },
  { id: "tienda", label: "Tienda" },
  { id: "moon", label: "Moon" },
  { id: "sunshine", label: "Sunshine" },
  { id: "men", label: "Men" },
  { id: "collection", label: "Una colección" },
  { id: "product", label: "Un producto" },
];

/** A banner as it is being filled in: images and alt may still be missing. */
type Draft = {
  desktopAsset: string | null;
  mobileAsset: string | null;
  alt: string;
  link: ThemeHomeBanner["link"];
};

const SECTIONS: Array<{ field: Field; page: "home" | "tienda"; title: string; intro: string }> = [
  {
    field: "homeBanners",
    page: "home",
    title: "Banners de Inicio",
    intro: "Salen arriba en Inicio mientras el tema esté activo.",
  },
  {
    field: "tiendaBanners",
    page: "tienda",
    title: "Banner largo de Tienda",
    intro: "Encima del buscador, de orilla a orilla: desde los filtros hasta Destacados.",
  },
];

type Shared = {
  doc: ThemeDocument;
  update: DocUpdate;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
  collections: AdminCollectionRecord[];
  products: Product[];
};

function BannerEditor({
  banner,
  index,
  count,
  page,
  set,
  move,
  remove,
  assets,
  onUploaded,
  onError,
  collections,
  products,
}: Omit<Shared, "doc" | "update"> & {
  banner: Draft;
  index: number;
  count: number;
  page: "home" | "tienda";
  set: (change: Partial<Draft>) => void;
  move: (by: -1 | 1) => void;
  remove: () => void;
}) {
  const min = page === "tienda" ? TIENDA_BANNER_MIN_WIDTH : BANNER_MIN_WIDTH;
  const kind = banner.link.kind;
  return (
    <div className="grid gap-4 rounded-xl border border-[var(--admin-edge)] p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Banner {index + 1}</span>
        <AdminButton
          tone="ghost"
          className="ml-auto"
          disabled={index === 0}
          onClick={() => move(-1)}
          aria-label="Subir banner"
        >
          <ArrowUp className="h-4 w-4" />
        </AdminButton>
        <AdminButton
          tone="ghost"
          disabled={index === count - 1}
          onClick={() => move(1)}
          aria-label="Bajar banner"
        >
          <ArrowDown className="h-4 w-4" />
        </AdminButton>
        <AdminButton tone="danger" onClick={remove} aria-label={`Quitar banner ${index + 1}`}>
          <Trash2 className="h-4 w-4" />
        </AdminButton>
      </div>
      <AssetPicker
        label={`Imagen de computadora (mínimo ${min.desktop} px de ancho)`}
        assets={assets}
        value={banner.desktopAsset}
        minWidth={min.desktop}
        onChange={(desktopAsset) => set({ desktopAsset })}
        onUploaded={(asset) => {
          onUploaded(asset);
          const problem = bannerImageProblem(asset.width, "desktop", page);
          if (problem) onError(problem);
        }}
        onError={onError}
      />
      <AssetPicker
        label={`Imagen de teléfono (mínimo ${min.phone} px de ancho)`}
        assets={assets}
        value={banner.mobileAsset}
        minWidth={min.phone}
        onChange={(mobileAsset) => set({ mobileAsset })}
        onUploaded={(asset) => {
          onUploaded(asset);
          const problem = bannerImageProblem(asset.width, "phone", page);
          if (problem) onError(problem);
        }}
        onError={onError}
      />
      <AdminField
        label="Texto alternativo (obligatorio)"
        hint="Una línea que describa la promo, para lectores de pantalla y Google."
      >
        <AdminInput
          value={banner.alt}
          maxLength={160}
          placeholder="Black Friday: 40% en toda la tienda"
          onChange={(event) => set({ alt: event.target.value })}
        />
      </AdminField>
      <AdminField label="El banner lleva a">
        <AdminSelect
          value={kind}
          onChange={(event) => {
            const next = event.target.value as LinkKind;
            set({
              link:
                next === "collection"
                  ? { kind: next, slug: collections[0]?.slug ?? "" }
                  : next === "product"
                    ? { kind: next, slug: products[0]?.slug ?? "" }
                    : { kind: next },
            });
          }}
        >
          {LINK_KINDS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </AdminSelect>
      </AdminField>
      {banner.link.kind === "collection" ? (
        <AdminField label="Colección" hint="Si después la borras, el banner lleva a la Tienda.">
          <AdminSelect
            value={banner.link.slug}
            onChange={(event) => set({ link: { kind: "collection", slug: event.target.value } })}
          >
            {collections.map((collection) => (
              <option key={collection.id} value={collection.slug}>
                {collection.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      ) : null}
      {banner.link.kind === "product" ? (
        <AdminField
          label="Producto"
          hint="Si después lo borras o lo escondes, el banner lleva a la Tienda."
        >
          <AdminSelect
            value={banner.link.slug}
            onChange={(event) => set({ link: { kind: "product", slug: event.target.value } })}
          >
            {products.map((product) => (
              <option key={product.id} value={product.slug}>
                {product.name}
              </option>
            ))}
          </AdminSelect>
        </AdminField>
      ) : null}
    </div>
  );
}

export function ThemeBannerTab(props: Shared) {
  const { doc, update } = props;
  return (
    <>
      {SECTIONS.map(({ field, page, title, intro }) => {
        const list = doc[field] as Draft[];
        const min = page === "tienda" ? TIENDA_BANNER_MIN_WIDTH : BANNER_MIN_WIDTH;
        // The schema refuses a banner without both images and alt text, so a half-filled one
        // is kept as-is in the draft and the editor's save button explains what's missing.
        const write = (change: (current: Draft[]) => Draft[]) =>
          update((current) => ({
            ...current,
            [field]: change(current[field] as Draft[]) as ThemeHomeBanner[],
          }));
        return (
          <AdminPanel
            key={field}
            title={title}
            actions={
              <AdminButton
                tone="add"
                disabled={list.length >= MAX_BANNERS}
                onClick={() =>
                  write((current) => [
                    ...current,
                    { desktopAsset: null, mobileAsset: null, alt: "", link: { kind: "tienda" } },
                  ])
                }
              >
                Agregar banner
              </AdminButton>
            }
          >
            <div className="grid gap-3">
              <p className="text-sm text-[var(--admin-muted)]">
                {intro} Con más de uno, se turnan solos cada 6 segundos (hasta {MAX_BANNERS}).
                Computadora: mínimo {min.desktop} px de ancho; teléfono: {min.phone} px.{" "}
                {page === "tienda"
                  ? "Es una franja de alto fijo: la imagen la llena y se recorta arriba y abajo, así que usa una foto ancha con lo importante en el centro."
                  : "La altura sigue a la imagen, nunca se recorta."}
              </p>
              {page === "home" ? (
                <AdminCheckbox
                  label='Mantener "Elige tu Tienda"'
                  hint={
                    doc.keepStorePicker
                      ? 'Los banners salen encima y "Elige tu Tienda" sigue debajo. Los banners de las promociones también.'
                      : 'Apagado: los banners ocupan el lugar de "Elige tu Tienda" (las tiendas siguen en el menú). Los banners de las promociones también.'
                  }
                  checked={doc.keepStorePicker}
                  onCheckedChange={(keepStorePicker) =>
                    update((current) => ({ ...current, keepStorePicker }))
                  }
                />
              ) : null}
              {list.map((banner, index) => (
                <BannerEditor
                  key={index}
                  {...props}
                  banner={banner}
                  index={index}
                  count={list.length}
                  page={page}
                  set={(change) =>
                    write((current) =>
                      current.map((entry, at) => (at === index ? { ...entry, ...change } : entry)),
                    )
                  }
                  move={(by) =>
                    write((current) => {
                      const next = [...current];
                      const [moved] = next.splice(index, 1);
                      next.splice(index + by, 0, moved!);
                      return next;
                    })
                  }
                  remove={() => write((current) => current.filter((_, at) => at !== index))}
                />
              ))}
            </div>
          </AdminPanel>
        );
      })}
    </>
  );
}
