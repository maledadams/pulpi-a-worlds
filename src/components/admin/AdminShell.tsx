import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, Cake, FolderKanban, LayoutGrid, Package2, Percent, Settings2, ShoppingBag, Store, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import { shouldShowAdminAccessNotice } from "@/lib/admin-access";
import type { AdminSection } from "@/lib/admin-types";
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
  { section: "descuentos", label: "Promociones", to: "/admin/descuentos", icon: Percent },
  { section: "cumpleanos", label: "Cumpleaños", to: "/admin/cumpleanos", icon: Cake },
  { section: "configuracion", label: "Configuracion", to: "/admin/configuracion", icon: Settings2 },
];

const SECTION_BACKGROUNDS: Record<AdminSection, string> = {
  resumen: "linear-gradient(160deg, rgba(255, 204, 222, 0.35) 0%, rgba(255, 236, 162, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  productos: "linear-gradient(160deg, rgba(206, 244, 143, 0.35) 0%, rgba(255, 210, 178, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  stock: "linear-gradient(160deg, rgba(199, 239, 224, 0.38) 0%, rgba(213, 240, 158, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  categorias: "linear-gradient(160deg, rgba(255, 197, 219, 0.35) 0%, rgba(255, 223, 156, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  colecciones: "linear-gradient(160deg, rgba(255, 210, 228, 0.35) 0%, rgba(255, 191, 214, 0.26) 45%, rgba(253, 249, 244, 1) 100%)",
  pedidos: "linear-gradient(160deg, rgba(255, 221, 176, 0.38) 0%, rgba(255, 201, 146, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  descuentos: "linear-gradient(160deg, rgba(214, 245, 164, 0.38) 0%, rgba(191, 239, 119, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  cumpleanos: "linear-gradient(160deg, rgba(255, 202, 212, 0.38) 0%, rgba(255, 231, 158, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
  configuracion: "linear-gradient(160deg, rgba(214, 245, 164, 0.32) 0%, rgba(255, 205, 221, 0.28) 45%, rgba(253, 249, 244, 1) 100%)",
};

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
    <div className="admin-shell min-h-screen text-[#231717]" style={{ background: SECTION_BACKGROUNDS[section] }}>
      <div className="mx-auto grid max-w-[1880px] grid-cols-1 gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 xl:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="self-start rounded-[20px] border border-[#231717]/15 bg-white/90 p-3 shadow-[0_12px_28px_-24px_rgba(35,23,23,0.35)] xl:p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] bg-[#231717] text-white xl:h-10 xl:w-10">
              <Store className="h-4 w-4 xl:h-5 xl:w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#7c665f] xl:text-[11px]">
                Admin
              </div>
              <div className="truncate text-sm font-bold">Pulpiña Store</div>
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
                    "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[14px] px-3 py-2 text-xs font-semibold transition-colors xl:shrink xl:gap-3 xl:px-3 xl:py-2.5 xl:text-sm",
                    item.section === section
                      ? "bg-[#231717] text-white"
                      : "text-[#3a2924] hover:bg-[#f3eadf]",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {showAccessNotice ? (
            <div className="mt-5 hidden rounded-[16px] border border-[#231717]/10 bg-[#f7f2ec] p-3 text-xs leading-5 text-[#624d47] xl:block">
              Protege esta ruta con Cloudflare Access y login Google.
              <div className="mt-2">
                <Link to="/tienda" className="font-black uppercase tracking-[0.16em] text-[#231717] underline underline-offset-4">
                  Volver a tienda
                </Link>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0">
          <header className="rounded-[20px] border border-[#231717]/15 bg-white px-4 py-3 shadow-[0_12px_28px_-24px_rgba(35,23,23,0.35)] sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-black sm:text-2xl md:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-1 max-w-3xl text-sm text-[#6b5a55]">{subtitle}</p> : null}
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
    <div className="rounded-[18px] border border-[#231717]/15 bg-white p-4 shadow-[0_10px_22px_-20px_rgba(35,23,23,0.3)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c665f]">{label}</div>
          <div className="mt-2 text-2xl font-black">{value}</div>
          {help ? <div className="mt-1 text-xs text-[#6b5a55]">{help}</div> : null}
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f5eadf] text-[#231717]", iconClassName)}>
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
    <section className={cn("flex flex-col rounded-[18px] border border-[#231717]/15 bg-white shadow-[0_10px_22px_-20px_rgba(35,23,23,0.3)]", className)}>
      {showHeader ? (
        <div className="flex flex-col gap-2 border-b border-[#231717]/10 px-3 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4">
          {title || eyebrow ? (
            <div>
              {eyebrow ? (
                <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c665f]">{eyebrow}</div>
              ) : null}
              {title ? <h2 className={cn("mt-1 text-lg font-black", titleClassName)}>{title}</h2> : null}
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

export function AdminTag({
  children,
  tone = "soft",
}: {
  children: ReactNode;
  tone?: "soft" | "dark" | "warn" | "success" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[10px] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
        tone === "dark" && "bg-[#231717] text-white",
        tone === "warn" && "bg-[#ffd8c4] text-[#7e2f17]",
        tone === "success" && "bg-[#d8f0df] text-[#1f5b33]",
        tone === "danger" && "bg-[#f4d5cf] text-[#7d291b]",
        tone === "info" && "bg-[#dce9f8] text-[#214c77]",
        tone === "soft" && "bg-[#f3eadf] text-[#5f4941]",
      )}
    >
      {children}
    </span>
  );
}
