import { AdminCheckbox, AdminField, AdminInput, AdminSelect } from "@/components/admin/AdminControls";
import { AssetPicker, type LibraryAsset } from "@/components/admin/themes/ThemeEditorParts";
import type { Product } from "@/data/products";
import type { AdminCollectionRecord } from "@/lib/admin-types";
import { BANNER_MIN_WIDTH, TIENDA_BANNER_MIN_WIDTH } from "@/lib/theme-banner";
import { promoBannerSchema, type PromoBannerDraft } from "@/lib/theme-schema";

// A promotion's banner (Lucia, 2026-11-20): while the promotion is on it joins the banner
// rotation on Inicio (replacing "Elige tu Tienda"), on Tienda (the long strip) or both,
// whatever theme is active. Images come from the same library as the themes.

const PLACEMENTS: Array<{ id: PromoBannerDraft["placement"]; label: string }> = [
  { id: "home", label: "Inicio (en lugar de Elige tu Tienda)" },
  { id: "tienda", label: "Tienda (franja encima del buscador)" },
  { id: "both", label: "Inicio y Tienda" },
];

type LinkKind = PromoBannerDraft["link"]["kind"];
const LINK_KINDS: Array<{ id: LinkKind; label: string }> = [
  { id: "none", label: "Ningún lado (solo imagen)" },
  { id: "tienda", label: "Tienda" },
  { id: "moon", label: "Moon" },
  { id: "sunshine", label: "Sunshine" },
  { id: "men", label: "Men" },
  { id: "collection", label: "Una colección" },
  { id: "product", label: "Un producto" },
];

const EMPTY: PromoBannerDraft = {
  placement: "home",
  desktopAsset: null,
  mobileAsset: null,
  alt: "",
  link: { kind: "tienda" },
};

export function PromoBannerFields({
  banner,
  onChange,
  assets,
  onUploaded,
  onError,
  collections,
  products,
}: {
  banner: PromoBannerDraft | null | undefined;
  onChange: (banner: PromoBannerDraft | null) => void;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
  collections: AdminCollectionRecord[];
  products: Product[];
}) {
  const set = (change: Partial<PromoBannerDraft>) => onChange({ ...(banner ?? EMPTY), ...change });
  // The stricter of the two sizes when it shows on both pages.
  const min = banner?.placement === "tienda" ? TIENDA_BANNER_MIN_WIDTH : BANNER_MIN_WIDTH;
  const missing = banner
    ? [
        !banner.desktopAsset && "la imagen de computadora",
        !banner.mobileAsset && "la de teléfono",
        !banner.alt.trim() && "el texto alternativo",
      ].filter(Boolean)
    : [];

  return (
    <div className="grid gap-3">
      <AdminCheckbox
        label="Banner mientras esté activa"
        hint="Se suma a los banners que estén saliendo (los turnan solos), haya tema o no. En Inicio reemplaza Elige tu Tienda, salvo que el tema activo lo mantenga."
        checked={Boolean(banner)}
        onCheckedChange={(on) => onChange(on ? (banner ?? EMPTY) : null)}
      />
      {banner ? (
        <div className="grid gap-3 border border-[var(--admin-edge)] p-3">
          <AdminField label="Dónde sale">
            <AdminSelect
              value={banner.placement}
              onChange={(event) =>
                set({ placement: event.target.value as PromoBannerDraft["placement"] })
              }
            >
              {PLACEMENTS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AssetPicker
            label={`Imagen de computadora (mínimo ${min.desktop} px de ancho)`}
            assets={assets}
            value={banner.desktopAsset}
            minWidth={min.desktop}
            onChange={(desktopAsset) => set({ desktopAsset })}
            onUploaded={onUploaded}
            onError={onError}
          />
          <AssetPicker
            label={`Imagen de teléfono (mínimo ${min.phone} px de ancho)`}
            assets={assets}
            value={banner.mobileAsset}
            minWidth={min.phone}
            onChange={(mobileAsset) => set({ mobileAsset })}
            onUploaded={onUploaded}
            onError={onError}
          />
          <AdminField
            label="Texto alternativo (obligatorio)"
            hint="Una línea que describa la promo, para lectores de pantalla y Google."
          >
            <AdminInput
              value={banner.alt}
              maxLength={160}
              placeholder="Black Friday: 30% en ropa y zapatos"
              onChange={(event) => set({ alt: event.target.value })}
            />
          </AdminField>
          <AdminField label="El banner lleva a">
            <AdminSelect
              value={banner.link.kind}
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
            <AdminField label="Colección">
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
            <AdminField label="Producto">
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
          <p className="text-xs text-[var(--admin-muted)]">
            {promoBannerSchema.safeParse(banner).success
              ? "Listo: sale en la tienda mientras la promoción esté activa."
              : `No sale todavía: falta ${missing.join(", ") || "completarlo"}.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
