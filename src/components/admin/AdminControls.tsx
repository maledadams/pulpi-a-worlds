import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminButton({
  children,
  tone = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      className={cn(
        "rounded-2xl border-2 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition disabled:cursor-not-allowed disabled:opacity-50",
        tone === "primary" && "border-[#231717] bg-[#231717] text-white hover:bg-[#3a2924]",
        tone === "secondary" && "border-[#231717] bg-white text-[#231717] hover:bg-[#f7f2ec]",
        tone === "ghost" && "border-[#231717]/20 bg-[#f7f2ec] text-[#5f4941] hover:border-[#231717]/40",
        tone === "danger" && "border-[#8b2f1e] bg-[#8b2f1e] text-white hover:bg-[#6f2618]",
        className,
      )}
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
        "w-full rounded-xl border-2 border-[#231717] bg-[#f7f2ec] px-4 py-2.5 text-sm outline-none transition placeholder:text-[#8d7970] focus:bg-white",
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
        "w-full rounded-xl border-2 border-[#231717] bg-[#f7f2ec] px-4 py-3 text-sm outline-none transition placeholder:text-[#8d7970] focus:bg-white",
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
        "w-full rounded-xl border-2 border-[#231717] bg-[#f7f2ec] px-4 py-2.5 text-sm outline-none transition focus:bg-white",
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
    <label className="flex items-start gap-3 rounded-2xl border border-[#231717]/10 bg-[#faf6f0] px-3 py-3 text-sm">
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
    <div className="rounded-3xl border border-dashed border-[#231717]/25 bg-[#faf6f0] px-5 py-10 text-center">
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
        <AdminButton tone="ghost" onClick={() => onChange(Math.max(0, page - 1))} disabled={page === 0}>
          Anterior
        </AdminButton>
        <AdminButton tone="ghost" onClick={() => onChange(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1}>
          Siguiente
        </AdminButton>
      </div>
    </div>
  );
}

