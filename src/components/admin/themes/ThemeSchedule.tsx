import { CalendarDays, Eye, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminButton,
  AdminCheckbox,
  AdminField,
  AdminInput,
  AdminSelect,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminTag } from "@/components/admin/AdminShell";
import { CALENDAR_PALETTE, ThemeCalendarMenu } from "@/components/admin/themes/ThemeCalendarMenu";
import {
  entriesInRange,
  fromSantoDomingoInput,
  toSantoDomingoInput,
  type ScheduleEntry,
} from "@/lib/theme-schedule";
import {
  deleteAdminThemeSchedule,
  saveAdminThemeSchedule,
  setAdminThemeCalendarColor,
} from "@/lib/themes";
import type { ThemeSummary } from "@/lib/themes-store";
import { cn } from "@/lib/utils";

type Run = <T>(action: () => Promise<T>, success: string) => Promise<T | undefined>;
type Entry = ScheduleEntry & { themeName: string; startsAtLocal: string; endsAtLocal: string };

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function readable(local: string) {
  const [date, time] = local.split("T");
  const [year, month, day] = date!.split("-").map(Number);
  return `${day} ${MONTHS[month! - 1]} ${year} · ${time}`;
}

function nowLocal() {
  return toSantoDomingoInput(new Date().toISOString());
}

/** Monday = 0 ... Sunday = 6, for a day of `year` (set by the caller's closure). */
function weekdayIn(year: number, month: number, day: number) {
  return (new Date(Date.UTC(year, month, day)).getUTCDay() + 6) % 7;
}

/** Every range on each day of the year (Santo Domingo days), the one that shows first. */
function yearCoverage(entries: Entry[], year: number) {
  const days: Array<{ month: number; day: number; hits: Entry[] }> = [];
  const pad = (value: number) => String(value).padStart(2, "0");
  for (let month = 0; month < 12; month++) {
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day++) {
      const start = Date.parse(
        fromSantoDomingoInput(`${year}-${pad(month + 1)}-${pad(day)}T00:00`)!,
      );
      const hits = entriesInRange(entries, start, start + 86_400_000).map((hit) => hit.entry);
      days.push({ month, day, hits });
    }
  }
  return days;
}

/**
 * Automatic colors until one is picked: each theme (in id order, so it never shifts when a
 * theme is edited) takes the next palette color no other theme has picked or been given.
 */
function automaticColors(themes: ThemeSummary[]) {
  const taken = new Set(themes.map((theme) => theme.calendarColor).filter(Boolean));
  const free = CALENDAR_PALETTE.filter((color) => !taken.has(color));
  const pool = free.length ? free : CALENDAR_PALETTE;
  const colors = new Map<string, string>();
  [...themes]
    .filter((theme) => !theme.calendarColor && !theme.isDefault)
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((theme, index) => colors.set(theme.id, pool[index % pool.length]!));
  return colors;
}

/** Dark day numbers on a light color, white on everything else. */
function readableOn(color: string) {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16) / 255);
  const linear = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(r!) + 0.7152 * linear(g!) + 0.0722 * linear(b!);
  return luminance > 0.45 ? "#1b1b1b" : "#ffffff";
}

