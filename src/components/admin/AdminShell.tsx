import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Cake, FolderKanban, LayoutGrid, MessageSquareHeart, Package2, Percent, Settings2, ShoppingBag, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import storePineapple from "@/assets/PULPINAGENERALPINA.svg";
import { AdminConfirmHost } from "@/components/admin/AdminControls";
import { shouldShowAdminAccessNotice } from "@/lib/admin-access";
import type { AdminInquiryStatus, AdminSection } from "@/lib/admin-types";
import { cn } from "@/lib/utils";

const NAV_ITEMS: Array<{
  section: AdminSection;
  label: string;
  to: string;
  icon: typeof LayoutGrid;
}> = [
  { section: "resumen", label: "Resumen", to: "/admin", icon: LayoutGrid },
  { section: "productos", label: "Productos", to: "/admin/productos", icon: Package2 },
  { section: "stock", label: "Stock", to: "/admin/stock", icon: Warehouse },
  { section: "categorias", label: "Categorias", to: "/admin/categorias", icon: Boxes },
  { section: "colecciones", label: "Colecciones", to: "/admin/colecciones", icon: FolderKanban },
  { section: "pedidos", label: "Pedidos", to: "/admin/pedidos", icon: ShoppingBag },
  { section: "encuestas", label: "Encuestas", to: "/admin/encuestas", icon: MessageSquareHeart },
  { section: "descuentos", label: "Promociones", to: "/admin/descuentos", icon: Percent },
  { section: "cumpleanos", label: "Cumpleaños", to: "/admin/cumpleanos", icon: Cake },
  { section: "configuracion", label: "Configuracion", to: "/admin/configuracion", icon: Settings2 },
];

// Colors live in the .admin-shell palette (Moon, light mode) in styles.css.

export function AdminShell({
  section,
  title,
  subtitle,
  children,
  actions,
}: {
  section: AdminSection;
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const showAccessNotice = shouldShowAdminAccessNotice();

  return (
    <div className="admin-shell min-h-screen bg-[var(--admin-bg)]" data-admin-section={section}>
      <AdminConfirmHost />
      <div className="mx-auto grid max-w-[1880px] grid-cols-1 gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 xl:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-[var(--admin-line)] bg-white p-3 text-[var(--admin-muted)] xl:p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-soft)]">
              <img src={storePineapple} alt="" aria-hidden="true" className="h-8 w-auto" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium">Admin</div>
              <div className="truncate text-sm font-semibold text-[var(--admin-ink)]">Pulpiña Store</div>
            </div>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 xl:mt-4 xl:grid xl:overflow-visible xl:pb-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-xs font-medium transition-colors xl:shrink xl:gap-3 xl:px-3 xl:py-2.5 xl:text-sm",
                    item.section === section
                      ? "bg-[var(--admin-accent-soft)] font-semibold text-[var(--admin-accent-ink)]"
                      : "hover:bg-[var(--admin-soft)] hover:text-[var(--admin-ink)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {showAccessNotice ? (
            <div className="mt-5 hidden rounded-xl bg-[var(--admin-soft)] p-3 text-xs leading-5 xl:block">
              Protege esta ruta con Cloudflare Access y login Google.
              <div className="mt-2">
                <Link to="/tienda" className="font-semibold text-[var(--admin-accent-ink)] underline underline-offset-4">
                  Volver a tienda
                </Link>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className="px-1 pt-1 sm:pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl">{title}</h1>
                {subtitle ? <p className="mt-1 max-w-3xl text-sm text-[var(--admin-muted)]">{subtitle}</p> : null}
              </div>
              {actions ? (
                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 sm:shrink-0 sm:justify-end sm:pr-1">
                  {actions}
                </div>
              ) : null}
            </div>
          </header>

          <main className="mt-4">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  help,
  icon: Icon,
  iconClassName,
}: {
  label: string;
  value: string;
  help?: string;
  icon: typeof BarChart3;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-[var(--admin-faint)]">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
          {help ? <div className="mt-1 text-xs text-[var(--admin-muted)]">{help}</div> : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] text-[var(--admin-accent-ink)]", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminPanel({
  title,
  eyebrow,
  children,
  actions,
  className,
  titleClassName,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  const showHeader = Boolean(title || eyebrow || actions);

  return (
    <section className={cn("flex flex-col rounded-2xl border border-[var(--admin-line)] bg-[var(--admin-surface)]", className)}>
      {showHeader ? (
        <div className="flex flex-col gap-2 border-b border-[var(--admin-line)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
          {title || eyebrow ? (
            <div>
              {eyebrow ? (
                <div className="text-xs font-medium text-[var(--admin-faint)]">{eyebrow}</div>
              ) : null}
              {title ? <h2 className={cn("text-base", eyebrow && "mt-0.5", titleClassName)}>{title}</h2> : null}
            </div>
          ) : (
            <div />
          )}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="flex-1 p-3 sm:p-4">{children}</div>
    </section>
  );
}

type AdminTagTone = "soft" | "dark" | "warn" | "success" | "danger" | "info" | "plum" | "violet" | "cinnamon" | "cocoa";

// Deep status colors that sit with Moon crimson; each status its own hue.
const TAG_TONES: Record<AdminTagTone, string> = {
  // "dark" = live/active (Activo, Publica, Abierta): solid Moon black.
  dark: "bg-[var(--admin-ink)] text-white",
  success: "bg-[var(--admin-ok-soft)] text-[var(--admin-ok)]",
  warn: "bg-[var(--admin-warn-soft)] text-[var(--admin-warn)]",
  danger: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
  info: "bg-[#e2edf8] text-[#334f6d]",
  soft: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  plum: "bg-[#fce3ee] text-[#742651]",
  violet: "bg-[#eae8ff] text-[#4d4084]",
  cinnamon: "bg-[#ffe1d1] text-[#903a03]",
  cocoa: "bg-[#eee1df] text-[#5b403b]",
};

// One color per pedido status, everywhere a status shows.
const INQUIRY_STATUS_TONE: Record<AdminInquiryStatus, AdminTagTone> = {
  pending_contact: "plum",
  new: "warn",
  follow_up: "violet",
  quoted: "cinnamon",
  closed: "success",
  cancelled: "cocoa",
};

export function inquiryStatusTone(status: AdminInquiryStatus): AdminTagTone {
  return INQUIRY_STATUS_TONE[status] ?? "info";
}

export function AdminTag({ children, tone = "soft" }: { children: ReactNode; tone?: AdminTagTone }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", TAG_TONES[tone])}>
      {children}
    </span>
  );
}
