import { Link, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Download, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AdminButton,
  AdminEmptyState,
  AdminToast,
  type AdminToastTone,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import { ThemeAnnouncements } from "@/components/admin/themes/ThemeAnnouncements";
import { ThemeEditor } from "@/components/admin/themes/ThemeEditor";
import { ThemeLibrary } from "@/components/admin/themes/ThemeLibrary";
import { ThemeSchedule } from "@/components/admin/themes/ThemeSchedule";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  getAdminCollections,
  getAdminDiscounts,
  getAdminSettingsRecord,
} from "@/lib/admin-content";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import {
  activateAdminTheme,
  createAdminTheme,
  deactivateAdminTheme,
  deleteAdminTheme,
  duplicateAdminTheme,
  exportAdminTheme,
  getAdminTheme,
  importAdminTheme,
  listAdminThemeAssets,
  listAdminThemes,
  publishAdminTheme,
} from "@/lib/themes";
import { formatSantoDomingoShort } from "@/lib/theme-schedule";
import type { ThemeImportReport } from "@/lib/themes";
import type { ThemeSummary } from "@/lib/themes-store";
import { cn } from "@/lib/utils";

// Temas (spec 2026-11-16-pulpina-theme-engine-design §6): the themes, their calendar,
// "Activar ahora", and the announcement texts (Lucia, 2026-11-19).

type TemasSearch = { tema?: string; editar?: "si" };

export const Route = createFileRoute("/admin/temas")({
  validateSearch: (search: Record<string, unknown>): TemasSearch => ({
    tema: typeof search.tema === "string" && search.tema.trim() ? search.tema.trim() : undefined,
    editar: search.editar === "si" ? "si" : undefined,
  }),
  beforeLoad: () => enforceAdminAccess(),
  loaderDeps: ({ search }) => ({ tema: search.tema, editar: search.editar }),
  loader: async ({ deps }) => {
    const [list, settings, library, discounts] = await Promise.all([
      listAdminThemes(),
      getAdminSettingsRecord(),
      listAdminThemeAssets(),
      getAdminDiscounts(),
    ]);
    const selectedId = deps.tema ?? list.themes[0]?.id;
    const detail = selectedId
      ? await getAdminTheme({ data: { id: selectedId } }).catch(() => null)
      : null;
    // The editor also needs discounts and collections; the overview only the library.
    const editorData =
      deps.editar && detail
        ? await getAdminCollections().then((collections) => ({
            assets: library,
            discounts,
            collections,
          }))
        : null;
    return {
      ...list,
      detail,
      announcements: settings.announcements,
      editorData,
      library,
      discounts,
    };
  },
  head: () => ({ meta: [{ title: "Admin - Temas" }] }),
  component: AdminThemesPage,
});

function statusOf(theme: ThemeSummary) {
  if (theme.isDefault) return { label: "Predeterminado", tone: "dark" as const };
  if (theme.isActive) return { label: "Activo ahora", tone: "dark" as const };
  if (theme.isScheduled) return { label: "Programado", tone: "info" as const };
  if (theme.publishedVersion !== null) return { label: "Publicado", tone: "success" as const };
  return { label: "Borrador", tone: "warn" as const };
}

function savedLabel(theme: Pick<ThemeSummary, "updatedAt" | "updatedBy">) {
  const date = formatSantoDomingoShort(theme.updatedAt);
  return `Guardado ${date}${theme.updatedBy && theme.updatedBy !== "local" ? ` · ${theme.updatedBy}` : ""}`;
}

