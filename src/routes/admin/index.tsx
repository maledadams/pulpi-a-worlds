import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquareMore, PackageSearch, ShieldCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminStatCard, AdminTag } from "@/components/admin/AdminShell";
import { AdminButton, getAdminButtonClassName } from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { formatPrice } from "@/data/products";
import { getAdminCatalogProducts } from "@/lib/catalog";
import { formatAdminInquiryChannel, formatAdminInquiryStatus } from "@/lib/admin-service";
import { getAdminOrders } from "@/lib/manual-orders";
import type { AdminInquiryRecord } from "@/lib/admin-types";

type SalesWindow = "all" | "year" | "month" | "week" | "day";

const SALES_WINDOWS: Array<{ id: SalesWindow; label: string }> = [
  { id: "all", label: "All time" },
  { id: "year", label: "Yearly" },
  { id: "month", label: "Monthly" },
  { id: "week", label: "Weekly" },
  { id: "day", label: "Daily" },
];

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({
    orders: await getAdminOrders(),
    products: await getAdminCatalogProducts(),
  }),
  head: () => ({ meta: [{ title: "Admin - Resumen" }] }),
  component: AdminDashboardPage,
});

function getWindowStart(window: SalesWindow) {
  if (window === "all") return null;

  const now = new Date();
  if (window === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (window === "week") {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  }

  if (window === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return new Date(now.getFullYear(), 0, 1);
}

function isInWindow(order: AdminInquiryRecord, window: SalesWindow) {
  const start = getWindowStart(window);
  if (!start) return true;
  return new Date(order.createdAt) >= start;
}

function getInventoryBaseUnitPrice(price: number, compareAtPrice: number | null) {
  void compareAtPrice;
  return price;
}

function getOrderPreviewImage(
  inquiry: AdminInquiryRecord,
  products: Awaited<ReturnType<typeof getAdminCatalogProducts>>,
) {
  const firstLine = inquiry.lines[0];
  if (!firstLine) return null;
  const product = products.find((entry) => entry.id === firstLine.productId);
  const variantImage = product?.variants.find((variant) => variant.id === firstLine.variantId)?.image ?? null;
  return variantImage ?? product?.featuredImage ?? null;
}

function AdminDashboardPage() {
  const { orders, products } = Route.useLoaderData();
  const [salesWindow, setSalesWindow] = useState<SalesWindow>("month");

  const snapshot = useMemo(() => {
    const recentInquiries = [...orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.requestNumber.localeCompare(a.requestNumber))
      .slice(0, 4);

    const inventoryBaseValue = products.reduce((sum, product) => {
      return sum + getInventoryBaseUnitPrice(product.price, product.compareAtPrice) * (product.stock ?? 0);
    }, 0);

    const periodOrders = orders.filter((order) => isInWindow(order, salesWindow));
    const gains = periodOrders
      .filter((order) => order.status === "closed")
      .reduce((sum, order) => sum + order.total, 0);
    const cancelledCount = periodOrders.filter((order) => order.status === "cancelled").length;
    return {
      gains,
      cancelledCount,
      netSales: gains,
      inquiryCount: orders.length,
      inventoryBaseValue,
      openInquiryCount: orders.filter((order) => order.status !== "closed" && order.status !== "cancelled").length,
      productCount: products.length,
      recentInquiries,
    };
  }, [orders, products, salesWindow]);

  const netTone = snapshot.netSales >= 0 ? "text-emerald-700" : "text-[#b42318]";
  const netLabel = `${snapshot.netSales >= 0 ? "+" : "-"}${formatPrice(Math.abs(snapshot.netSales))}`;

  return (
    <AdminShell
      section="resumen"
      title="Resumen operativo"
      actions={
        <Link
          to="/admin/pedidos"
          className={getAdminButtonClassName("secondary")}
        >
          Ver pedidos
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Productos" value={String(snapshot.productCount)} icon={PackageSearch} iconClassName="bg-[#f5dce8] text-[#7b3551]" />
        <AdminStatCard label="Pedidos" value={String(snapshot.inquiryCount)} icon={MessageSquareMore} iconClassName="bg-[#dff3c7] text-[#45651f]" />
        <AdminStatCard label="Abiertas" value={String(snapshot.openInquiryCount)} icon={TriangleAlert} iconClassName="bg-[#ffe1c8] text-[#9a4a1d]" />
        <AdminStatCard label="Inventario" value={formatPrice(snapshot.inventoryBaseValue)} icon={ShieldCheck} iconClassName="bg-[#fde2bf] text-[#8a531b]" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <AdminPanel title="Pedidos recientes">
          {snapshot.recentInquiries.length > 0 ? (
            <div className="grid gap-3">
              {snapshot.recentInquiries.map((inquiry) => (
                <div key={inquiry.id} className="rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-3">
                  <div className="flex items-start gap-3">
                    {getOrderPreviewImage(inquiry, products) ? (
                      <img
                        src={getOrderPreviewImage(inquiry, products)!.url}
                        alt={inquiry.lines[0]?.productName ?? inquiry.requestNumber}
                        className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black uppercase text-[#5f4941]">
                        {inquiry.lines[0]?.productName?.slice(0, 2).toUpperCase() ?? "P"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black">{inquiry.requestNumber}</div>
                          <div className="mt-1 text-xs text-[#6b5a55]">
                            {inquiry.customerName} / {formatAdminInquiryChannel(inquiry.channel)}
                          </div>
                        </div>
                        <AdminTag
                          tone={
                            inquiry.status === "new"
                              ? "warn"
                              : inquiry.status === "closed"
                                ? "success"
                                : inquiry.status === "cancelled"
                                  ? "danger"
                                  : "info"
                          }
                        >
                          {formatAdminInquiryStatus(inquiry.status)}
                        </AdminTag>
                      </div>
                      {inquiry.lines[0] ? (
                        <div className="mt-3 rounded-2xl border border-[#231717]/10 bg-white px-3 py-2">
                          <div className="text-sm font-normal leading-normal">{inquiry.lines[0].productName}</div>
                          <div className="mt-1 text-xs text-[#6b5a55]">
                            {inquiry.lines[0].variantLabel} / Cantidad: {inquiry.lines[0].quantity}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 grid gap-1 text-xs text-[#6b5a55]">
                        <div>Entrega: {inquiry.fulfillmentMethod === "delivery" ? "Delivery" : "Recoger"}</div>
                        {inquiry.fulfillmentMethod === "delivery" && inquiry.shippingAddress.line1 ? (
                          <div>
                            Direccion: {inquiry.shippingAddress.line1}, {inquiry.shippingAddress.city}, {inquiry.shippingAddress.province}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 text-sm text-[#5f4941]">{inquiry.notes || "Sin notas."}</div>
                      <div className="mt-3 text-sm font-black">{formatPrice(inquiry.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#231717]/20 p-4 text-sm text-[#6b5a55]">
              Aun no hay pedidos creados desde el checkout manual.
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          title="Balance de ventas"
          actions={
            <div className="flex flex-wrap gap-2">
              {SALES_WINDOWS.map((entry) => (
                <AdminButton
                  key={entry.id}
                  tone={salesWindow === entry.id ? "active" : "ghost"}
                  onClick={() => setSalesWindow(entry.id)}
                >
                  {entry.label}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="border-b border-[#231717]/10 pb-4">
              <div className={`text-3xl font-black ${netTone}`}>{netLabel}</div>
            </div>
            <div className="grid gap-2 text-sm text-[#5f4941]">
              <div className="flex items-center justify-between rounded-2xl border border-[#231717]/10 bg-[#faf6f0] px-3 py-3">
                <span>Ventas cerradas</span>
                <span className="font-black text-emerald-700">+{formatPrice(snapshot.gains)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-[#231717]/10 bg-[#faf6f0] px-3 py-3">
                <span>Canceladas</span>
                <span className="font-black text-[#7d291b]">{snapshot.cancelledCount}</span>
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
