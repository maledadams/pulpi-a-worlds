import { Link } from "@tanstack/react-router";
import { BarChart3, Boxes, FolderKanban, Image, LayoutGrid, Package2, Percent, Settings2, ShoppingBag, Store } from "lucide-react";
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
  { section: "categorias", label: "Categorias", to: "/admin/categorias", icon: Boxes },
  { section: "colecciones", label: "Colecciones", to: "/admin/colecciones", icon: FolderKanban },
  { section: "pedidos", label: "Pedidos", to: "/admin/pedidos", icon: ShoppingBag },
  { section: "descuentos", label: "Descuentos", to: "/admin/descuentos", icon: Percent },
  { section: "media", label: "Media", to: "/admin/media", icon: Image },
  { section: "configuracion", label: "Configuracion", to: "/admin/configuracion", icon: Settings2 },
];

export function AdminShell({
  section,
  title,
  subtitle,
  children,
  actions,
}: {
  section: AdminSection;
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const showAccessNotice = shouldShowAdminAccessNotice();

  return (
    <div className="min-h-screen bg-[#f6efe6] text-[#231717]">
      <div className="mx-auto grid max-w-[1540px] gap-5 px-4 py-4 xl:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border-2 border-[#231717] bg-white/85 p-4 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:overflow-hidden">
          <div className="flex items-center gap-3 rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#231717] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7c665f]">
                Admin
              </div>
              <div className="truncate text-sm font-bold">Pulpina Store</div>
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
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors",
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
            <div className="mt-5 rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] p-3 text-xs leading-5 text-[#624d47]">
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
          <header className="rounded-[28px] border-2 border-[#231717] bg-white px-5 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#7c665f]">
                  Panel interno
                </div>
                <h1 className="mt-1 text-2xl font-black md:text-3xl">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm text-[#6b5a55]">{subtitle}</p>
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
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
}: {
  label: string;
  value: string;
  help: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-[26px] border-2 border-[#231717] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#7c665f]">{label}</div>
          <div className="mt-2 text-2xl font-black">{value}</div>
          <div className="mt-1 text-xs text-[#6b5a55]">{help}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f5eadf] text-[#231717]">
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
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[26px] border-2 border-[#231717] bg-white", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-[#231717]/10 px-4 py-3">
        <div>
          {eyebrow ? (
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#7c665f]">{eyebrow}</div>
          ) : null}
          <h2 className="mt-1 text-lg font-black">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminTag({
  children,
  tone = "soft",
}: {
  children: ReactNode;
  tone?: "soft" | "dark" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em]",
        tone === "dark" && "bg-[#231717] text-white",
        tone === "warn" && "bg-[#ffd8c4] text-[#7e2f17]",
        tone === "soft" && "bg-[#f3eadf] text-[#5f4941]",
      )}
    >
      {children}
    </span>
  );
}
