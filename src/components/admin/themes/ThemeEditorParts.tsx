import { ImagePlus, Trash2, X } from "lucide-react";
import { createContext, useContext, useRef, useState } from "react";
import { AdminButton, AdminSectionLabel } from "@/components/admin/AdminControls";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { prepareThemeImage, themeImageFormData } from "@/lib/theme-image-prepare";
import type { ThemeFit } from "@/lib/theme-schema";
import { DELETED_IMAGE_URL } from "@/lib/theme-placeholder";
import { uploadAdminThemeAsset, type ThemeAssetRef } from "@/lib/themes";
import { cn } from "@/lib/utils";

// Pieces shared by the theme editor's tabs: the image library picker and the
// position / size / rotation controls (spec §6: sliders for precision and keyboard).

export type LibraryAsset = ThemeAssetRef & {
  id: string;
  kind: string;
  usedBy: Array<{ id: string; name: string }>;
};

/** The confirm text for deleting a library image: says which themes lose it, and what happens. */
export function deleteImageQuestion(usedBy: Array<{ name: string }>) {
  const names = [...new Set(usedBy.map((theme) => theme.name))];
  return names.length
    ? `¿Borrar esta imagen? La usa${names.length > 1 ? "n" : ""}: ${names.join(", ")}. En el editor verás un cubo verde donde estaba, para que pongas otra; en la tienda se ve la imagen original (o nada, si era un sticker o un banner). No se puede deshacer.`
    : "¿Borrar esta imagen? No se puede deshacer.";
}

/** The editor's library actions, so every picker can take an image out of the library. */
export const AssetLibraryContext = createContext<{
  dismiss: (asset: LibraryAsset) => Promise<boolean>;
} | null>(null);

export const DEFAULT_FIT: ThemeFit = { x: 50, y: 50, w: 100, rot: 0 };

/** Picks an image from the shared library or uploads a new one (PNG/WebP, compressed here). */
export function AssetPicker({
  assets,
  value,
  kind = "image",
  onChange,
  onUploaded,
  onError,
  minWidth,
  label = "Imagen",
}: {
  assets: LibraryAsset[];
  value: string | null;
  kind?: "image" | "icon";
  onChange: (id: string | null) => void;
  onUploaded: (asset: LibraryAsset) => void;
  onError: (message: string) => void;
  /** Images narrower than this are listed but can't be chosen (banner). */
  minWidth?: number;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const library = useContext(AssetLibraryContext);
  const selected = assets.find((asset) => asset.id === value);
  const choices = assets.filter((asset) =>
    kind === "icon" ? asset.kind === "icon" : asset.kind !== "icon",
  );

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const prepared = await prepareThemeImage(file, kind);
      const saved = await uploadAdminThemeAsset({ data: themeImageFormData(prepared, kind) });
      const asset: LibraryAsset = { ...saved, kind, usedBy: [] };
      onUploaded(asset);
      if (!minWidth || asset.width >= minWidth) onChange(asset.id);
      setOpen(false);
    } catch (error) {
      onError(getAdminErrorMessage(error, "No se pudo subir la imagen."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <AdminSectionLabel>{label}</AdminSectionLabel>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-field)] hover:border-[var(--admin-select)]"
          aria-label={selected ? "Cambiar imagen" : "Elegir imagen"}
        >
          {selected ? (
            <img src={selected.url} alt="" className="h-full w-full object-contain" />
          ) : value ? (
            <img src={DELETED_IMAGE_URL} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-[var(--admin-faint)]" />
          )}
        </button>
        <div className="min-w-0 text-xs text-[var(--admin-muted)]">
          {selected
            ? `${selected.width} × ${selected.height} px`
            : value
              ? "Imagen borrada: elige otra"
              : "Sin imagen"}
          {selected || value ? (
            <button
              type="button"
              className="ml-2 inline-flex items-center gap-1 text-[var(--admin-danger)]"
              onClick={() => onChange(null)}
            >
              <X className="h-3 w-3" /> Quitar
            </button>
          ) : null}
        </div>
      </div>
      {open ? (
        <div className="grid gap-2 rounded-xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-2">
          <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto">
            {choices.map((asset) => {
              const tooSmall = Boolean(minWidth && asset.width < minWidth);
              return (
                <div key={asset.id} className="group relative">
                  <button
                    type="button"
                    disabled={tooSmall}
                    title={
                      tooSmall
                        ? `Mide ${asset.width} px; necesita ${minWidth} px`
                        : `${asset.width} × ${asset.height} px`
                    }
                    onClick={() => {
                      onChange(asset.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "aspect-square w-full overflow-hidden rounded-lg border bg-[var(--admin-field)] disabled:cursor-not-allowed disabled:opacity-40",
                      asset.id === value
                        ? "border-[var(--admin-select)] ring-2 ring-[var(--admin-select)]/40"
                        : "border-[var(--admin-edge)]",
                    )}
                  >
                    <img
                      src={asset.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  </button>
                  {library ? (
                    <button
                      type="button"
                      aria-label="Borrar imagen"
                      title="Borrar imagen"
                      onClick={() =>
                        void library.dismiss(asset).then((done) => {
                          if (done && asset.id === value) onChange(null);
                        })
                      }
                      className="absolute right-1 top-1 rounded-md bg-[var(--admin-surface)]/90 p-1 text-[var(--admin-danger)] opacity-0 shadow-sm transition-opacity hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={kind === "icon" ? "image/png" : "image/png,image/webp,image/jpeg"}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
          <AdminButton
            tone="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading
              ? "Subiendo…"
              : kind === "icon"
                ? "Subir ícono (PNG cuadrado, 512 px o más)"
                : "Subir imagen (PNG o WebP)"}
          </AdminButton>
        </div>
      ) : null}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  // Its own full-width row (Lucia, 2026-11-20: squeezed between the label and the value it
  // was ~35 px wide, so every pixel jumped several percent). Values from a drag in the
  // preview can have a decimal; the slider keeps it until moved, then snaps to `step`.
  return (
    <label className="grid gap-1 text-xs text-[var(--admin-muted)]">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--admin-ink)]">
          {Math.round(value * 10) / 10}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="admin-range w-full"
      />
    </label>
  );
}

/** Position (center), width and rotation, for one device. */
export function FitControls({
  title,
  fit,
  onChange,
  widthLabel = "Tamaño",
  maxWidth = 100,
}: {
  title: string;
  fit: ThemeFit;
  onChange: (fit: ThemeFit) => void;
  widthLabel?: string;
  maxWidth?: number;
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-[var(--admin-field)] p-3 ring-1 ring-[var(--admin-line)]">
      <div className="text-xs font-semibold text-[var(--admin-ink)]">{title}</div>
      <Slider
        label="Horizontal"
        value={fit.x}
        min={-50}
        max={150}
        suffix="%"
        onChange={(x) => onChange({ ...fit, x })}
      />
      <Slider
        label="Vertical"
        value={fit.y}
        min={-50}
        max={150}
        suffix="%"
        onChange={(y) => onChange({ ...fit, y })}
      />
      <Slider
        label={widthLabel}
        value={fit.w}
        min={1}
        max={maxWidth}
        suffix="%"
        onChange={(w) => onChange({ ...fit, w })}
      />
      <Slider
        label="Rotación"
        value={fit.rot}
        min={-180}
        max={180}
        suffix="°"
        onChange={(rot) => onChange({ ...fit, rot })}
      />
    </div>
  );
}