function ThemeCard({ theme, selected }: { theme: ThemeSummary; selected: boolean }) {
  const status = statusOf(theme);
  return (
    <Link
      to="/admin/temas"
      search={{ tema: theme.id }}
      className={cn(
        "block rounded-xl border px-3 py-2.5 transition",
        selected
          ? "border-transparent bg-[var(--admin-accent-soft)]"
          : "border-[var(--admin-edge)] bg-[var(--admin-surface)] hover:bg-[var(--admin-accent-soft)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{theme.name}</span>
        <AdminTag tone={status.tone}>{status.label}</AdminTag>
      </div>
      {theme.hasUnpublishedChanges && theme.publishedVersion !== null ? (
        <div className="mt-1 text-xs font-medium text-[var(--admin-warn)]">
          Cambios sin publicar
        </div>
      ) : null}
    </Link>
  );
}

/** What a theme-file import created, in words (src/lib/themes.ts importAdminTheme). */
function importSummary(report: ThemeImportReport | null) {
  if (!report) return { text: "Tema importado como borrador (archivo sin imágenes ni descuentos).", ok: true };
  const lines = [
    `Tema importado como borrador con ${report.images} ${report.images === 1 ? "imagen" : "imágenes"}.`,
  ];
  let ok = true;
  for (const discount of report.discounts) {
    if (!discount.created) {
      ok = false;
      lines.push(`"${discount.label}": no se creó (${discount.note ?? "error"}).`);
    } else if (discount.missing.length) {
      ok = false;
      lines.push(
        `"${discount.label}": creado, pero estas categorías no existen aquí: ${discount.missing.join(", ")}. Revísalo en Descuentos.`,
      );
    } else {
      lines.push(`"${discount.label}": creado, apagado hasta que el tema esté activo.`);
    }
  }
  return { text: lines.join("\n"), ok };
}

function downloadJson(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function AdminThemesPage() {
  const { themes, override, schedule, detail, announcements, editorData, library, discounts } =
    Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [importNote, setImportNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<AdminToastTone>("info");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const show = (text: string, nextTone: AdminToastTone) => {
    setTone(nextTone);
    setMessage(text);
  };

  const run = async <T,>(
    action: () => Promise<T>,
    success: string,
    after?: (result: T) => TemasSearch,
  ) => {
    setBusy(true);
    try {
      const result = await action();
      if (success) show(success, "success");
      if (after) await navigate({ to: "/admin/temas", search: after(result) });
      await router.invalidate();
      return result;
    } catch (error) {
      show(getAdminErrorMessage(error, "No se pudo completar. Intenta de nuevo."), "error");
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const summary = detail ? (themes.find((theme) => theme.id === detail.id) ?? null) : null;
  const editing = search.editar === "si" && detail && editorData;

  if (editing) {
    return (
      <AdminShell section="temas" title="Temas" subtitle={`Editando: ${detail.name}`}>
        {message ? <AdminToast message={message} tone={tone} /> : null}
        <ThemeEditor
          key={detail.id}
          theme={detail}
          assets={editorData.assets}
          discounts={editorData.discounts}
          collections={editorData.collections}
          onNotice={show}
          onClose={() =>
            void navigate({ to: "/admin/temas", search: { tema: detail.id } }).then(() =>
              router.invalidate(),
            )
          }
        />
      </AdminShell>
    );
  }

  const remove = async (theme: ThemeSummary) => {
    if (
      !(await confirmAdminDestructiveAction(
        `Vas a borrar el tema "${theme.name}" y su historial. Las imágenes quedan en la biblioteca. Esto no se puede deshacer. ¿Continuar?`,
      ))
    ) {
      return;
    }
    void run(
      () => deleteAdminTheme({ data: { id: theme.id } }),
      "Tema borrado.",
      () => ({}),
    );
  };

  const activate = async (theme: ThemeSummary) => {
    const replacing =
      override && override.themeId !== theme.id
        ? themes.find((entry) => entry.id === override.themeId)
        : null;
    const note = replacing ? ` Reemplaza a "${replacing.name}", que está activo ahora.` : "";
    if (
      !(await confirmAdminDestructiveAction(
        `¿Activar "${theme.name}" ahora en la tienda?${note} Queda activo hasta que lo desactives, por encima del calendario.`,
      ))
    ) {
      return;
    }
    void run(
      () => activateAdminTheme({ data: { id: theme.id } }),
      `"${theme.name}" está activo en la tienda.`,
    );
  };

  const actionsFor = (theme: ThemeSummary) => (
    <>
      {theme.isDefault ? null : (
        <AdminButton
          tone="danger"
          disabled={busy || theme.isActive || theme.isScheduled}
          onClick={() => remove(theme)}
        >
          Eliminar
        </AdminButton>
      )}
      <AdminButton
        tone="ghost"
        disabled={busy}
        onClick={() =>
          void run(() => exportAdminTheme({ data: { id: theme.id } }), "").then((result) => {
            if (result)
              downloadJson(
                `tema-${theme.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
                result.json,
              );
          })
        }
      >
        <Download className="h-4 w-4" /> Exportar
      </AdminButton>
      <AdminButton
        tone="secondary"
        disabled={busy}
        onClick={() =>
          void run(
            () =>
              duplicateAdminTheme({
                data: { id: theme.id, name: `${theme.name} (copia)`.slice(0, 60) },
              }),
            "Copia creada. Cámbiale el nombre al editarla.",
            (result) => ({ tema: result.id, editar: "si" }),
          )
        }
      >
        Duplicar
      </AdminButton>
      {theme.isDefault ? null : theme.isActive ? (
        <AdminButton
          tone="warning"
          disabled={busy}
          onClick={() =>
            void run(
              () => deactivateAdminTheme(),
              "Tema desactivado. La tienda vuelve al calendario.",
            )
          }
        >
          Desactivar
        </AdminButton>
      ) : (
        <AdminButton
          tone="secondary"
          disabled={busy || theme.publishedVersion === null}
          title={theme.publishedVersion === null ? "Publica el tema primero" : undefined}
          onClick={() => activate(theme)}
        >
          Activar ahora
        </AdminButton>
      )}
      {theme.hasUnpublishedChanges ? (
        <AdminButton
          tone="save"
          disabled={busy}
          onClick={() =>
            void run(
              () => publishAdminTheme({ data: { id: theme.id, baseVersion: theme.version } }),
              "Tema publicado.",
            )
          }
        >
          Publicar
        </AdminButton>
      ) : null}
      <AdminButton
        tone="active"
        disabled={busy}
        onClick={() =>
          void navigate({ to: "/admin/temas", search: { tema: theme.id, editar: "si" } })
        }
      >
        Editar
      </AdminButton>
    </>
  );

  return (
    <AdminShell
      section="temas"
      title="Temas"
      subtitle="Colores, imágenes, stickers y efectos para cada fecha. La tienda muestra el tema activo; sin tema, se ve como siempre."
      actions={
        <>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void file.text().then(async (json) => {
                const result = await run(
                  () => importAdminTheme({ data: { json } }),
                  "",
                  (imported) => ({ tema: imported.id }),
                );
                if (result) {
                  const { text, ok } = importSummary(result.report);
                  // Longer than a toast: it may name categories to fix in Descuentos.
                  setImportNote(text);
                  show(ok ? "Tema importado como borrador." : "Tema importado, revisa los descuentos.", ok ? "success" : "info");
                }
              });
            }}
          />
          <AdminButton tone="ghost" disabled={busy} onClick={() => importRef.current?.click()}>
            <Upload className="h-4 w-4" /> Importar
          </AdminButton>
          <AdminButton
            tone="create"
            disabled={busy}
            onClick={() =>
              void run(
                () => createAdminTheme({ data: { name: "Tema nuevo" } }),
                "Tema creado. Ponle nombre y colores.",
                (result) => ({ tema: result.id, editar: "si" }),
              )
            }
          >
            <Plus className="h-4 w-4" /> Nuevo tema
          </AdminButton>
        </>
      }
    >
      {message ? <AdminToast message={message} tone={tone} /> : null}
      {importNote ? (
        <div className="mb-4 flex items-start gap-3 rounded-xl bg-[var(--admin-info-soft)] p-3 text-sm text-[var(--admin-info)]">
          <p className="min-w-0 flex-1 whitespace-pre-line">{importNote}</p>
          <AdminButton tone="ghost" onClick={() => setImportNote("")} aria-label="Cerrar aviso">
            Cerrar
          </AdminButton>
        </div>
      ) : null}
      <div className="grid items-start gap-4 alg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grid gap-2">
          {themes.length === 0 ? (
            <p className="text-sm text-[var(--admin-on-bg-muted)]">Todavía no hay temas.</p>
          ) : (
            themes.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} selected={theme.id === detail?.id} />
            ))
          )}
        </aside>

        <div className="grid min-w-0 gap-4">
          {detail && summary ? (
            <AdminPanel
              eyebrow={savedLabel(summary)}
              title={summary.name}
              actions={actionsFor(summary)}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--admin-muted)]">
                <AdminTag tone={statusOf(summary).tone}>{statusOf(summary).label}</AdminTag>
                {summary.isDefault ? (
                  <span>
                    El look de siempre de la tienda: se ve cuando no hay otro tema activo o
                    programado. Edítalo y publícalo para cambiar la tienda de todos los días; no se
                    programa ni se activa.
                    {summary.hasUnpublishedChanges ? " Tiene cambios sin publicar." : ""}
                  </span>
                ) : summary.publishedVersion === null ? (
                  <span>Nunca publicado: la tienda no lo puede usar hasta que lo publiques.</span>
                ) : summary.hasUnpublishedChanges ? (
                  <span>
                    Tiene cambios guardados que la tienda todavía no ve. Publícalos cuando estén
                    listos.
                  </span>
                ) : (
                  <span>La tienda usa la última versión guardada.</span>
                )}
              </div>
            </AdminPanel>
          ) : (
            <AdminEmptyState
              title="Crea tu primer tema"
              body="Un tema cambia colores, imágenes, stickers y efectos de la tienda en una fecha (Black Friday, Navidad…). Lo programas en el calendario o lo activas cuando quieras."
            />
          )}

          <ThemeSchedule themes={themes} schedule={schedule} busy={busy} run={run} />
          <ThemeAnnouncements
            announcements={announcements}
            discounts={discounts}
            busy={busy}
            run={run}
          />
          <ThemeLibrary assets={library} busy={busy} run={run} />
        </div>
      </div>
    </AdminShell>
  );
}
