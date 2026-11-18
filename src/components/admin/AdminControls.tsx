import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2 } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminAutosaveStatus } from "@/hooks/use-admin-autosave";

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadAdminCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","));
  // Leading BOM so accented characters (á, ñ, etc.) render correctly when opened in Excel.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type AdminButtonTone = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid" | "active" | "warning" | "add" | "addAlt" | "save" | "create" | "custom";

// No outlines, no shadows, normal capitalization. One filled accent button
// per area ("primary"); everything else is a soft fill or plain text.
export function getAdminButtonClassName(tone: AdminButtonTone = "secondary", className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-select)]/40 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
    tone === "primary" && "bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)]",
    tone === "active" && "bg-[var(--admin-select)] text-[var(--admin-on-invert)] hover:bg-[var(--admin-select-hover)]",
    tone === "secondary" && "bg-[var(--admin-soft)] text-[var(--admin-ink)] hover:bg-[var(--admin-soft-hover)]",
    tone === "ghost" && "bg-transparent text-[var(--admin-muted)] hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)]",
    tone === "warning" && "bg-[var(--admin-warn-soft)] text-[var(--admin-warn)] hover:brightness-95",
    tone === "danger" && "bg-transparent text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)]",
    tone === "dangerSolid" && "bg-[var(--admin-danger-solid)] text-white hover:brightness-90",
    // Solid add buttons: green (Agregar FAQ) and blue (Agregar bloque legal).
    tone === "add" && "bg-[var(--admin-ok-solid)] text-white hover:bg-[var(--admin-ok-solid-hover)]",
    tone === "addAlt" && "bg-[#334f6d] text-white hover:bg-[#253b53]",
    // Guardar / Abrir: solid green with white text, darker on hover.
    tone === "save" && "bg-[var(--admin-ok-solid)] text-white hover:bg-[var(--admin-ok-solid-hover)]",
    // Nuevo / Nueva …: the yellow status-chip colors, darker on hover.
    tone === "create" && "bg-[var(--admin-warn-soft)] text-[var(--admin-warn)] hover:bg-[var(--admin-warn-soft-hover)]",
    tone === "custom" && "bg-transparent text-current",
    className,
  );
}

type AdminVibe = "moon" | "sunshine" | "men";

// Sub-store buttons (filters, "Subtiendas activas"): off is dimmer/darker,
// hover sits between, on is the store's full color. No ring.
export function getAdminVibeButtonClassName(vibe: AdminVibe, active: boolean, className?: string) {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-select)]/40",
    vibe === "moon" && (active ? "bg-[#4a0912] text-white" : "bg-[#b86b76] text-[#fbeef0] hover:bg-[#93303d] hover:text-white"),
    vibe === "sunshine" && (active ? "bg-[#e0508f] text-white" : "bg-[var(--admin-sun-soft)] text-[var(--admin-sun)] hover:bg-[var(--admin-sun-soft-hover)]"),
    vibe === "men" && (active ? "bg-[#3a3532] text-white" : "bg-[#b0a8a2] text-[#f4f1ee] hover:bg-[#8a827c] hover:text-white"),
    className,
  );
}

