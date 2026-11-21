import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Cake, FolderKanban, LayoutGrid, MessageSquareHeart, Package2, Palette, Percent, Settings2, ShoppingBag, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import storePineapple from "@/assets/PULPINAGENERALPINA.svg";
import { AdminConfirmHost } from "@/components/admin/AdminControls";
import { shouldShowAdminAccessNotice } from "@/lib/admin-access";
import { useAdminThemeSync } from "@/lib/admin-theme";
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
  { section: "temas", label: "Temas", to: "/admin/temas", icon: Palette },
  { section: "configuracion", label: "Configuracion", to: "/admin/configuracion", icon: Settings2 },
];

// Colors live in the .admin-shell palette in styles.css (light, plus a dark override).

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
  useAdminThemeSync();

  return (
    <div className="admin-shell min-h-screen bg-[var(--admin-bg)]" data-admin-section={section}>
      <AdminConfirmHost />
      <div className="grid min-h-screen grid-cols-1 axl:grid-cols-[282px_minmax(0,1fr)] a2xl:grid-cols-[302px_minmax(0,1fr)]">
        {/* The sidebar's column is black behind the nav card, in both modes. On wide
            screens a fixed strip paints it full height (min-h-screen falls
            short under the site's html zoom). */}
        <div className="axl:pr-4">
        <div aria-hidden="true" className="pointer-events-none fixed -bottom-[100vh] -top-[100vh] left-0 hidden w-[282px] bg-black axl:block a2xl:w-[302px]" />
        {/* Its white shadow reaches a screen above and below, so the
            overscroll bounce shows white, not the black column. */}
        <aside className="self-start border-y border-[var(--admin-edge)] bg-[var(--admin-surface)] px-3 py-5 text-[var(--admin-muted)] shadow-[-100vw_0_0_0_var(--admin-surface),100vw_0_0_0_var(--admin-surface)] axl:sticky axl:top-0 axl:flex axl:h-[calc(100vh/var(--page-zoom))] axl:flex-col axl:border-r axl:border-y-0 axl:shadow-[0_-100vh_0_0_var(--admin-surface),0_100vh_0_0_var(--admin-surface)] axl:overflow-y-auto axl:p-4">
          <div className="flex items-center gap-3 px-1">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-soft)] axl:h-16 axl:w-16">
              <img src={storePineapple} alt="" aria-hidden="true" className="admin-logo h-8 w-auto axl:h-12" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-medium axl:text-sm">Admin</div>
              <div className="truncate text-sm font-semibold text-[var(--admin-ink)] axl:text-xl">Pulpiña Store</div>
            </div>
          </div>

          <nav className="mt-3 flex gap-1 overflow-x-auto pb-1 axl:mt-4 axl:flex-1 axl:flex-col axl:overflow-visible axl:pb-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3 py-2 text-xs font-medium transition-colors axl:min-h-10 axl:flex-1 axl:gap-3 axl:px-3 axl:py-0 axl:text-base",
                    item.section === section
                      ? "bg-[var(--admin-invert)] font-semibold text-[var(--admin-on-invert)]"
                      : "hover:bg-[var(--admin-accent-soft)] hover:text-[var(--admin-ink)]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {showAccessNotice ? (
            <div className="mt-5 hidden rounded-xl bg-[var(--admin-soft)] p-3 text-xs leading-5 axl:block">
              Protege esta ruta con Cloudflare Access y login Google.
              <div className="mt-2">
                <Link to="/tienda" className="font-semibold text-[var(--admin-accent-ink)] underline underline-offset-4">
                  Volver a tienda
                </Link>
              </div>
            </div>
          ) : null}
        </aside>
        </div>

        <div className="min-w-0 px-3 py-3 sm:px-4 sm:py-4">
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
    <div className="rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-[var(--admin-faint)]">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
          {help ? <div className="mt-1 text-xs text-[var(--admin-muted)]">{help}</div> : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--admin-soft)] text-[var(--admin-muted)]", iconClassName)}>
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
  editor = false,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  /** Edit forms: the body sits on the selection grey so white fields read clearly. */
  editor?: boolean;
}) {
  const showHeader = Boolean(title || eyebrow || actions);

  return (
    <section className={cn("flex flex-col rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)]", className)}>
      {showHeader ? (
        <div className="flex flex-col gap-2 border-b border-[var(--admin-edge)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4">
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
      <div className={cn("flex-1 p-3 sm:p-4", editor && "bg-[var(--admin-accent-soft)]")}>{children}</div>
    </section>
  );
}

type AdminTagTone = "soft" | "dark" | "warn" | "success" | "danger" | "info" | "plum" | "violet" | "cinnamon" | "cocoa";

// Deep status colors that sit with Moon crimson; each status its own hue.
const TAG_TONES: Record<AdminTagTone, string> = {
  // "dark" = live/active (Activo, Publica, Abierta): solid Moon black.
  dark: "bg-[var(--admin-ink)] text-[var(--admin-on-invert)]",
  success: "bg-[var(--admin-ok-soft)] text-[var(--admin-ok)]",
  warn: "bg-[var(--admin-warn-soft)] text-[var(--admin-warn)]",
  danger: "bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]",
  info: "bg-[var(--admin-info-soft)] text-[var(--admin-info)]",
  soft: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  plum: "bg-[var(--admin-plum-soft)] text-[var(--admin-plum)]",
  violet: "bg-[var(--admin-violet-soft)] text-[var(--admin-violet)]",
  cinnamon: "bg-[var(--admin-cinnamon-soft)] text-[var(--admin-cinnamon)]",
  cocoa: "bg-[var(--admin-cocoa-soft)] text-[var(--admin-cocoa)]",
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
