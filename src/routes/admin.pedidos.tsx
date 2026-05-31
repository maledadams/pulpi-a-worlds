import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminPagination,
  AdminSelect,
  AdminTextarea,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { formatPrice } from "@/data/products";
import {
  ADMIN_ORDERS,
  formatAdminOrderStatus,
  formatAdminPaymentMethod,
} from "@/lib/admin-service";
import type { AdminOrderRecord, AdminOrderStatus, AdminPaymentMethod } from "@/lib/admin-types";

const PAGE_SIZE = 8;

function cloneOrder(order: AdminOrderRecord): AdminOrderRecord {
  return {
    ...order,
    shippingAddress: { ...order.shippingAddress },
    lines: order.lines.map((line) => ({ ...line })),
  };
}

export const Route = createFileRoute("/admin/pedidos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({ orders: ADMIN_ORDERS }),
  head: () => ({ meta: [{ title: "Admin - Pedidos" }] }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { orders } = Route.useLoaderData();
  const [rows, setRows] = useState(() => orders.map(cloneOrder));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminOrderStatus>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(orders[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminOrderRecord | null>(orders[0] ? cloneOrder(orders[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((order) => {
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const haystack = `${order.orderNumber} ${order.customerName} ${order.customerEmail} ${order.customerPhone}`.toLowerCase();
      return matchesStatus && haystack.includes(lowered);
    });
  }, [rows, query, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((order) => order.id === selectedId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((order) => order.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }

    setDraft(cloneOrder(selected));
  }, [selected]);

  const handleSave = () => {
    if (!draft) return;
    setRows((current) => current.map((order) => (order.id === draft.id ? draft : order)));
    setSaveMessage("Pedido actualizado solo en la interfaz. Falta persistencia D1.");
  };

  const quickSetStatus = (status: AdminOrderStatus) => {
    setDraft((current) => (current ? { ...current, status } : current));
  };

  return (
    <AdminShell
      section="pedidos"
      title="Pedidos"
      subtitle="Mesa operativa compacta para validar pagos manuales, corregir datos y mover estados sin perder contexto."
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_400px]">
        <AdminPanel
          title="Bandeja"
          eyebrow="Pedidos"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "pending_payment", "paid", "processing", "shipped", "cancelled"] as const).map((entry) => (
                <AdminButton
                  key={entry}
                  tone={statusFilter === entry ? "primary" : "ghost"}
                  onClick={() => setStatusFilter(entry)}
                >
                  {entry === "all" ? "Todos" : formatAdminOrderStatus(entry)}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por pedido, cliente, email o telefono"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} pedidos
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay pedidos aqui"
              body="Prueba otro estado o una busqueda distinta."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                    <tr>
                      <th className="pb-3 pr-3">Pedido</th>
                      <th className="pb-3 pr-3">Cliente</th>
                      <th className="pb-3 pr-3">Metodo</th>
                      <th className="pb-3 pr-3">Estado</th>
                      <th className="pb-3 pr-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedId(order.id)}
                        className={`cursor-pointer border-t border-[#231717]/10 align-top transition-colors ${
                          selectedId === order.id ? "bg-[#f7f2ec]" : "hover:bg-[#faf6f0]"
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-bold">{order.orderNumber}</div>
                          <div className="text-xs text-[#6b5a55]">{new Date(order.createdAt).toLocaleDateString("es-DO")}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div>{order.customerName}</div>
                          <div className="text-xs text-[#6b5a55]">{order.customerPhone}</div>
                        </td>
                        <td className="py-3 pr-3">{formatAdminPaymentMethod(order.paymentMethod)}</td>
                        <td className="py-3 pr-3">
                          <AdminTag tone={order.status === "pending_payment" ? "warn" : order.status === "paid" ? "dark" : "soft"}>
                            {formatAdminOrderStatus(order.status)}
                          </AdminTag>
                        </td>
                        <td className="py-3 pr-3 font-bold">{formatPrice(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3">
                <AdminPagination page={safePage} pages={pages} onChange={setPage} />
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft ? draft.orderNumber : "Detalle"}
          eyebrow="Gestion"
          actions={
            <AdminButton tone="primary" onClick={handleSave} disabled={!draft}>
              Guardar
            </AdminButton>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              {saveMessage ? (
                <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                  {saveMessage}
                </div>
              ) : null}

              <div className="grid gap-3">
                <div className="rounded-2xl bg-[#f7f2ec] px-3 py-3 text-sm">
                  <div className="font-bold">{draft.customerName}</div>
                  <div className="mt-1 text-[#6b5a55]">{draft.customerEmail}</div>
                  <div className="text-[#6b5a55]">{draft.customerPhone}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Estado">
                    <AdminSelect
                      value={draft.status}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, status: event.target.value as AdminOrderStatus } : current,
                        )
                      }
                    >
                      <option value="pending_payment">Pendiente pago</option>
                      <option value="paid">Pagado</option>
                      <option value="processing">Preparando</option>
                      <option value="shipped">Enviado</option>
                      <option value="cancelled">Cancelado</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Metodo de pago">
                    <AdminSelect
                      value={draft.paymentMethod}
                      onChange={(event) =>
                        setDraft((current) =>
                          current ? { ...current, paymentMethod: event.target.value as AdminPaymentMethod } : current,
                        )
                      }
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="paypal">PayPal</option>
                      <option value="whatsapp">WhatsApp</option>
                    </AdminSelect>
                  </AdminField>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AdminButton tone="secondary" onClick={() => quickSetStatus("paid")}>
                    Marcar pagado
                  </AdminButton>
                  <AdminButton tone="secondary" onClick={() => quickSetStatus("processing")}>
                    Preparar
                  </AdminButton>
                  <AdminButton tone="secondary" onClick={() => quickSetStatus("shipped")}>
                    Marcar enviado
                  </AdminButton>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <AdminField label="Direccion">
                  <AdminInput
                    value={draft.shippingAddress.line1}
                    onChange={(event) =>
                      setDraft((current) =>
                        current
                          ? { ...current, shippingAddress: { ...current.shippingAddress, line1: event.target.value } }
                          : current,
                      )
                    }
                  />
                </AdminField>
                <AdminField label="Ciudad y provincia">
                  <AdminInput
                    value={`${draft.shippingAddress.city}, ${draft.shippingAddress.province}`}
                    onChange={(event) => {
                      const [city = "", province = ""] = event.target.value.split(",").map((entry) => entry.trim());
                      setDraft((current) =>
                        current
                          ? { ...current, shippingAddress: { ...current.shippingAddress, city, province } }
                          : current,
                      );
                    }}
                  />
                </AdminField>
              </div>

              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">Lineas del pedido</div>
                <div className="mt-2 grid gap-2">
                  {draft.lines.map((line, index) => (
                    <div key={`${line.productId}-${index}`} className="rounded-2xl border border-[#231717]/10 px-3 py-2">
                      <div className="text-sm font-bold">{line.productName}</div>
                      <div className="mt-1 text-xs text-[#6b5a55]">
                        {line.variantLabel} · {line.quantity} x {formatPrice(line.unitPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[#231717]/10 p-3 text-sm">
                <div className="flex items-center justify-between"><span>Subtotal</span><span>{formatPrice(draft.subtotal)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span>Envio</span><span>{formatPrice(draft.shipping)}</span></div>
                <div className="mt-3 flex items-center justify-between text-base font-black"><span>Total</span><span>{formatPrice(draft.total)}</span></div>
              </div>

              <AdminField label="Notas internas">
                <AdminTextarea
                  rows={5}
                  value={draft.notes}
                  onChange={(event) => setDraft((current) => (current ? { ...current, notes: event.target.value } : current))}
                />
              </AdminField>
            </div>
          ) : (
            <AdminEmptyState
              title="Sin pedido seleccionado"
              body="Selecciona un pedido de la bandeja para revisar pago, direccion y estado."
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