// Sub-store labels in tables (not clickable).
export function getAdminVibeTagClassName(vibe: AdminVibe, className?: string) {
  return cn(
    "pointer-events-none inline-flex cursor-default items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    vibe === "moon" && "bg-[#7a0e1c] text-[#f6e7ea]",
    vibe === "sunshine" && "bg-[var(--admin-sun-soft)] text-[var(--admin-sun)]",
    vibe === "men" && "bg-[#6e6762] text-white",
    className,
  );
}

// Opens the admin's own confirmation dialog and resolves to the answer.
// window.confirm() is not used directly: embedded browsers (e.g. in-app
// webviews) block it and silently return false, which made "Cerrar",
// "Eliminar", etc. do nothing. Falls back to window.confirm only if no
// AdminConfirmHost is mounted (AdminShell mounts one on every admin page).
let showAdminConfirm: ((message: string) => Promise<boolean>) | null = null;

export function confirmAdminDestructiveAction(message: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (showAdminConfirm) return showAdminConfirm(message);
  return Promise.resolve(window.confirm(message));
}

export function AdminConfirmHost() {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  const settle = (ok: boolean) => {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setMessage(null);
  };

  useEffect(() => {
    showAdminConfirm = (next) =>
      new Promise<boolean>((resolve) => {
        // A new question cancels one that was still open.
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setMessage(next);
      });
    return () => {
      showAdminConfirm = null;
      resolveRef.current?.(false);
      resolveRef.current = null;
    };
  }, []);

  return (
    <AlertDialog.Root open={message !== null} onOpenChange={(open) => (open ? undefined : settle(false))}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-[#130808]/40" />
        {/* admin-shell: the dialog renders in a portal outside the admin layout,
            so it needs the class for the admin's fonts and palette. */}
        <AlertDialog.Content className="admin-shell fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-5 shadow-[0_24px_48px_-28px_rgb(19_8_8/0.45)] focus:outline-none">
          <AlertDialog.Title className="text-base font-semibold">¿Seguro?</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm leading-6 text-[var(--admin-muted)]">{message}</AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className={getAdminButtonClassName("secondary")} onClick={() => settle(false)}>
              Cancelar
            </AlertDialog.Cancel>
            <AlertDialog.Action className={getAdminButtonClassName("dangerSolid")} onClick={() => settle(true)}>
              Sí, continuar
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function AdminButton({
  children,
  tone = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: AdminButtonTone;
}) {
  return (
    <button
      {...props}
      className={getAdminButtonClassName(tone, className)}
    >
      {children}
    </button>
  );
}

export function AdminSectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("text-xs font-semibold text-[var(--admin-faint)]", className)}>
      {children}
    </div>
  );
}

export function getAdminChipClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150",
    active
      ? "bg-[var(--admin-select)] text-[var(--admin-on-invert)]"
      : "bg-[var(--admin-soft)] text-[var(--admin-muted)] hover:bg-[var(--admin-soft-hover)] hover:text-[var(--admin-ink)]",
    className,
  );
}

export function AdminTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: T; label: string }>;
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={getAdminChipClassName(active === tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[var(--admin-muted)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--admin-faint)]">{hint}</span> : null}
    </label>
  );
}

const ADMIN_FIELD_CLASS =
  "w-full rounded-[10px] border border-[var(--admin-line-strong)] bg-[var(--admin-field)] px-3.5 text-sm text-[var(--admin-ink)] outline-none transition placeholder:text-[var(--admin-faint)] focus:border-[var(--admin-select)] focus:bg-[var(--admin-surface)] focus-visible:ring-2 focus-visible:ring-[var(--admin-select)]/25 disabled:cursor-not-allowed disabled:opacity-60";

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(ADMIN_FIELD_CLASS, "py-2.5", props.className)} />;
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(ADMIN_FIELD_CLASS, "py-3", props.className)} />;
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(ADMIN_FIELD_CLASS, "py-2.5", props.className)} />;
}

export function AdminCheckbox({
  label,
  checked,
  onCheckedChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl bg-[var(--admin-field)] px-3 py-3 text-sm ring-1 ring-[var(--admin-line)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-[var(--admin-select)]"
      />
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-[var(--admin-faint)]">{hint}</span> : null}
      </span>
    </label>
  );
}

export function AdminEmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--admin-line-strong)] bg-[var(--admin-field)] px-5 py-10 text-center">
      <div className="text-base font-semibold">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--admin-muted)]">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminPagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-[var(--admin-line)] pt-3">
      <div className="text-xs font-medium text-[var(--admin-faint)]">
        Página {page + 1} de {pages}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="rounded-lg p-1.5 text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Página siguiente"
          onClick={() => onChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
          className="rounded-lg p-1.5 text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export type AdminToastTone = "success" | "error" | "info";

export function AdminToast({ message, tone = "info" }: { message: string; tone?: AdminToastTone }) {
  if (!message) return null;

  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? AlertCircle : Info;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-3 fade-in duration-200">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-[0_18px_40px_-22px_rgb(19_8_8/0.5)]",
          tone === "success" && "bg-[var(--admin-ok-soft)] text-[var(--admin-ok)]",
          tone === "error" && "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
          tone === "info" && "bg-[var(--admin-ink)] text-[var(--admin-on-invert)]",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {message}
      </div>
    </div>
  );
}

export function AdminAutosaveIndicator({
  status,
  errorMessage,
}: {
  status: AdminAutosaveStatus;
  errorMessage?: string;
}) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-soft)] px-2.5 py-1 text-xs font-medium text-[var(--admin-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Guardando...
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-danger-soft)] px-2.5 py-1 text-xs font-medium text-[var(--admin-danger)]"
        title={errorMessage}
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {errorMessage || "No se pudo guardar"}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-ok-soft)] px-2.5 py-1 text-xs font-medium text-[var(--admin-ok)]">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Guardado
    </span>
  );
}