/** Overlapping themes share the day in equal vertical stripes, oldest range on the left. */
function dayBackground(colors: string[]) {
  if (colors.length === 1) return colors[0]!;
  const step = 100 / colors.length;
  return `linear-gradient(90deg, ${colors
    .map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`)
    .join(", ")})`;
}

export function ThemeSchedule({
  themes,
  schedule,
  busy,
  run,
}: {
  themes: ThemeSummary[];
  schedule: Entry[];
  busy: boolean;
  run: Run;
}) {
  // Tema general is the default, never scheduled.
  const published = themes.filter((theme) => theme.publishedVersion !== null && !theme.isDefault);
  const [themeId, setThemeId] = useState(published[0]?.id ?? "");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());
  // Filled in after hydration: the server's "now" and the browser's can fall on different minutes.
  const [previewAt, setPreviewAt] = useState("");
  useEffect(() => setPreviewAt(nowLocal()), []);

  const colorOf = useMemo(() => {
    const picked = new Map(themes.map((theme) => [theme.id, theme.calendarColor]));
    const automatic = automaticColors(themes);
    return (id: string) => picked.get(id) ?? automatic.get(id) ?? CALENDAR_PALETTE[0]!;
  }, [themes]);
  // The open menu: which day it belongs to (it renders inside that day's cell).
  const [menu, setMenu] = useState<{ key: string; entries: Entry[] } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const weekdayOf = (month: number, day: number) => weekdayIn(year, month, day);
  const openMenu = (event: React.MouseEvent<HTMLElement>, key: string, hits: Entry[]) => {
    if (!hits.length) return;
    event.preventDefault();
    setMenu({ key, entries: hits });
  };
  const days = useMemo(() => yearCoverage(schedule, year), [schedule, year]);

  const leapWarning = repeatYearly && startsAtLocal.slice(5, 10) === "02-29";

  const add = () =>
    void run(
      () => saveAdminThemeSchedule({ data: { themeId, startsAtLocal, endsAtLocal, repeatYearly } }),
      "Fechas guardadas en el calendario.",
    ).then((result) => {
      if (result) {
        setStartsAtLocal("");
        setEndsAtLocal("");
        setRepeatYearly(false);
      }
    });

  const remove = async (entry: Entry) => {
    if (
      !(await confirmAdminDestructiveAction(
        `¿Quitar "${entry.themeName}" del calendario (${readable(entry.startsAtLocal)} – ${readable(entry.endsAtLocal)})?`,
      ))
    )
      return;
    void run(
      () => deleteAdminThemeSchedule({ data: { id: entry.id } }),
      "Fechas quitadas del calendario.",
    );
  };

  return (
    <AdminPanel
      eyebrow="Hora de Santo Domingo, al minuto"
      title="Calendario"
      actions={
        <a
          href={previewAt ? `/?themeDate=${encodeURIComponent(previewAt)}` : "/"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[10px] bg-[var(--admin-soft)] px-3.5 py-2 text-[13px] font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-soft-hover)]"
        >
          <Eye className="h-4 w-4" /> Ver la tienda como el día…
        </a>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          {schedule.length === 0 ? (
            <p className="text-sm text-[var(--admin-muted)]">
              No hay fechas programadas. Sin tema programado ni activo, la tienda se ve como
              siempre.
            </p>
          ) : (
            schedule.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--admin-edge)] px-3 py-2.5"
              >
                <span
                  className="ui-circle h-2.5 w-2.5 shrink-0"
                  style={{ backgroundColor: colorOf(entry.themeId) }}
                  aria-hidden="true"
                />
                <span className="min-w-[8rem] shrink-0 text-sm font-semibold">{entry.themeName}</span>
                <span className="min-w-0 flex-1 text-sm tabular-nums text-[var(--admin-muted)]">
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
                  onClick={() => remove(entry)}
                  aria-label={`Quitar ${entry.themeName}`}
                >
                  <Trash2 className="h-4 w-4" />
                </AdminButton>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-3 rounded-xl bg-[var(--admin-accent-soft)] p-3 amd:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] amd:items-end">
          <AdminField label="Tema">
            <AdminSelect
              value={themeId}
              onChange={(event) => setThemeId(event.target.value)}
              disabled={published.length === 0}
            >
              {published.length === 0 ? <option value="">Publica un tema primero</option> : null}
              {published.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Empieza">
            <AdminInput
              type="datetime-local"
              value={startsAtLocal}
              onChange={(event) => setStartsAtLocal(event.target.value)}
            />
          </AdminField>
          <AdminField label="Termina">
            <AdminInput
              type="datetime-local"
              value={endsAtLocal}
              onChange={(event) => setEndsAtLocal(event.target.value)}
            />
          </AdminField>
          <AdminButton
            tone="save"
            disabled={busy || !themeId || !startsAtLocal || !endsAtLocal}
            onClick={add}
          >
            <CalendarDays className="h-4 w-4" /> Programar
          </AdminButton>
          <div className="amd:col-span-4">
            <AdminCheckbox
              label="Repetir cada año"
              hint={
                leapWarning
                  ? "Ojo: un rango que empieza el 29 de febrero solo existe en años bisiestos."
                  : "Para fechas fijas (Navidad, San Valentín). Black Friday, Pascuas y Día de las Madres cambian de fecha: prográmalas cada año."
              }
              checked={repeatYearly}
              onCheckedChange={setRepeatYearly}
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AdminButton
                tone="ghost"
                onClick={() => setYear((value) => value - 1)}
                aria-label="Año anterior"
              >
                ‹
              </AdminButton>
              <span className="text-sm font-semibold tabular-nums">{year}</span>
              <AdminButton
                tone="ghost"
                onClick={() => setYear((value) => value + 1)}
                aria-label="Año siguiente"
              >
                ›
              </AdminButton>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--admin-muted)]">
              Ver como el día
              <AdminInput
                type="datetime-local"
                value={previewAt}
                onChange={(event) => setPreviewAt(event.target.value)}
                className="w-auto"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 amd:grid-cols-4 a2xl:grid-cols-6">
            {MONTHS.map((label, month) => (
              <div key={label} className="rounded-xl border border-[var(--admin-edge)] p-2">
                <div className="mb-1.5 text-xs font-semibold text-[var(--admin-muted)]">
                  {label}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {["L", "M", "M", "J", "V", "S", "D"].map((weekday, index) => (
                    <span
                      key={`${weekday}-${index}`}
                      className="text-center text-[9px] font-semibold text-[var(--admin-faint)]"
                    >
                      {weekday}
                    </span>
                  ))}
                  {/* Monday-first: blank cells before the 1st. */}
                  {Array.from(
                    { length: (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7 },
                    (_, index) => (
                      <span key={`blank-${index}`} aria-hidden="true" />
                    ),
                  )}
                  {days
                    .filter((entry) => entry.month === month)
                    .map((entry) => {
                      // Stripes left to right by start; the hover label lists the one that shows first.
                      const striped = [...entry.hits].sort((a, b) =>
                        a.startsAt.localeCompare(b.startsAt),
                      );
                      const colors = striped.map((hit) => colorOf(hit.themeId));
                      const dayKey = `${month}-${entry.day}`;
                      return (
                        <div key={entry.day} className="relative">
                          <span
                            onContextMenu={(event) => openMenu(event, dayKey, entry.hits)}
                            onDoubleClick={(event) => openMenu(event, dayKey, entry.hits)}
                            className={cn(
                              "group relative flex h-5 select-none items-center justify-center rounded text-[10px] tabular-nums",
                              entry.hits.length
                                ? "cursor-context-menu"
                                : "text-[var(--admin-faint)]",
                            )}
                            style={
                              entry.hits.length
                                ? {
                                    background: dayBackground(colors),
                                    color: colors.length === 1 ? readableOn(colors[0]!) : "#ffffff",
                                    textShadow:
                                      colors.length > 1 ? "0 0 2px rgb(0 0 0 / 0.55)" : undefined,
                                  }
                                : undefined
                            }
                          >
                            {entry.day}
                            {entry.hits.length ? (
                              <span
                                role="tooltip"
                                className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-30 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--admin-ink)] px-2 py-1 text-left text-[11px] font-medium text-[var(--admin-surface)] shadow-md group-hover:block"
                              >
                                {entry.hits.map((hit, index) => (
                                  <span key={hit.id} className="flex items-center gap-1.5">
                                    <span
                                      className="ui-circle h-2 w-2 shrink-0"
                                      style={{ backgroundColor: colorOf(hit.themeId) }}
                                    />
                                    {hit.themeName}
                                    {entry.hits.length > 1 && index === 0 ? (
                                      <span className="opacity-70">(se ve)</span>
                                    ) : null}
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </span>
                          {menu?.key === dayKey ? (
                            <ThemeCalendarMenu
                              align={weekdayOf(month, entry.day) >= 4 ? "right" : "left"}
                              entries={menu.entries}
                              colorOf={colorOf}
                              busy={busy}
                              onClose={closeMenu}
                              onSaveDates={async (entry, dates) =>
                                Boolean(
                                  await run(
                                    () =>
                                      saveAdminThemeSchedule({
                                        data: { id: entry.id, themeId: entry.themeId, ...dates },
                                      }),
                                    "Fechas cambiadas.",
                                  ),
                                )
                              }
                              onSetColor={async (themeId, color) =>
                                Boolean(
                                  await run(
                                    () =>
                                      setAdminThemeCalendarColor({ data: { id: themeId, color } }),
                                    "Color cambiado.",
                                  ),
                                )
                              }
                              onRemove={async (entry) =>
                                Boolean(
                                  await run(
                                    () => deleteAdminThemeSchedule({ data: { id: entry.id } }),
                                    "Fechas quitadas del calendario.",
                                  ),
                                )
                              }
                            />
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminPanel>
  );
}
