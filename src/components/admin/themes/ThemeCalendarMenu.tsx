import { CalendarClock, ChevronLeft, Palette, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminCheckbox, confirmAdminDestructiveAction } from "@/components/admin/AdminControls";
import { cn } from "@/lib/utils";

// The calendar's small right-click / double-click menu (Lucia, 2026-11-20). On a day with
// several themes it first asks which one; then it offers: change the dates of that range
// (every day of it, not just the clicked one), change the theme's color (everywhere the
// theme shows), or take the range off the calendar.

export type CalendarMenuEntry = {
  id: string;
  themeId: string;
  themeName: string;
  startsAtLocal: string;
  endsAtLocal: string;
  repeatYearly: boolean;
};

/** Distinct colors that carry white day numbers; any other color can be picked too. */
export const CALENDAR_PALETTE = [
  "#d6336c",
  "#7048e8",
  "#1c7ed6",
  "#0ca678",
  "#e8590c",
  "#c2255c",
  "#5f3dc4",
  "#1971c2",
  "#2b8a3e",
  "#f08c00",
  "#a61e4d",
  "#495057",
];

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function shortRange(entry: Pick<CalendarMenuEntry, "startsAtLocal" | "endsAtLocal">) {
  const day = (local: string) => {
    const [date] = local.split("T");
    const [, month, dayOfMonth] = date!.split("-").map(Number);
    return `${dayOfMonth} ${MONTHS[month! - 1]}`;
  };
  return `${day(entry.startsAtLocal)} → ${day(entry.endsAtLocal)}`;
}

type View = "pick" | "actions" | "dates" | "color";

