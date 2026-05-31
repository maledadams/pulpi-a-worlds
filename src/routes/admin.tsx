import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CreditCard, PackageSearch, ShoppingBag } from "lucide-react";
import { AdminPanel, AdminShell, AdminStatCard, AdminTag } from "@/components/admin/AdminShell";
import { enforceAdminAccess } from "@/lib/admin-access";
import {
  ADMIN_ORDERS,
  getAdminDashboardSnapshot,
  getInventoryStatus,
  getInventoryStatusTone,
  getOrderRevenueLabel,
  getVibeLabel,
} from "@/lib/admin-service";

export const Route = createFileRoute("/admin")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({
    snapshot: getAdminDashboardSnapshot(),
    revenueLabel: getOrderRevenueLabel(),
  }),
  head: () => ({ meta: [{ title: "Admin - Resumen" }] }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { snapshot, revenueLabel } = Route.useLoaderData();

  return (
    <AdminShell
      section="resumen"
      title="Resumen operativo"
      subtitle="Vista compacta para revisar stock, pedidos y salud general de la tienda sin perderse en pantallas gigantes."
      actions={
        <>
          <Link to="/admin/pedidos" className="rounded-2xl border-2 border-[#231717] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
            Ver pedidos
          </Link>
          <Link to="/admin/productos" className="rounded-2xl border-2 border-[#231717] bg-[#231717] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
            Gestionar catalogo
          </Link>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4">
        <AdminStatCard label="Productos" value={String(snapshot.productCount)} help="Catalogo visible actualmente" icon={PackageSearch} />
        <AdminStatCard label="Pedidos" value={String(snapshot.orderCount)} help="Pedidos en el snapshot local" icon={ShoppingBag} />
        <AdminStatCard label="Pendiente pago" value={String(snapshot.pendingPaymentCount)} help="Ordenes que esperan validacion manual" icon={CreditCard} />
        <AdminStatCard label="Inventario bruto" value={revenueLabel} help="Valor aproximado segun precio actual y stock" icon={BarChart3} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <AdminPanel title="Poco stock" eyebrow="Accion rapida">
          <div className="grid gap-3">
            {snapshot.lowStockProducts.length === 0 ? (
              <p className="text-sm text-[#6b5a55]">No hay productos por debajo del umbral de poco stock.</p>
            ) : (
              snapshot.lowStockProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#231717]/10 px-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{product.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <AdminTag>{getVibeLabel(product.vibe)}</AdminTag>
                      <AdminTag tone="warn">{product.stock ?? 0} unidades</AdminTag>
                    </div>
                  </div>
                  <div className={`rounded-xl px-2.5 py-1 text-[11px] font-black uppercase ${getInventoryStatusTone(product)}`}>
                    {getInventoryStatus(product)}
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel title="Mix por subtienda" eyebrow="Distribucion">
          <div className="grid gap-3">
            {snapshot.productsByVibe.map((entry) => (
              <div key={entry.vibe} className="rounded-2xl border border-[#231717]/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold">{getVibeLabel(entry.vibe)}</div>
                  <div className="text-lg font-black">{entry.count}</div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[#f3eadf]">
                  <div
                    className="h-2 rounded-full bg-[#231717]"
                    style={{ width: `${Math.max((entry.count / snapshot.productCount) * 100, 10)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <AdminPanel title="Pedidos recientes" eyebrow="Seguimiento">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                <tr>
                  <th className="pb-3 pr-3">Pedido</th>
                  <th className="pb-3 pr-3">Cliente</th>
                  <th className="pb-3 pr-3">Estado</th>
                  <th className="pb-3 pr-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-[#231717]/10 align-top">
                    <td className="py-3 pr-3 font-bold">{order.orderNumber}</td>
                    <td className="py-3 pr-3">
                      <div>{order.customerName}</div>
                      <div className="text-xs text-[#6b5a55]">{order.customerEmail}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <AdminTag tone={order.status === "pending_payment" ? "warn" : "soft"}>
                        {order.status}
                      </AdminTag>
                    </td>
                    <td className="py-3 pr-3 font-bold">
                      RD${order.total.toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel title="Metodos activos" eyebrow="Cobro actual">
          <div className="grid gap-3">
            {[
              ["Transferencia", "Manual con validacion y comprobante"],
              ["PayPal", "Manual: se confirma fuera de la web"],
              ["WhatsApp", "Canal directo para cerrar pedidos y dudas"],
            ].map(([label, description]) => (
              <div key={label} className="rounded-2xl border border-[#231717]/10 p-3">
                <div className="text-sm font-bold">{label}</div>
                <div className="mt-1 text-xs leading-5 text-[#6b5a55]">{description}</div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
