import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminTag } from "@/components/admin/AdminShell";
import { saveAdminAnnouncements } from "@/lib/admin-content";
import type { AdminAnnouncementRecord, AdminDiscountRecord } from "@/lib/admin-types";
import {
  COUNTDOWN_TOKEN,
  formatCountdown,
  isAnnouncementLive,
  splitCountdownText,
} from "@/lib/announcement-schedule";
import { fromSantoDomingoInput, toSantoDomingoInput } from "@/lib/theme-schedule";

type Run = <T>(action: () => Promise<T>, success: string) => Promise<T | undefined>;
type Row = {
  id: string;
  text: string;
  active: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  countdownLocal: string;
  discountId: string;
};

const toRow = (announcement: AdminAnnouncementRecord): Row => ({
  id: announcement.id,
  text: announcement.text,
  active: announcement.active,
  startsAtLocal: announcement.startsAt ? toSantoDomingoInput(announcement.startsAt) : "",
  endsAtLocal: announcement.endsAt ? toSantoDomingoInput(announcement.endsAt) : "",
  countdownLocal: announcement.countdownTo ? toSantoDomingoInput(announcement.countdownTo) : "",
  discountId: announcement.discountId ?? "",
});

const toRecord = (row: Row): AdminAnnouncementRecord => ({
  id: row.id,
  text: row.text.trim(),
  active: row.active,
  startsAt: row.startsAtLocal ? fromSantoDomingoInput(row.startsAtLocal) : null,
  endsAt: row.endsAtLocal ? fromSantoDomingoInput(row.endsAtLocal) : null,
  countdownTo: row.countdownLocal ? fromSantoDomingoInput(row.countdownLocal) : null,
  discountId: row.discountId || null,
});

/**
 * The announcement bar texts (spec §5.6b; Lucia 2026-11-19: they live here, in Temas).
 * Global, not part of any theme: a theme only changes the bar's colors.
 */
export function ThemeAnnouncements({
  announcements,
  discounts,
  busy,
  run,
}: {
  announcements: AdminAnnouncementRecord[];
  /** For "only while this promotion is on". */
  discounts: AdminDiscountRecord[];
  busy: boolean;
  run: Run;
}) {
  const promoName = (discount: AdminDiscountRecord) =>
    discount.kind === "code" ? `Código ${discount.code}` : discount.label;
  const [rows, setRows] = useState<Row[]>(() => announcements.map(toRow));
  const [dirty, setDirty] = useState(false);

  const update = (id: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setDirty(true);
  };

  const save = () =>
    void run(
      () => saveAdminAnnouncements({ data: { announcements: rows.map(toRecord) } }),
      "Anuncios guardados.",
    ).then((saved) => {
      if (saved) {
        setRows(saved.map(toRow));
        setDirty(false);
      }
    });

  const now = Date.now();
  return (
    <AdminPanel
      eyebrow="La barra de arriba de la tienda. El tema solo cambia sus colores."
      title="Anuncios"
      actions={
        <>
          <AdminButton
            tone="add"
            disabled={busy || rows.length >= 20}
            onClick={() => {
              setRows((current) => [
                ...current,
                {
                  id: `announcement-${Date.now()}`,
                  text: "",
                  active: true,
                  startsAtLocal: "",
                  endsAtLocal: "",
                  countdownLocal: "",
                  discountId: "",
                },
              ]);
              setDirty(true);
            }}
          >
            <Plus className="h-4 w-4" /> Agregar anuncio
          </AdminButton>
          <AdminButton tone="save" disabled={busy || !dirty} onClick={save}>
            Guardar anuncios
          </AdminButton>
        </>
      }
    >
      <div className="grid gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            No hay anuncios. La barra no se muestra.
          </p>
        ) : null}
        {rows.map((row) => {
          const record = toRecord(row);
          const live = isAnnouncementLive(record, now);
          return (
            <div
              key={row.id}
              className="grid gap-3 rounded-xl border border-[var(--admin-edge)] p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <AdminField label="Texto">
                    <AdminInput
                      value={row.text}
                      maxLength={160}
                      onChange={(event) => update(row.id, { text: event.target.value })}
                      placeholder="Black Friday termina en {cuenta}"
                    />
                  </AdminField>
                </div>
                <div className="pt-7">
                  <AdminTag tone={live ? "dark" : "soft"}>
                    {!live ? "No se ve ahora" : row.discountId ? "Con su promoción" : "Se ve ahora"}
                  </AdminTag>
                </div>
                <AdminButton
                  tone="danger"
                  className="mt-6"
                  disabled={busy}
                  aria-label="Quitar anuncio"
                  onClick={() => {
                    setRows((current) => current.filter((entry) => entry.id !== row.id));
                    setDirty(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </AdminButton>
              </div>
              <div className="grid gap-3 amd:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] amd:items-end">
                <AdminCheckbox
                  label="Encendido"
                  checked={row.active}
                  onCheckedChange={(checked) => update(row.id, { active: checked })}
                />
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
              <AdminField
                label="Solo mientras esté activa la promoción (opcional)"
                hint="Se ve únicamente cuando esa promoción o código está encendido, ya sea a mano o por su tema."
              >
                <AdminSelect
                  value={row.discountId}
                  onChange={(event) => update(row.id, { discountId: event.target.value })}
                >
                  <option value="">Siempre (sin promoción)</option>
                  {discounts.map((discount) => (
                    <option key={discount.id} value={discount.id}>
                      {promoName(discount)}
                    </option>
                  ))}
                  {row.discountId && !discounts.some((discount) => discount.id === row.discountId) ? (
                    <option value={row.discountId}>Promoción borrada</option>
                  ) : null}
                </AdminSelect>
              </AdminField>
              <div className="grid gap-3 amd:grid-cols-[minmax(0,1fr)_auto] amd:items-end">
                <AdminField
                  label="Cuenta regresiva hasta (opcional)"
                  hint={`Muestra el tiempo que falta (2d 14:03:09). Escribe ${COUNTDOWN_TOKEN} en el texto donde lo quieras; si no, va al final. Al llegar a cero el anuncio se esconde solo.`}
                >
                  <AdminInput
                    type="datetime-local"
                    value={row.countdownLocal}
                    onChange={(event) => update(row.id, { countdownLocal: event.target.value })}
                  />
                </AdminField>
                <AdminButton
                  tone="ghost"
                  disabled={!row.endsAtLocal}
                  title={row.endsAtLocal ? undefined : "Ponle un final primero"}
                  onClick={() => update(row.id, { countdownLocal: row.endsAtLocal })}
                >
                  Contar hasta el final
                </AdminButton>
              </div>
              {row.countdownLocal ? (
                <p className="text-xs text-[var(--admin-muted)]">
                  Se ve así:{" "}
                  <span className="font-medium text-[var(--admin-ink)]">
                    {(() => {
                      const target = fromSantoDomingoInput(row.countdownLocal);
                      const [before, after] = splitCountdownText(row.text || "Termina en");
                      return `${before}${target ? formatCountdown(Date.parse(target) - now) : "--:--:--"}${after}`;
                    })()}
                  </span>
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </AdminPanel>
  );
}
