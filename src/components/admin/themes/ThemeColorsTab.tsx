import { RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import { isThemeColor, type ThemeDocument } from "@/lib/theme-schema";
import {
  getThemeToken,
  resolveTokenValues,
  THEME_TOKENS,
  type ThemeToken,
} from "@/lib/theme-tokens";
import { cn } from "@/lib/utils";

/**
 * Any CSS color (oklch, rgba…) as #rrggbb for the native picker. It paints one pixel and
 * reads it back: the canvas parser keeps oklch as oklch, which used to show white as black.
 * Transparent colors are shown over white, the page they sit on.
 */
function toHex(color: string) {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
  if (typeof document === "undefined") return "#000000";
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return "#000000";
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1, 1);
  context.fillStyle = color === "currentColor" ? "#121212" : color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((part) => part!.toString(16).padStart(2, "0")).join("")}`;
}

function TokenRow({
  token,
  value,
  effective,
  onSet,
  onReset,
}: {
  token: ThemeToken;
  value: string | undefined;
  effective: string;
  onSet: (value: string) => void;
  onReset: () => void;
}) {
  const [text, setText] = useState(value ?? "");
  // Follow the value when it changes from elsewhere (restoring a version).
  useEffect(() => setText(value ?? ""), [value]);
  const invalid = text.trim() !== "" && !isThemeColor(text.trim());
  const leader = token.follows ? getThemeToken(token.follows) : undefined;
  const picker = useRef<HTMLInputElement>(null);
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-2">
      <input
        ref={picker}
        type="color"
        aria-label={token.label}
        value={toHex(effective)}
        onChange={(event) => {
          setText(event.target.value);
          onSet(event.target.value);
        }}
        className="h-9 w-9 cursor-pointer rounded-lg border border-[var(--admin-line-strong)] bg-transparent p-0.5"
      />
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{token.label}</div>
          {token.hint ? (
            <div className="text-xs text-[var(--admin-muted)]">{token.hint}</div>
          ) : null}
          <div className="truncate text-xs text-[var(--admin-faint)]">
            {value ? "Cambiado por el tema" : leader ? `Sigue a: ${leader.label}` : "Igual que hoy"}
          </div>
        </div>
        <input
          aria-label={`${token.label}: valor`}
          value={text}
          placeholder="#rrggbb"
          title="Clic para abrir la rueda de colores, o escribe el código"
          // A click opens the color picker too (Lucia, 2026-11-19); typing still works.
          onClick={() => {
            try {
              picker.current?.showPicker();
            } catch {
              picker.current?.click();
            }
          }}
          onChange={(event) => {
            setText(event.target.value);
            if (isThemeColor(event.target.value.trim())) onSet(event.target.value.trim());
          }}
          className={cn(
            "w-28 rounded-lg border bg-[var(--admin-field)] px-2 py-1.5 font-mono text-xs text-[var(--admin-ink)] outline-none",
            invalid
              ? "border-[var(--admin-danger)]"
              : "border-[var(--admin-line-strong)] focus:border-[var(--admin-select)]",
          )}
        />
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            setText("");
            onReset();
          }}
          className="rounded-lg p-1.5 text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] disabled:opacity-30"
          aria-label={`Volver ${token.label} a como es hoy`}
          title="Volver a como es hoy"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ThemeColorsTab({ doc, update }: { doc: ThemeDocument; update: DocUpdate }) {
  const resolved = useMemo(() => resolveTokenValues(doc.colors), [doc.colors]);
  const groups = useMemo(() => {
    const map = new Map<string, ThemeToken[]>();
    for (const token of THEME_TOKENS.filter((entry) => !entry.hidden))
      map.set(token.group, [...(map.get(token.group) ?? []), token]);
    return [...map.entries()];
  }, []);

  const set = (id: string, value: string) =>
    update((current) => ({ ...current, colors: { ...current.colors, [id]: value } }));
  const reset = (id: string) =>
    update((current) => {
      const colors = { ...current.colors };
      delete colors[id];
      return { ...current, colors };
    });

  return (
    <>
      {groups.map(([group, tokens]) => (
        <AdminPanel key={group} title={group}>
          <div className="divide-y divide-[var(--admin-line)]">
            {tokens.map((token) => (
              <TokenRow
                key={token.id}
                token={token}
                value={doc.colors[token.id]}
                effective={resolved[token.id] ?? token.default}
                onSet={(value) => set(token.id, value)}
                onReset={() => reset(token.id)}
              />
            ))}
          </div>
        </AdminPanel>
      ))}
    </>
  );
}
