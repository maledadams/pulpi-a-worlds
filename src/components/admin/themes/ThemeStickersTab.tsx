import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminSelect,
  getAdminChipClassName,
} from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import {
  AssetPicker,
  FitControls,
  type LibraryAsset,
} from "@/components/admin/themes/ThemeEditorParts";
import {
  STICKER_LIMITS,
  type StickerArea,
  type ThemeDocument,
  type ThemeSticker,
} from "@/lib/theme-schema";

const AREAS: Array<{ id: StickerArea; label: string }> = [
  { id: "home", label: "Inicio" },
  { id: "general", label: "Páginas generales" },
  { id: "moon", label: "Moon" },
  { id: "sunshine", label: "Sunshine" },
  { id: "men", label: "Men" },
  { id: "collection", label: "Colecciones de subtiendas" },
  { id: "product", label: "Páginas de producto" },
  { id: "checkout", label: "Carrito y solicitud" },
  { id: "footer", label: "Footer general" },
  { id: "dropdown", label: "Menú general del header" },
];

const MOTIONS: Array<{ id: ThemeSticker["motion"]; label: string }> = [
  { id: "none", label: "Quieto" },
  { id: "float", label: "Flota" },
  { id: "sway", label: "Se balancea" },
  { id: "drift", label: "Cruza de lado a lado" },
  { id: "fall", label: "Cae" },
  { id: "bounce", label: "Rebota" },
  { id: "spin", label: "Gira" },
  { id: "pulse", label: "Late (crece y se encoge)" },
  { id: "wiggle", label: "Se sacude" },
];

type Shared = {
  doc: ThemeDocument;
  update: DocUpdate;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
};

export function ThemeStickersTab(shared: Shared) {
  const [area, setArea] = useState<StickerArea>("home");
  const [adding, setAdding] = useState(false);
  const list = shared.doc.stickers[area] ?? [];
  const max = area === "product" ? STICKER_LIMITS.product : STICKER_LIMITS.desktop;
  const onPhone = list.filter((sticker) => !sticker.hideOnPhone).length;

  const setList = (next: ThemeSticker[]) =>
    shared.update((current) => {
      const stickers = { ...current.stickers };
      if (next.length) stickers[area] = next;
      else delete stickers[area];
      return { ...current, stickers };
    });
  const patch = (index: number, change: Partial<ThemeSticker>) =>
    setList(
      list.map((sticker, position) => (position === index ? { ...sticker, ...change } : sticker)),
    );

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {AREAS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={getAdminChipClassName(area === entry.id)}
            onClick={() => setArea(entry.id)}
          >
            {entry.label}
            {shared.doc.stickers[entry.id]?.length
              ? ` · ${shared.doc.stickers[entry.id]!.length}`
              : ""}
          </button>
        ))}
      </div>
      <p className="text-xs text-[var(--admin-faint)]">
        Máximo {max} {area === "product" ? "(los mismos en todos los productos)" : "por página"} y{" "}
        {STICKER_LIMITS.phone} visibles en teléfono. Nunca tapan botones. También puedes
        arrastrarlos en la vista previa.
      </p>

      {list.map((sticker, index) => (
        <AdminPanel
          key={index}
          title={`Sticker ${index + 1}`}
          actions={
            <AdminButton
              tone="danger"
              aria-label={`Quitar sticker ${index + 1}`}
              onClick={() => setList(list.filter((_, position) => position !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </AdminButton>
          }
        >
          <div className="grid gap-3">
            <AssetPicker
              assets={shared.assets}
              value={sticker.asset}
              onChange={(asset) =>
                asset
                  ? patch(index, { asset })
                  : setList(list.filter((_, position) => position !== index))
              }
              onUploaded={shared.onUploaded}
              onError={shared.onError}
            />
            <div className="grid grid-cols-2 gap-2">
              <AdminField
                label="Se queda"
                hint={
                  sticker.anchor === "page" ? "Baja con el scroll." : "Siempre visible al bajar."
                }
              >
                <AdminSelect
                  value={sticker.anchor}
                  onChange={(event) =>
                    patch(index, { anchor: event.target.value as ThemeSticker["anchor"] })
                  }
                >
                  <option value="page">En la página (baja con el scroll)</option>
                  <option value="viewport">Sticky: pegado a la pantalla</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Movimiento">
                <AdminSelect
                  value={sticker.motion}
                  onChange={(event) =>
                    patch(index, { motion: event.target.value as ThemeSticker["motion"] })
                  }
                >
                  {MOTIONS.map((motion) => (
                    <option key={motion.id} value={motion.id}>
                      {motion.label}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
              <AdminField
                label="Capa"
                hint={
                  sticker.layer === "behind"
                    ? "Detrás, la tienda lo tapa donde hay fondo (el hero, las tarjetas). En la vista previa sale transparente y marcado para que lo muevas."
                    : undefined
                }
              >
                <AdminSelect
                  value={sticker.layer}
                  onChange={(event) =>
                    patch(index, { layer: event.target.value as ThemeSticker["layer"] })
                  }
                >
                  <option value="front">Delante del contenido</option>
                  <option value="behind">Detrás del contenido (solo donde no hay fondo)</option>
                </AdminSelect>
              </AdminField>
              <div className="flex items-end">
                <AdminCheckbox
                  label="Esconder en teléfono"
                  checked={sticker.hideOnPhone}
                  // Showing it on phones again isn't possible while 5 are already visible there.
                  disabled={sticker.hideOnPhone && onPhone >= STICKER_LIMITS.phone}
                  onCheckedChange={(hideOnPhone) => patch(index, { hideOnPhone })}
                />
              </div>
              <div className="flex items-end">
                <AdminCheckbox
                  label="Voltear (espejo)"
                  checked={sticker.flip}
                  onCheckedChange={(flip) => patch(index, { flip })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <FitControls
                title="Computadora"
                fit={sticker.desktop}
                onChange={(desktop) => patch(index, { desktop })}
              />
              {sticker.hideOnPhone ? null : (
                <FitControls
                  title="Teléfono"
                  fit={sticker.mobile}
                  onChange={(mobile) => patch(index, { mobile })}
                />
              )}
            </div>
          </div>
        </AdminPanel>
      ))}

      {list.length < max ? (
        adding ? (
          <AdminPanel title="Nuevo sticker">
            <AssetPicker
              label="Elige o sube la imagen (PNG o WebP con fondo transparente)"
              assets={shared.assets}
              value={null}
              onChange={(asset) => {
                if (!asset) return;
                const hideOnPhone = onPhone >= STICKER_LIMITS.phone;
                setList([
                  ...list,
                  {
                    asset,
                    anchor: "page",
                    motion: "none",
                    layer: "front",
                    hideOnPhone,
                    flip: false,
                    desktop: { x: 50, y: 20, w: 8, rot: 0 },
                    mobile: { x: 50, y: 15, w: 20, rot: 0 },
                  },
                ]);
                setAdding(false);
              }}
              onUploaded={shared.onUploaded}
              onError={shared.onError}
            />
          </AdminPanel>
        ) : (
          <AdminButton tone="add" onClick={() => setAdding(true)}>
            Agregar sticker
          </AdminButton>
        )
      ) : (
        <p className="text-sm text-[var(--admin-muted)]">Llegaste al máximo de stickers aquí.</p>
      )}
    </>
  );
}
