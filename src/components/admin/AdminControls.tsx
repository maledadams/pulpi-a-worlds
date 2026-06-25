import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminButtonTone = "primary" | "secondary" | "ghost" | "danger" | "active" | "warning" | "custom";

export function getAdminButtonClassName(tone: AdminButtonTone = "secondary", className?: string) {
  return cn(
    "rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] shadow-[0_8px_20px_-16px_rgba(35,23,23,0.35)] transition duration-150 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50",
    tone === "primary" &&
      "border-[#2f7a45] bg-[#2f7a45] text-white hover:bg-[#256139] focus-visible:ring-[#b7e6c4]",
    tone === "active" &&
      "border-[#231717] bg-[#231717] text-white hover:bg-[#3a2924] focus-visible:ring-[#d8c8bc]",
    tone === "secondary" &&
      "border-[#231717] bg-white text-[#231717] hover:bg-[#f7f2ec] focus-visible:ring-[#eadccf]",
    tone === "ghost" &&
      "border-[#231717]/15 bg-[#f2ede7] text-[#5f4941] hover:border-[#231717]/30 hover:bg-[#ece4db] focus-visible:ring-[#e8ddd3]",
    tone === "warning" &&
      "border-[#b46b12] bg-[#f3b14a] text-[#4f2e05] hover:bg-[#e2a23f] focus-visible:ring-[#f8dca8]",
    tone === "danger" &&
      "border-[#9a3423] bg-[#9a3423] text-white hover:bg-[#7d291b] focus-visible:ring-[#efc0b8]",
    tone === "custom" && "border-transparent bg-transparent text-current shadow-none",
    className,
  );
}

export function getAdminVibeButtonClassName(
  vibe: "moon" | "sunshine" | "men",
  active: boolean,
  className?: string,
) {
  return cn(
    "rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition duration-150 focus-visible:outline-none focus-visible:ring-4",
    vibe === "moon" &&
      (active
        ? "border-[#7a0e1c] bg-[linear-gradient(135deg,#f6ebe8_0%,#c88d9a_38%,#7a0e1c_100%)] text-white shadow-[0_10px_24px_-18px_rgba(122,14,28,0.7)] focus-visible:ring-[#e7c7cf]"
        : "border-[#7a0e1c]/20 bg-[linear-gradient(135deg,#faf2f0_0%,#efdee1_55%,#dcc3ca_100%)] text-[#711120] hover:border-[#7a0e1c]/35 focus-visible:ring-[#f1dde1]"),
    vibe === "sunshine" &&
      (active
        ? "border-[#ff5fa2] bg-[linear-gradient(135deg,#ffd8ea_0%,#ff8dbf_42%,#ffe57d_100%)] text-[#5b1737] shadow-[0_10px_24px_-18px_rgba(255,95,162,0.75)] focus-visible:ring-[#ffe2ef]"
        : "border-[#ff5fa2]/20 bg-[linear-gradient(135deg,#fff6fa_0%,#ffe2ee_52%,#fff2b8_100%)] text-[#ac3e71] hover:border-[#ff5fa2]/35 focus-visible:ring-[#ffe8f2]"),
    vibe === "men" &&
      (active
        ? "border-[#4d4742] bg-[linear-gradient(135deg,#cfc9c4_0%,#8d8780_42%,#4d4742_100%)] text-white shadow-[0_10px_24px_-18px_rgba(77,71,66,0.7)] focus-visible:ring-[#ddd7d2]"
        : "border-[#7b746d]/20 bg-[linear-gradient(135deg,#f4f1ef_0%,#ddd7d3_55%,#c5beb9_100%)] text-[#554d49] hover:border-[#7b746d]/35 focus-visible:ring-[#ece7e3]"),
    className,
  );
}

export function confirmAdminDestructiveAction(message: string) {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
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
      <span className="font-bold">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[#6b5a55]">{hint}</span> : null}
    </label>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#231717]/25 bg-[#f7f2ec] px-4 py-2.5 text-sm outline-none transition placeholder:text-[#8d7970] focus:border-[#2f7a45] focus:bg-white focus-visible:ring-4 focus-visible:ring-[#d8efdf]",
        props.className,
      )}
    />
  );
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#231717]/25 bg-[#f7f2ec] px-4 py-3 text-sm outline-none transition placeholder:text-[#8d7970] focus:border-[#2f7a45] focus:bg-white focus-visible:ring-4 focus-visible:ring-[#d8efdf]",
        props.className,
      )}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full rounded-lg border border-[#231717]/25 bg-[#f7f2ec] px-4 py-2.5 text-sm outline-none transition focus:border-[#2f7a45] focus:bg-white focus-visible:ring-4 focus-visible:ring-[#d8efdf]",
        props.className,
      )}
    />
  );
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
    <label className="flex items-start gap-3 rounded-xl border border-[#231717]/10 bg-[#faf6f0] px-3 py-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[#231717] accent-[#231717]"
      />
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-5 text-[#6b5a55]">{hint}</span> : null}
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
    <div className="rounded-2xl border border-dashed border-[#231717]/25 bg-[#faf6f0] px-5 py-10 text-center">
      <div className="text-base font-black">{title}</div>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#6b5a55]">{body}</p>
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
    <div className="flex items-center justify-between gap-3 border-t border-[#231717]/10 pt-3">
      <div className="text-xs font-semibold text-[#6b5a55]">
        Pagina {page + 1} de {pages}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Pagina anterior"
          onClick={() => onChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="text-[#5f4941] transition hover:text-[#231717] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Pagina siguiente"
          onClick={() => onChange(Math.min(pages - 1, page + 1))}
          disabled={page >= pages - 1}
          className="text-[#5f4941] transition hover:text-[#231717] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export function AdminToast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom-3 fade-in duration-200">
      <div className="rounded-xl border border-[#231717] bg-white px-4 py-3 text-sm font-semibold text-[#231717] shadow-[0_18px_40px_-18px_rgba(35,23,23,0.45)]">
        {message}
      </div>
    </div>
  );
}

