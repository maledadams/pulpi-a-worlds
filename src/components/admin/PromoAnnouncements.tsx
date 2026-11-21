import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  AdminButton,
  AdminField,
  AdminInput,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import {
  AnnouncementCountdown,
  toRecord,
  toRow,
} from "@/components/admin/themes/ThemeAnnouncements";
import { saveAdminAnnouncements } from "@/lib/admin-content";
import type { AdminAnnouncementRecord } from "@/lib/admin-types";
import { COUNTDOWN_TOKEN, isAnnouncementLive } from "@/lib/announcement-schedule";

type Row = ReturnType<typeof toRow>;

/**
 * A promotion's own announcements (Lucia, 2026-11-20): bar texts that show only while this
 * promotion is on. Each can have its own dates and count down to its end (Lucia, 2026-11-21:
 * the countdown is a checkbox, and the dates are set here, not only in Temas › Anuncios).
 * Same list as Temas › Anuncios.
 */
export function PromoAnnouncements({
  discountId,
  announcements,
  onSaved,
  onError,
}: {
  discountId: string;
  announcements: AdminAnnouncementRecord[];
  onSaved: (announcements: AdminAnnouncementRecord[]) => void;
  onError: (message: string) => void;
}) {
  const mineOf = (list: AdminAnnouncementRecord[]) =>
    list.filter((announcement) => announcement.discountId === discountId).map(toRow);
  const [rows, setRows] = useState<Row[]>(() => mineOf(announcements));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  // Saved elsewhere (or another promotion opened): show what's stored, unless mid-edit.
  useEffect(() => {
    if (!dirty) setRows(mineOf(announcements));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, discountId]);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const save = async (next: Row[]) => {
    setBusy(true);
    try {
      // The other announcements stay as they are, in their place; this promotion's go last.
      const others = announcements.filter((announcement) => announcement.discountId !== discountId);
      const saved = await saveAdminAnnouncements({
        data: { announcements: [...others, ...next.map(toRecord).filter((entry) => entry.text)] },
      });
      onSaved(saved);
      setRows(mineOf(saved));
      setDirty(false);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo guardar el anuncio.");
    } finally {
      setBusy(false);
    }
  };

  const now = Date.now();
  const full = announcements.length - mineOf(announcements).length + rows.length >= 20;
  return (
    <div className="grid gap-3">
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--admin-muted)]">
          Sin anuncios propios. Los que agregues salen en la barra de arriba solo mientras esta
          promoción esté encendida (y dentro de sus fechas, si les pones).
        </p>
      ) : null}
      {rows.map((row) => {
        const record = toRecord(row);
        // The promotion's own on/off is checked on the store; here, only text and dates.
        const inDates = isAnnouncementLive({ ...record, active: true }, now);
        return (
          <div key={row.id} className="grid gap-3 border border-[var(--admin-edge)] p-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <AdminInput
                  value={row.text}
                  maxLength={160}
                  aria-label="Texto del anuncio"
                  placeholder={`Black Friday termina en ${COUNTDOWN_TOKEN}. Solo comprando en la web.`}
                  onChange={(event) => update(row.id, { text: event.target.value })}
                />
              </div>
              <AdminButton
                tone="danger"
                disabled={busy}
                aria-label="Quitar anuncio"
                onClick={() =>
                  void (async () => {
                    if (
                      row.text.trim() &&
                      !(await confirmAdminDestructiveAction(`¿Quitar el anuncio "${row.text}"?`))
                    )
                      return;
                    await save(rows.filter((entry) => entry.id !== row.id));
                  })()
                }
              >
                <Trash2 className="h-4 w-4" />
              </AdminButton>
            </div>
            <div className="grid gap-3">
              <AdminField label="Desde (opcional)">
                <AdminInput
                  type="datetime-local"
                  value={row.startsAtLocal}
                  onChange={(event) => update(row.id, { startsAtLocal: event.target.value })}
                />
              </AdminField>
              <AdminField label="Hasta (opcional)">
                <AdminInput
                  type="datetime-local"
                  value={row.endsAtLocal}
                  onChange={(event) => update(row.id, { endsAtLocal: event.target.value })}
                />
              </AdminField>
            </div>
            <AnnouncementCountdown
              row={row}
              now={now}
              onChange={(patch) => update(row.id, patch)}
            />
            {!row.active ? (
              <p className="text-xs text-[var(--admin-faint)]">
                Apagado en Temas › Anuncios: no se ve.
              </p>
            ) : record.text && !inDates ? (
              <p className="text-xs text-[var(--admin-faint)]">
                Fuera de sus fechas: ahora no se ve.
              </p>
            ) : null}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <AdminButton
          tone="add"
          disabled={busy || full}
          onClick={() => {
            setRows((current) => [
              ...current,
              toRow({ id: `announcement-${Date.now()}`, text: "", active: true, discountId }),
            ]);
            setDirty(true);
          }}
        >
          <Plus className="h-4 w-4" /> Agregar anuncio
        </AdminButton>
        <AdminButton tone="save" disabled={busy || !dirty} onClick={() => void save(rows)}>
          Guardar anuncios
        </AdminButton>
      </div>
      <p className="text-xs text-[var(--admin-faint)]">
        Con fechas, el anuncio se prende y se apaga solo en esas fechas (siempre que la promoción
        esté encendida). Sin fechas, se ve todo el tiempo que la promoción esté encendida.
      </p>
    </div>
  );
}
