import { CalendarDays, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminInput,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminTag } from "@/components/admin/AdminShell";
import { deleteAdminThemeSchedule, listAdminThemes, saveAdminThemeSchedule } from "@/lib/themes";

// This theme's dates (Lucia, 2026-11-19): one theme can be planned for as many date
// ranges as needed, like a discount. Same calendar as Temas › Calendario (Santo Domingo
// time; overlaps show the most recently started); this tab shows and adds this theme's ranges.

type Entry = Awaited<ReturnType<typeof listAdminThemes>>["schedule"][number];

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function readable(local: string) {
  const [date, time] = local.split("T");
  const [year, month, day] = date!.split("-").map(Number);
  return `${day} ${MONTHS[month! - 1]} ${year} · ${time}`;
}

export function ThemeDatesTab({
  themeId,
  published,
  onNotice,
}: {
  themeId: string;
  published: boolean;
  onNotice: (message: string, tone: "success" | "error" | "info") => void;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { schedule } = await listAdminThemes();
    setEntries(schedule.filter((entry) => entry.themeId === themeId));
  }, [themeId]);
  useEffect(() => {
    load().catch(() => setEntries([]));
  }, [load]);

  const act = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await load();
      onNotice(success, "success");
      return true;
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "No se pudo guardar.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    const saved = await act(
      () => saveAdminThemeSchedule({ data: { themeId, startsAtLocal, endsAtLocal, repeatYearly } }),
      "Fechas guardadas.",
    );
    if (saved) {
      setStartsAtLocal("");
      setEndsAtLocal("");
      setRepeatYearly(false);
    }
  };

  const remove = async (entry: Entry) => {
    if (
      !(await confirmAdminDestructiveAction(
        `¿Quitar estas fechas (${readable(entry.startsAtLocal)} – ${readable(entry.endsAtLocal)})?`,
      ))
    )
      return;
    await act(() => deleteAdminThemeSchedule({ data: { id: entry.id } }), "Fechas quitadas.");
  };

  return (
    <AdminPanel eyebrow="Hora de Santo Domingo, al minuto" title="Fechas de este tema">
      <div className="grid gap-4">
        <p className="text-sm text-[var(--admin-muted)]">
          Programa este tema en todas las fechas que quieras (por ejemplo cada fin de semana de
          oferta). Se prende y se apaga solo. Si se cruza con otro tema, se ve el que empezó más
          recientemente.
        </p>

        <div className="grid gap-2">
          {entries === null ? (
            <p className="text-sm text-[var(--admin-faint)]">Cargando…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">Todavía no tiene fechas.</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                // One line: the dates take the room (wrapping if needed), the tag and the
                // trash stay together on the right (Lucia, 2026-11-20).
                className="flex items-center gap-3 rounded-xl border border-[var(--admin-edge)] px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 text-sm tabular-nums">
                  {readable(entry.startsAtLocal)} → {readable(entry.endsAtLocal)}
                </span>
                {entry.repeatYearly ? (
                  <span className="shrink-0">
                    <AdminTag tone="info">Cada año</AdminTag>
                  </span>
                ) : null}
                <AdminButton
                  tone="danger"
                  className="shrink-0"
                  disabled={busy}
                  onClick={() => void remove(entry)}
                  aria-label="Quitar estas fechas"
                >
                  <Trash2 className="h-4 w-4" />
                </AdminButton>
              </div>
            ))
          )}
        </div>

        {published ? (
          <div className="grid gap-3 rounded-xl bg-[var(--admin-accent-soft)] p-3">
            {/* Stacked: side by side the date fields overflowed the panel (Lucia, 2026-11-20). */}
            <div className="grid min-w-0 gap-3">
              <AdminField label="Empieza">
                <AdminInput
                  type="datetime-local"
                  className="w-full min-w-0"
                  value={startsAtLocal}
                  onChange={(event) => setStartsAtLocal(event.target.value)}
                />
              </AdminField>
              <AdminField label="Termina">
                <AdminInput
                  type="datetime-local"
                  className="w-full min-w-0"
                  value={endsAtLocal}
                  onChange={(event) => setEndsAtLocal(event.target.value)}
                />
              </AdminField>
            </div>
            <AdminCheckbox
              label="Repetir cada año"
              hint="Para fechas fijas (Navidad, San Valentín)."
              checked={repeatYearly}
              onCheckedChange={setRepeatYearly}
            />
            <AdminButton
              tone="save"
              disabled={busy || !startsAtLocal || !endsAtLocal}
              onClick={() => void add()}
            >
              <CalendarDays className="h-4 w-4" /> Agregar fechas
            </AdminButton>
          </div>
        ) : (
          <p className="rounded-xl bg-[var(--admin-info-soft)] p-3 text-sm text-[var(--admin-info)]">
            Publica el tema para poder programarlo. Lo que se programa es la versión publicada.
          </p>
        )}
      </div>
    </AdminPanel>
  );
}
