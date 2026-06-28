import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, FolderKanban, LayoutGrid, Package2, Percent, Settings2, ShoppingBag, Store, Warehouse } from "lucide-react";
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
  { section: "configuracion", label: "Configuracion", to: "/admin/configuracion", icon: Settings2 },
];

const SECTION_BACKGROUNDS: Record<AdminSection, string> = {
  resumen:
    "linear-gradient(135deg, rgba(255, 204, 222, 0.94) 0%, rgba(255, 236, 162, 0.9) 52%, rgba(255, 246, 239, 0.98) 100%)",
  productos:
    "linear-gradient(135deg, rgba(206, 244, 143, 0.94) 0%, rgba(255, 210, 178, 0.9) 55%, rgba(255, 246, 239, 0.98) 100%)",
  stock:
    "linear-gradient(135deg, rgba(199, 239, 224, 0.96) 0%, rgba(213, 240, 158, 0.9) 55%, rgba(255, 246, 239, 0.98) 100%)",
  categorias:
    "linear-gradient(135deg, rgba(255, 197, 219, 0.94) 0%, rgba(255, 223, 156, 0.9) 55%, rgba(255, 245, 236, 0.98) 100%)",
  colecciones:
    "linear-gradient(135deg, rgba(255, 210, 228, 0.96) 0%, rgba(255, 191, 214, 0.9) 55%, rgba(255, 245, 239, 0.98) 100%)",
  pedidos:
    "linear-gradient(135deg, rgba(255, 221, 176, 0.96) 0%, rgba(255, 201, 146, 0.92) 55%, rgba(255, 245, 236, 0.98) 100%)",
  descuentos:
    "linear-gradient(135deg, rgba(214, 245, 164, 0.96) 0%, rgba(191, 239, 119, 0.9) 55%, rgba(250, 255, 236, 0.98) 100%)",
  configuracion:
    "linear-gradient(135deg, rgba(214, 245, 164, 0.9) 0%, rgba(255, 205, 221, 0.88) 55%, rgba(255, 246, 239, 0.98) 100%)",
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
      <div className="mx-auto grid max-w-[1880px] gap-5 px-4 py-4 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start rounded-[20px] border-2 border-[#231717] bg-white/85 p-4 shadow-[0_18px_40px_-32px_rgba(35,23,23,0.45)] xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-3 rounded-[16px] border border-[#231717]/10 bg-[#f7f2ec] px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#231717] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7c665f]">
                Admin
              </div>
              <div className="truncate text-sm font-bold">Pulpiña Store</div>
            </div>
          </div>

          <nav className="mt-4 grid gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-colors",
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
            <div className="mt-5 rounded-[16px] border border-[#231717]/10 bg-[#f7f2ec] p-3 text-xs leading-5 text-[#624d47]">
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
          <header className="rounded-[20px] border-2 border-[#231717] bg-white px-5 py-4 shadow-[0_18px_40px_-32px_rgba(35,23,23,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black md:text-3xl">{title}</h1>
                {subtitle ? <p className="mt-1 max-w-3xl text-sm text-[#6b5a55]">{subtitle}</p> : null}
              </div>
              {actions ? (
                <div className="flex shrink-0 items-center justify-end gap-2 overflow-x-auto whitespace-nowrap pb-1 pr-1">
                  {actions}
                </div>
              ) : null}
            </div>
          </header>

          <main className="mt-5">{children}</main>
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
    <div className="rounded-[18px] border-2 border-[#231717] bg-white p-4 shadow-[0_16px_32px_-28px_rgba(35,23,23,0.45)]">
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
    <section className={cn("flex flex-col rounded-[18px] border-2 border-[#231717] bg-white shadow-[0_16px_32px_-28px_rgba(35,23,23,0.42)]", className)}>
      {showHeader ? (
        <div className="flex items-start justify-between gap-3 border-b border-[#231717]/10 px-4 py-3">
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
          {actions}
        </div>
      ) : null}
      <div className="flex-1 p-4">{children}</div>
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
