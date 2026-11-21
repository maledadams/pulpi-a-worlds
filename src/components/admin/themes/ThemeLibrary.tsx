import { Trash2 } from "lucide-react";
import { confirmAdminDestructiveAction } from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import { deleteImageQuestion, type LibraryAsset } from "@/components/admin/themes/ThemeEditorParts";
import { deleteAdminThemeAsset } from "@/lib/themes";

type Run = <T>(action: () => Promise<T>, success: string) => Promise<T | undefined>;

/**
 * Every image uploaded for themes, with where each one is used, and Borrar (Lucia,
 * 2026-11-20). Deleting an image a theme uses never breaks it: the editor shows a
 * green-screen cube there, and the live store falls back to the original.
 */
export function ThemeLibrary({
  assets,
  busy,
  run,
}: {
  assets: LibraryAsset[];
  busy: boolean;
  run: Run;
}) {
  const remove = async (asset: LibraryAsset) => {
    if (!(await confirmAdminDestructiveAction(deleteImageQuestion(asset.usedBy)))) return;
    await run(
      () => deleteAdminThemeAsset({ data: { id: asset.id, force: true } }),
      "Imagen borrada.",
    );
  };

  return (
    <AdminPanel
      eyebrow={`${assets.length} ${assets.length === 1 ? "imagen" : "imágenes"}`}
      title="Biblioteca de imágenes"
    >
      {assets.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">
          Todavía no has subido imágenes. Se suben desde el editor de cada tema.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 amd:grid-cols-4 a2xl:grid-cols-6">
          {assets.map((asset) => {
            const names = [...new Set(asset.usedBy.map((theme) => theme.name))];
            return (
              <figure
                key={asset.id}
                className="grid gap-1.5 border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-2"
              >
                {/* Checkerboard behind, so transparent stickers and particles read. */}
                <div className="aspect-square overflow-hidden bg-[repeating-conic-gradient(var(--admin-soft)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                  <img
                    src={asset.url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </div>
                <figcaption className="grid gap-0.5 text-[11px] leading-snug">
                  <span className="tabular-nums text-[var(--admin-muted)]">
                    {asset.width} × {asset.height} px{asset.kind === "icon" ? " · ícono" : ""}
                  </span>
                  <span className="truncate text-[var(--admin-faint)]" title={names.join(", ")}>
                    {names.length ? `En: ${names.join(", ")}` : "Sin usar"}
                  </span>
                </figcaption>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(asset)}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1 text-xs font-semibold text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft,var(--admin-soft))] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Borrar
                </button>
              </figure>
            );
          })}
        </div>
      )}
    </AdminPanel>
  );
}
