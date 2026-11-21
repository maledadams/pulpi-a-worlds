import { useState } from "react";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import {
  AssetPicker,
  DEFAULT_FIT,
  FitControls,
  type LibraryAsset,
} from "@/components/admin/themes/ThemeEditorParts";
import type { ThemeDocument, ThemeSlot, ThemeSlotId } from "@/lib/theme-schema";
import { getAdminChipClassName } from "@/components/admin/AdminControls";

const SLOT_GROUPS: Array<{ title: string; slots: Array<{ id: ThemeSlotId; label: string }> }> = [
  {
    title: "Inicio",
    slots: [
      { id: "home.storeTile.moon", label: "Tienda Moon (Elige tu Tienda)" },
      { id: "home.storeTile.sunshine", label: "Tienda Sunshine (Elige tu Tienda)" },
      { id: "home.storeTile.men", label: "Tienda Men (Elige tu Tienda)" },
      { id: "home.birthday.partyHatLeft", label: "Gorrito izquierdo (cumpleaños)" },
      { id: "home.birthday.partyHatRight", label: "Gorrito derecho (cumpleaños)" },
      { id: "home.birthday.cakeLeft", label: "Bizcocho izquierdo (cumpleaños, teléfono)" },
      { id: "home.birthday.cakeRight", label: "Bizcocho derecho (cumpleaños, teléfono)" },
    ],
  },
  {
    title: "Contacto",
    slots: [
      { id: "contact.phoneLeft", label: "Teléfono izquierdo" },
      { id: "contact.phoneRight", label: "Teléfono derecho" },
    ],
  },
  {
    title: "Logos (en todas partes donde salen)",
    slots: [
      { id: "logo.moon", label: "Logo Moon (menú y hero)" },
      { id: "logo.sunshine", label: "Logo Sunshine (menú y hero)" },
      { id: "logo.men", label: "Logo Men (menú y hero)" },
      { id: "logo.footer.moon", label: "Logo del footer de Moon" },
      { id: "logo.footer.sunshine", label: "Logo del footer de Sunshine" },
      { id: "logo.footer.men", label: "Logo del footer de Men" },
    ],
  },
  {
    title: "Piñas",
    slots: [
      { id: "pineapple.general", label: "Piña general (header, carrito, footer)" },
      { id: "pineapple.moon", label: "Piña Moon" },
      { id: "pineapple.sunshine", label: "Piña Sunshine" },
      { id: "pineapple.men", label: "Piña Men" },
    ],
  },
  {
    title: "Fotos de las subtiendas",
    slots: [
      { id: "subbrand.mood.moon", label: "Foto del hero de Moon" },
      { id: "subbrand.mood.sunshine", label: "Foto del hero de Sunshine" },
      { id: "subbrand.mood.men", label: "Foto del hero de Men" },
    ],
  },
];

type Shared = {
  doc: ThemeDocument;
  update: DocUpdate;
  assets: LibraryAsset[];
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
};

function SlotEditor({ id, label, ...shared }: Shared & { id: ThemeSlotId; label: string }) {
  const slot = shared.doc.slots[id];
  // "Reemplazar" without an image isn't a valid slot yet: show the picker until one is chosen.
  const [choosing, setChoosing] = useState(false);
  const mode = slot?.mode ?? (choosing ? "replace" : "keep");
  const setSlot = (next: ThemeSlot | null) =>
    shared.update((current) => {
      const slots = { ...current.slots };
      if (next && next.mode !== "keep") slots[id] = next;
      else delete slots[id];
      return { ...current, slots };
    });

  return (
    <div className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-1">
          {(
            [
              ["keep", "Igual"],
              ["hide", "Esconder"],
              ["replace", "Reemplazar"],
            ] as const
          ).map(([value, text]) => (
            <button
              key={value}
              type="button"
              className={getAdminChipClassName(mode === value)}
              onClick={() => {
                setChoosing(value === "replace");
                if (value !== "replace") setSlot({ mode: value });
              }}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      {mode === "replace" ? (
        <div className="grid gap-2">
          <AssetPicker
            assets={shared.assets}
            value={slot?.mode === "replace" ? slot.asset : null}
            onChange={(asset) =>
              setSlot(
                asset
                  ? {
                      mode: "replace",
                      asset,
                      desktop: slot?.mode === "replace" ? slot.desktop : undefined,
                      mobile: slot?.mode === "replace" ? slot.mobile : undefined,
                    }
                  : null,
              )
            }
            onUploaded={shared.onUploaded}
            onError={shared.onError}
          />
          {slot?.mode === "replace" ? (
            <div className="grid gap-2">
              <FitControls
                title="Computadora"
                fit={slot.desktop ?? DEFAULT_FIT}
                maxWidth={300}
                onChange={(desktop) => setSlot({ ...slot, desktop })}
              />
              <FitControls
                title="Teléfono"
                fit={slot.mobile ?? slot.desktop ?? DEFAULT_FIT}
                maxWidth={300}
                onChange={(mobile) => setSlot({ ...slot, mobile })}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ThemeImagesTab(shared: Shared) {
  return (
    <>
      {SLOT_GROUPS.map((group) => (
        <AdminPanel key={group.title} title={group.title}>
          <div className="divide-y divide-[var(--admin-line)]">
            {group.slots.map((slot) => (
              <SlotEditor key={slot.id} {...shared} id={slot.id} label={slot.label} />
            ))}
          </div>
        </AdminPanel>
      ))}
      <AdminPanel title="Ícono de la pestaña y vista previa al compartir">
        <div className="grid gap-4">
          <AssetPicker
            label="Ícono de la pestaña (PNG cuadrado, 512 px o más)"
            kind="icon"
            assets={shared.assets}
            value={shared.doc.favicon}
            onChange={(favicon) => shared.update((current) => ({ ...current, favicon }))}
            onUploaded={shared.onUploaded}
            onError={shared.onError}
          />
          <AssetPicker
            label="Imagen al compartir el link (1200 × 630 px recomendado)"
            assets={shared.assets}
            value={shared.doc.shareImage}
            onChange={(shareImage) => shared.update((current) => ({ ...current, shareImage }))}
            onUploaded={shared.onUploaded}
            onError={shared.onError}
          />
          <p className="text-xs text-[var(--admin-faint)]">
            WhatsApp, Instagram y Google guardan la imagen de los links: un cambio puede tardar días
            en verse ahí.
          </p>
        </div>
      </AdminPanel>
    </>
  );
}