export function ThemeCalendarMenu({
  align,
  entries,
  colorOf,
  busy,
  onClose,
  onSaveDates,
  onSetColor,
  onRemove,
}: {
  /**
   * The menu sits inside the clicked day's cell, right under it (never above, never on
   * top of it). "right" lines it up with the day's right edge, for days near the end of
   * the week, so it stays inside the calendar.
   */
  align: "left" | "right";
  /** The ranges on the clicked day, the one that shows first. */
  entries: CalendarMenuEntry[];
  colorOf: (themeId: string) => string;
  busy: boolean;
  onClose: () => void;
  onSaveDates: (
    entry: CalendarMenuEntry,
    dates: { startsAtLocal: string; endsAtLocal: string; repeatYearly: boolean },
  ) => Promise<boolean>;
  onSetColor: (themeId: string, color: string | null) => Promise<boolean>;
  onRemove: (entry: CalendarMenuEntry) => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<CalendarMenuEntry | null>(
    entries.length === 1 ? entries[0]! : null,
  );
  const [view, setView] = useState<View>(entries.length === 1 ? "actions" : "pick");
  const [startsAtLocal, setStartsAtLocal] = useState("");
  const [endsAtLocal, setEndsAtLocal] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outside = (event: MouseEvent) => {
      // The confirm dialog for "Quitar" lives outside the menu: ignore clicks while it is open.
      if (document.querySelector("[role='alertdialog']")) return;
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const choose = (entry: CalendarMenuEntry) => {
    setPicked(entry);
    setView("actions");
  };
  const openDates = () => {
    if (!picked) return;
    setStartsAtLocal(picked.startsAtLocal);
    setEndsAtLocal(picked.endsAtLocal);
    setRepeatYearly(picked.repeatYearly);
    setView("dates");
  };

  const item =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-[var(--admin-soft)] disabled:opacity-50";
  const dot = (themeId: string) => (
    <span
      className="ui-circle h-2.5 w-2.5 shrink-0"
      style={{ backgroundColor: colorOf(themeId) }}
      aria-hidden="true"
    />
  );

  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "absolute top-[calc(100%+4px)] z-50 w-60 border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-1 pt-6 text-left text-[var(--admin-ink)] shadow-[0_8px_24px_-8px_rgb(0_0_0/0.3)]",
        align === "right" ? "right-0" : "left-0",
      )}
      // Clicks inside the menu never reach the day under it (no new menu, no tooltip).
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Cerrar"
        title="Cerrar"
        onClick={onClose}
        className="absolute right-1 top-1 p-1 text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)]"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {view === "pick" ? (
        <>
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-semibold text-[var(--admin-muted)]">
            ¿Cuál tema?
          </p>
          {entries.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              role="menuitem"
              className={item}
              onClick={() => choose(entry)}
            >
              {dot(entry.themeId)}
              <span className="min-w-0 flex-1 truncate font-medium">{entry.themeName}</span>
              <span className="shrink-0 text-[10px] text-[var(--admin-faint)]">
                {index === 0 ? "se ve" : shortRange(entry)}
              </span>
            </button>
          ))}
        </>
      ) : null}

      {picked && view !== "pick" ? (
        <div className="flex items-center gap-2 border-b border-[var(--admin-line)] px-2 pb-1.5 pt-1">
          {entries.length > 1 || view !== "actions" ? (
            <button
              type="button"
              aria-label="Atrás"
              className="-ml-1 rounded p-0.5 hover:bg-[var(--admin-soft)]"
              onClick={() => setView(view === "actions" ? "pick" : "actions")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {dot(picked.themeId)}
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{picked.themeName}</span>
          <span className="shrink-0 text-[10px] text-[var(--admin-faint)]">
            {shortRange(picked)}
          </span>
        </div>
      ) : null}

      {picked && view === "actions" ? (
        <div className="pt-1">
          <button type="button" role="menuitem" className={item} onClick={openDates}>
            <CalendarClock className="h-3.5 w-3.5" /> Cambiar fechas
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => setView("color")}>
            <Palette className="h-3.5 w-3.5" /> Cambiar color
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className={cn(item, "text-[var(--admin-danger)]")}
            onClick={() =>
              void (async () => {
                const ok = await confirmAdminDestructiveAction(
                  `¿Quitar "${picked.themeName}" del calendario (${shortRange(picked)})? Se quitan todos sus días.`,
                );
                if (ok && (await onRemove(picked))) onClose();
              })()
            }
          >
            <Trash2 className="h-3.5 w-3.5" /> Quitar del calendario
          </button>
        </div>
      ) : null}

      {picked && view === "dates" ? (
        <div className="grid gap-2 p-2">
          <label className="grid gap-1 text-[11px] text-[var(--admin-muted)]">
            Empieza
            <input
              type="datetime-local"
              value={startsAtLocal}
              onChange={(event) => setStartsAtLocal(event.target.value)}
              className="rounded-md border border-[var(--admin-line-strong)] bg-[var(--admin-field)] px-2 py-1 text-xs text-[var(--admin-ink)]"
            />
          </label>
          <label className="grid gap-1 text-[11px] text-[var(--admin-muted)]">
            Termina
            <input
              type="datetime-local"
              value={endsAtLocal}
              onChange={(event) => setEndsAtLocal(event.target.value)}
              className="rounded-md border border-[var(--admin-line-strong)] bg-[var(--admin-field)] px-2 py-1 text-xs text-[var(--admin-ink)]"
            />
          </label>
          <AdminCheckbox
            label="Repetir cada año"
            checked={repeatYearly}
            onCheckedChange={setRepeatYearly}
          />
          <button
            type="button"
            disabled={busy || !startsAtLocal || !endsAtLocal}
            className="rounded-md bg-[var(--admin-ink)] px-2 py-1.5 text-xs font-semibold text-[var(--admin-surface)] disabled:opacity-50"
            onClick={() =>
              void onSaveDates(picked, { startsAtLocal, endsAtLocal, repeatYearly }).then(
                (ok) => ok && onClose(),
              )
            }
          >
            Guardar fechas
          </button>
        </div>
      ) : null}

      {picked && view === "color" ? (
        <div className="grid gap-2 p-2">
          <div className="grid grid-cols-6 gap-1.5">
            {CALENDAR_PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Color ${color}`}
                disabled={busy}
                onClick={() => void onSetColor(picked.themeId, color).then((ok) => ok && onClose())}
                className={cn(
                  "ui-circle h-6 w-6 border-2",
                  colorOf(picked.themeId) === color
                    ? "border-[var(--admin-ink)]"
                    : "border-transparent hover:scale-110",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-[11px] text-[var(--admin-muted)]">
              Otro:
              <input
                type="color"
                defaultValue={colorOf(picked.themeId)}
                onChange={(event) => void onSetColor(picked.themeId, event.target.value)}
                className="h-6 w-8 cursor-pointer rounded border border-[var(--admin-line-strong)] bg-transparent p-0"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              className="rounded-md px-2 py-1 text-[11px] text-[var(--admin-muted)] hover:bg-[var(--admin-soft)]"
              onClick={() => void onSetColor(picked.themeId, null).then((ok) => ok && onClose())}
            >
              Automático
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
