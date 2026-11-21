import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AdminButton,
  AdminInput,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { saveAdminAnnouncements } from "@/lib/admin-content";
import type { AdminAnnouncementRecord } from "@/lib/admin-types";
import { COUNTDOWN_TOKEN } from "@/lib/announcement-schedule";

/**
 * A promotion's own announcements (Lucia, 2026-11-20): bar texts that show only while this
 * promotion is on. Same list as Temas › Anuncios (where dates and countdowns are set).
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
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = announcements.filter((announcement) => announcement.discountId === discountId);

  const save = async (next: AdminAnnouncementRecord[]) => {
    setBusy(true);
    try {
      onSaved(await saveAdminAnnouncements({ data: { announcements: next } }));
      return true;
    } catch (error) {
      onError(error instanceof Error ? error.message : "No se pudo guardar el anuncio.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      {mine.length === 0 ? (
        <p className="text-xs text-[var(--admin-muted)]">
          Sin anuncios propios. Los que agregues salen en la barra de arriba solo mientras esta
          promoción esté encendida.
        </p>
      ) : (
        mine.map((announcement) => (
          <div
            key={announcement.id}
            className="flex items-center gap-2 border border-[var(--admin-edge)] px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 truncate">{announcement.text}</span>
            {!announcement.active ? (
              <span className="text-xs text-[var(--admin-faint)]">apagado</span>
            ) : null}
            <AdminButton
              tone="danger"
              disabled={busy}
              aria-label="Quitar anuncio"
              onClick={() =>
                void (async () => {
                  if (!(await confirmAdminDestructiveAction(`¿Quitar el anuncio "${announcement.text}"?`)))
                    return;
                  await save(announcements.filter((entry) => entry.id !== announcement.id));
                })()
              }
            >
              <Trash2 className="h-4 w-4" />
            </AdminButton>
          </div>
        ))
      )}
      <div className="flex gap-2">
        <AdminInput
          value={text}
          maxLength={160}
          placeholder={`Black Friday termina en ${COUNTDOWN_TOKEN}. Solo comprando en la web.`}
          onChange={(event) => setText(event.target.value)}
          className="min-w-0 flex-1"
        />
        <AdminButton
          tone="add"
          disabled={busy || !text.trim() || announcements.length >= 20}
          onClick={() =>
            void save([
              ...announcements,
              { id: `announcement-${Date.now()}`, text: text.trim(), active: true, discountId },
            ]).then((ok) => ok && setText(""))
          }
        >
          <Plus className="h-4 w-4" /> Agregar
        </AdminButton>
      </div>
      <p className="text-xs text-[var(--admin-faint)]">
        Para fechas o cuenta regresiva ({COUNTDOWN_TOKEN}), edítalo en Temas › Anuncios.
      </p>
    </div>
  );
}
