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
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminCatalogProducts } from "@/lib/catalog";
import { formatPrice } from "@/data/products";
import { formatAdminInquiryChannel, formatAdminInquiryStatus } from "@/lib/admin-service";
import { createAdminManualOrder, deleteAdminOrder, getAdminOrders, updateAdminOrder } from "@/lib/manual-orders";
import type { AdminInquiryChannel, AdminInquiryRecord, AdminInquiryStatus, AdminProductRecord } from "@/lib/admin-types";

const PAGE_SIZE = 8;

type DraftOrderLine = {
  key: string;
  productId: string;
  productQuery: string;
  quantity: number;
  variantId: string;
};

type OrderFormState = {
  channel: AdminInquiryChannel;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: AdminInquiryRecord["fulfillmentMethod"];
  lines: DraftOrderLine[];
  notes: string;
  paymentStatus: AdminInquiryRecord["paymentStatus"];
  sendEmails: boolean;
  shipping: number;
  shippingAddress: AdminInquiryRecord["shippingAddress"];
  status: AdminInquiryStatus;
};

function cloneInquiry(inquiry: AdminInquiryRecord): AdminInquiryRecord {
  return {
    ...inquiry,
    shippingAddress: { ...inquiry.shippingAddress },
    lines: inquiry.lines.map((line) => ({ ...line })),
  };
}

function statusTone(status: AdminInquiryStatus) {
  if (status === "new") return "warn";
  if (status === "closed") return "success";
  if (status === "cancelled") return "danger";
  return "info";
}

function createDraftLine(products: AdminProductRecord[]): DraftOrderLine {
  const product = products.find((entry) => entry.available) ?? products[0];
  const variant = product?.variants.find((entry) => entry.available) ?? product?.variants[0];
  return {
    key: crypto.randomUUID(),
    productId: product?.id ?? "",
    productQuery: product?.name ?? "",
    quantity: 1,
    variantId: variant?.id ?? "",
  };
}

function findProduct(products: AdminProductRecord[], productId: string) {
  return products.find((entry) => entry.id === productId);
}

function getAvailableVariants(product: AdminProductRecord | undefined) {
  return product?.variants.filter((variant) => variant.available) ?? [];
}

function buildCreateState(products: AdminProductRecord[]): OrderFormState {
  return {
    channel: "whatsapp",
    customerEmail: "",
    customerName: "",
    customerPhone: "",
    fulfillmentMethod: "pickup",
    lines: [createDraftLine(products)],
    notes: "",
    paymentStatus: "pending",
    sendEmails: true,
    shipping: 0,
    shippingAddress: { line1: "", city: "", province: "" },
    status: "new",
  };
}

function buildEditableLines(inquiry: AdminInquiryRecord, products: AdminProductRecord[]): DraftOrderLine[] {
  return inquiry.lines.map((line) => {
    const product = products.find((entry) => entry.id === line.productId);
    return {
      key: crypto.randomUUID(),
      productId: line.productId,
      productQuery: product?.name ?? line.productName,
      quantity: line.quantity,
      variantId: line.variantId,
    };
  });
}

function ProductSearchField({
  line,
  products,
  onProductSelect,
  onQueryChange,
}: {
  line: DraftOrderLine;
  products: AdminProductRecord[];
  onProductSelect: (product: AdminProductRecord) => void;
  onQueryChange: (value: string) => void;
}) {
  const matches = useMemo(() => {
    const lowered = line.productQuery.trim().toLowerCase();
    return products
      .filter((entry) => {
        if (!lowered) return true;
        const haystack = `${entry.name} ${entry.id} ${entry.slug}`.toLowerCase();
        return haystack.includes(lowered);
      })
      .slice(0, 6);
  }, [line.productQuery, products]);

  return (
    <div className="grid gap-2">
      <AdminInput
        value={line.productQuery}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Buscar producto por nombre, id o slug"
      />
      <div className="grid gap-2 rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-2">
        {matches.map((match) => (
          <button
            key={match.id}
            type="button"
            onClick={() => onProductSelect(match)}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
              line.productId === match.id
                ? "border-[#231717] bg-[#231717] text-white"
                : "border-[#231717]/10 bg-white text-[#231717]"
            }`}
          >
            <div className="font-bold">{match.name}</div>
            <div className="text-xs opacity-70">{match.id}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/pedidos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({
    inquiries: await getAdminOrders(),
    products: await getAdminCatalogProducts(),
  }),
  head: () => ({ meta: [{ title: "Admin - Pedidos" }] }),
  component: AdminOrdersPage,
});

function AdminOrdersPage() {
  const { inquiries, products } = Route.useLoaderData();
  const [rows, setRows] = useState(() => inquiries.map(cloneInquiry));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminInquiryStatus>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(inquiries[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminInquiryRecord | null>(inquiries[0] ? cloneInquiry(inquiries[0]) : null);
  const [draftLines, setDraftLines] = useState<DraftOrderLine[]>(() => inquiries[0] ? buildEditableLines(inquiries[0], products) : []);
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [newOrder, setNewOrder] = useState<OrderFormState>(() => buildCreateState(products));

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((inquiry) => {
      const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
      const haystack = `${inquiry.requestNumber} ${inquiry.customerName} ${inquiry.customerEmail} ${inquiry.customerPhone}`.toLowerCase();
      return matchesStatus && haystack.includes(lowered);
    });
  }, [rows, query, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((inquiry) => inquiry.id === selectedId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      setDraftLines([]);
      return;
    }

    if (!filtered.some((inquiry) => inquiry.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setDraftLines([]);
      return;
    }

    setDraft(cloneInquiry(selected));
    setDraftLines(buildEditableLines(selected, products));
  }, [selected, products]);

  const updateDraftLine = (key: string, updater: (line: DraftOrderLine) => DraftOrderLine) => {
    setDraftLines((current) => current.map((line) => (line.key === key ? updater(line) : line)));
  };

  const updateCreateLine = (key: string, updater: (line: DraftOrderLine) => DraftOrderLine) => {
    setNewOrder((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? updater(line) : line)),
    }));
  };

  const removeDraftLine = (key: string) => {
    if (!confirmAdminDestructiveAction("Vas a quitar esta linea del pedido. ¿Quieres continuar?")) {
      return;
    }
    setDraftLines((current) => (current.length > 1 ? current.filter((line) => line.key !== key) : current));
  };

  const removeCreateLine = (key: string) => {
    if (!confirmAdminDestructiveAction("Vas a quitar esta linea del pedido manual. ¿Quieres continuar?")) {
      return;
    }
    setNewOrder((current) => ({
      ...current,
      lines: current.lines.length > 1 ? current.lines.filter((line) => line.key !== key) : current.lines,
    }));
  };

  const createPreviewTotal = useMemo(
    () =>
      newOrder.lines.reduce((sum, line) => {
        const product = findProduct(products, line.productId);
        const variant = product?.variants.find((entry) => entry.id === line.variantId);
        return sum + (variant?.price ?? 0) * line.quantity;
      }, 0) + newOrder.shipping,
    [newOrder.lines, newOrder.shipping, products],
  );

  const detailPreviewTotal = useMemo(
    () =>
      draftLines.reduce((sum, line) => {
        const product = findProduct(products, line.productId);
        const variant = product?.variants.find((entry) => entry.id === line.variantId);
        return sum + (variant?.price ?? 0) * line.quantity;
      }, 0) + (draft?.shipping ?? 0),
    [draft, draftLines, products],
  );

  const handleSave = () => {
    if (!draft) return;
    setSaving(true);
    setSaveMessage("");

    void updateAdminOrder({
      data: {
        channel: draft.channel,
        customerEmail: draft.customerEmail,
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        fulfillmentMethod: draft.fulfillmentMethod,
        id: draft.id,
        lines: draftLines.map((line) => ({
          quantity: line.quantity,
          variantId: line.variantId,
        })),
        notes: draft.notes,
        paymentStatus: draft.paymentStatus,
        shipping: draft.shipping,
        shippingAddress: draft.shippingAddress,
        status: draft.status,
      },
    })
      .then((updated) => {
        const next = cloneInquiry(updated);
        setRows((current) => current.map((inquiry) => (inquiry.id === next.id ? next : inquiry)));
        setDraft(next);
        setDraftLines(buildEditableLines(next, products));
        setSaveMessage("Pedido guardado.");
      })
      .catch(() => setSaveMessage("No se pudo guardar el pedido."))
      .finally(() => setSaving(false));
  };

  const handleCreateOrder = () => {
    setCreating(true);
    setCreateMessage("");

    void createAdminManualOrder({
      data: {
        channel: newOrder.channel,
        customerEmail: newOrder.customerEmail,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        fulfillmentMethod: newOrder.fulfillmentMethod,
        lines: newOrder.lines.map((line) => ({
          quantity: line.quantity,
          variantId: line.variantId,
        })),
        notes: newOrder.notes,
        paymentStatus: newOrder.paymentStatus,
        sendEmails: newOrder.sendEmails,
        shipping: newOrder.shipping,
        shippingAddress: newOrder.shippingAddress,
        status: newOrder.status,
      },
    })
      .then((created) => {
        const next = cloneInquiry(created);
        setRows((current) => [next, ...current]);
        setSelectedId(next.id);
        setDraft(next);
        setDraftLines(buildEditableLines(next, products));
        setNewOrder(buildCreateState(products));
        setCreateMessage("Pedido manual creado.");
        setIsCreating(false);
      })
      .catch((error) => {
        setCreateMessage(error instanceof Error ? error.message : "No se pudo crear el pedido manual.");
      })
      .finally(() => setCreating(false));
  };

  const handleDeleteOrder = () => {
    if (!draft) return;
    if (
      !confirmAdminDestructiveAction(
        `Vas a eliminar el pedido ${draft.requestNumber}. Esta accion no se puede deshacer. ¿Quieres continuar?`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setSaveMessage("");
    void deleteAdminOrder({ data: { id: draft.id } })
      .then(() => {
        setRows((current) => current.filter((inquiry) => inquiry.id !== draft.id));
        setSaveMessage("Pedido eliminado.");
      })
      .catch((error) => {
        setSaveMessage(error instanceof Error ? error.message : "No se pudo eliminar el pedido.");
      })
      .finally(() => setDeleting(false));
  };

  const renderLinesEditor = (
    lines: DraftOrderLine[],
    onLineChange: (key: string, updater: (line: DraftOrderLine) => DraftOrderLine) => void,
    onLineRemove: (key: string) => void,
    onLineAdd: () => void,
  ) => (
    <div className="grid gap-3">
      {lines.map((line) => {
        const product = findProduct(products, line.productId);
        const variants = getAvailableVariants(product);

        return (
          <div key={line.key} className="rounded-2xl border border-[#231717]/10 bg-[#faf6f0] p-4">
            <div className="grid gap-3">
              <ProductSearchField
                line={line}
                products={products}
                onQueryChange={(value) =>
                  onLineChange(line.key, (current) => ({
                    ...current,
                    productQuery: value,
                  }))
                }
                onProductSelect={(nextProduct) => {
                  const realProduct = findProduct(products, nextProduct.id) ?? products[0];
                  const firstVariant = getAvailableVariants(realProduct)[0] ?? realProduct?.variants[0];
                  onLineChange(line.key, () => ({
                    ...line,
                    productId: realProduct?.id ?? "",
                    productQuery: realProduct?.name ?? line.productQuery,
                    variantId: firstVariant?.id ?? "",
                  }));
                }}
              />

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_auto]">
                <AdminField label="Variante">
                  <AdminSelect
                    value={line.variantId}
                    onChange={(event) => onLineChange(line.key, (current) => ({ ...current, variantId: event.target.value }))}
                  >
                    {variants.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {variant.title}
                      </option>
                    ))}
                  </AdminSelect>
                </AdminField>
                <AdminField label="Cantidad">
                  <AdminInput
                    type="number"
                    value={line.quantity}
                    onChange={(event) =>
                      onLineChange(line.key, (current) => ({
                        ...current,
                        quantity: Math.max(1, Number(event.target.value) || 1),
                      }))
                    }
                  />
                </AdminField>
                <div className="flex items-end">
                  <AdminButton tone="ghost" onClick={() => onLineRemove(line.key)}>
                    Quitar
                  </AdminButton>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <AdminButton tone="secondary" onClick={onLineAdd}>
        Agregar producto
      </AdminButton>
    </div>
  );

  return (
    <AdminShell
      section="pedidos"
      title="Pedidos"
      actions={
        <AdminButton tone={isCreating ? "active" : "secondary"} onClick={() => setIsCreating((current) => !current)}>
          {isCreating ? "Cerrar manual" : "Nuevo pedido manual"}
        </AdminButton>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_460px]">
        <AdminPanel
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "new", "follow_up", "quoted", "closed", "cancelled"] as const).map((entry) => (
                <AdminButton key={entry} tone={statusFilter === entry ? "active" : "ghost"} onClick={() => setStatusFilter(entry)}>
                  {entry === "all" ? "Todas" : formatAdminInquiryStatus(entry)}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por numero PUL, cliente, email o telefono"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} pedidos
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay pedidos aqui"
              body="Cuando alguien complete el checkout manual o cuando crees uno desde admin aparecera en esta bandeja."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c665f]">
                    <tr>
                      <th className="pb-3 pr-3">Pedido</th>
                      <th className="pb-3 pr-3">Cliente</th>
                      <th className="pb-3 pr-3">Canal</th>
                      <th className="pb-3 pr-3">Entrega</th>
                      <th className="pb-3 pr-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((inquiry) => (
                      <tr
                        key={inquiry.id}
                        onClick={() => setSelectedId(inquiry.id)}
                        className={`cursor-pointer border-t border-[#231717]/10 align-top transition-colors ${
                          selectedId === inquiry.id ? "bg-[#f7f2ec]" : "hover:bg-[#faf6f0]"
                        }`}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-bold">{inquiry.requestNumber}</div>
                          <div className="text-xs text-[#6b5a55]">{new Date(inquiry.createdAt).toLocaleDateString("es-DO")}</div>
                        </td>
                        <td className="py-3 pr-3">
                          <div>{inquiry.customerName}</div>
                          <div className="text-xs text-[#6b5a55]">{inquiry.customerPhone}</div>
                        </td>
                        <td className="py-3 pr-3">{formatAdminInquiryChannel(inquiry.channel)}</td>
                        <td className="py-3 pr-3">{inquiry.fulfillmentMethod === "delivery" ? "Delivery" : "Recoger"}</td>
                        <td className="py-3 pr-3">
                          <AdminTag tone={statusTone(inquiry.status)}>{formatAdminInquiryStatus(inquiry.status)}</AdminTag>
                        </td>
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

        <div className="grid gap-4">
          {isCreating ? (
            <AdminPanel
              title="Nuevo pedido manual"
              actions={
                <AdminButton tone="primary" onClick={handleCreateOrder} disabled={creating}>
                  {creating ? "Creando..." : "Crear pedido"}
                </AdminButton>
              }
            >
              <div className="grid gap-4">
                {createMessage ? (
                  <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                    {createMessage}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Nombre">
                    <AdminInput value={newOrder.customerName} onChange={(event) => setNewOrder((current) => ({ ...current, customerName: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Correo">
                    <AdminInput value={newOrder.customerEmail} onChange={(event) => setNewOrder((current) => ({ ...current, customerEmail: event.target.value }))} />
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Telefono">
                    <AdminInput value={newOrder.customerPhone} onChange={(event) => setNewOrder((current) => ({ ...current, customerPhone: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Canal">
                    <AdminSelect value={newOrder.channel} onChange={(event) => setNewOrder((current) => ({ ...current, channel: event.target.value as AdminInquiryChannel }))}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="formulario">Formulario</option>
                      <option value="instagram">Instagram</option>
                      <option value="email">Email</option>
                    </AdminSelect>
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Entrega">
                    <AdminSelect
                      value={newOrder.fulfillmentMethod}
                      onChange={(event) =>
                        setNewOrder((current) => ({
                          ...current,
                          fulfillmentMethod: event.target.value as OrderFormState["fulfillmentMethod"],
                          shipping: event.target.value === "delivery" ? current.shipping : 0,
                        }))
                      }
                    >
                      <option value="pickup">Recoger</option>
                      <option value="delivery">Delivery</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Estado">
                    <AdminSelect value={newOrder.status} onChange={(event) => setNewOrder((current) => ({ ...current, status: event.target.value as AdminInquiryStatus }))}>
                      <option value="new">Nueva</option>
                      <option value="follow_up">Seguimiento</option>
                      <option value="quoted">Cotizada</option>
                      <option value="closed">Cerrada</option>
                      <option value="cancelled">Cancelada</option>
                    </AdminSelect>
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Pago">
                    <AdminSelect value={newOrder.paymentStatus} onChange={(event) => setNewOrder((current) => ({ ...current, paymentStatus: event.target.value as AdminInquiryRecord["paymentStatus"] }))}>
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="cancelled">Cancelado</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Costo envio">
                    <AdminInput type="number" value={newOrder.shipping} onChange={(event) => setNewOrder((current) => ({ ...current, shipping: Math.max(0, Number(event.target.value) || 0) }))} />
                  </AdminField>
                </div>

                {newOrder.fulfillmentMethod === "delivery" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <AdminField label="Direccion">
                        <AdminInput
                          value={newOrder.shippingAddress.line1}
                          onChange={(event) =>
                            setNewOrder((current) => ({
                              ...current,
                              shippingAddress: { ...current.shippingAddress, line1: event.target.value },
                            }))
                          }
                        />
                      </AdminField>
                    </div>
                    <AdminField label="Ciudad">
                      <AdminInput
                        value={newOrder.shippingAddress.city}
                        onChange={(event) =>
                          setNewOrder((current) => ({
                            ...current,
                            shippingAddress: { ...current.shippingAddress, city: event.target.value },
                          }))
                        }
                      />
                    </AdminField>
                    <AdminField label="Provincia">
                      <AdminInput
                        value={newOrder.shippingAddress.province}
                        onChange={(event) =>
                          setNewOrder((current) => ({
                            ...current,
                            shippingAddress: { ...current.shippingAddress, province: event.target.value },
                          }))
                        }
                      />
                    </AdminField>
                  </div>
                ) : null}

                <AdminField label="Productos">{renderLinesEditor(
                  newOrder.lines,
                  updateCreateLine,
                  removeCreateLine,
                  () =>
                    setNewOrder((current) => ({
                      ...current,
                      lines: [...current.lines, createDraftLine(products)],
                    })),
                )}</AdminField>

                <AdminField label="Notas">
                  <AdminTextarea value={newOrder.notes} onChange={(event) => setNewOrder((current) => ({ ...current, notes: event.target.value }))} rows={4} />
                </AdminField>

                <AdminField label="Total referencia">
                  <AdminInput value={formatPrice(createPreviewTotal)} disabled />
                </AdminField>
              </div>
            </AdminPanel>
          ) : null}

          {draft ? (
            <AdminPanel
              title={draft.requestNumber}
              actions={
                <div className="flex items-center gap-2">
                  <AdminButton tone="danger" onClick={handleDeleteOrder} disabled={saving || deleting}>
                    {deleting ? "Eliminando..." : "Eliminar"}
                  </AdminButton>
                  <AdminButton tone="primary" onClick={handleSave} disabled={saving || deleting}>
                    {saving ? "Guardando..." : "Guardar"}
                  </AdminButton>
                </div>
              }
            >
              <div className="grid gap-4">
                {saveMessage ? (
                  <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                    {saveMessage}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Nombre">
                    <AdminInput value={draft.customerName} onChange={(event) => setDraft((current) => (current ? { ...current, customerName: event.target.value } : current))} />
                  </AdminField>
                  <AdminField label="Correo">
                    <AdminInput value={draft.customerEmail} onChange={(event) => setDraft((current) => (current ? { ...current, customerEmail: event.target.value } : current))} />
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Telefono">
                    <AdminInput value={draft.customerPhone} onChange={(event) => setDraft((current) => (current ? { ...current, customerPhone: event.target.value } : current))} />
                  </AdminField>
                  <AdminField label="Canal">
                    <AdminSelect value={draft.channel} onChange={(event) => setDraft((current) => (current ? { ...current, channel: event.target.value as AdminInquiryChannel } : current))}>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="formulario">Formulario</option>
                      <option value="instagram">Instagram</option>
                      <option value="email">Email</option>
                    </AdminSelect>
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Entrega">
                    <AdminSelect
                      value={draft.fulfillmentMethod}
                      onChange={(event) =>
                        setDraft((current) =>
                          current
                            ? {
                                ...current,
                                fulfillmentMethod: event.target.value as AdminInquiryRecord["fulfillmentMethod"],
                                shipping: event.target.value === "delivery" ? current.shipping : 0,
                              }
                            : current,
                        )
                      }
                    >
                      <option value="pickup">Recoger</option>
                      <option value="delivery">Delivery</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Estado">
                    <AdminSelect value={draft.status} onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value as AdminInquiryStatus } : current))}>
                      <option value="new">Nueva</option>
                      <option value="follow_up">Seguimiento</option>
                      <option value="quoted">Cotizada</option>
                      <option value="closed">Cerrada</option>
                      <option value="cancelled">Cancelada</option>
                    </AdminSelect>
                  </AdminField>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AdminField label="Pago">
                    <AdminSelect value={draft.paymentStatus} onChange={(event) => setDraft((current) => (current ? { ...current, paymentStatus: event.target.value as AdminInquiryRecord["paymentStatus"] } : current))}>
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmado</option>
                      <option value="cancelled">Cancelado</option>
                    </AdminSelect>
                  </AdminField>
                  <AdminField label="Costo envio">
                    <AdminInput type="number" value={draft.shipping} onChange={(event) => setDraft((current) => (current ? { ...current, shipping: Math.max(0, Number(event.target.value) || 0) } : current))} />
                  </AdminField>
                </div>

                {draft.fulfillmentMethod === "delivery" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="md:col-span-2">
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
                    </div>
                    <AdminField label="Ciudad">
                      <AdminInput
                        value={draft.shippingAddress.city}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, shippingAddress: { ...current.shippingAddress, city: event.target.value } }
                              : current,
                          )
                        }
                      />
                    </AdminField>
                    <AdminField label="Provincia">
                      <AdminInput
                        value={draft.shippingAddress.province}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, shippingAddress: { ...current.shippingAddress, province: event.target.value } }
                              : current,
                          )
                        }
                      />
                    </AdminField>
                  </div>
                ) : null}

                <AdminField label="Productos">{renderLinesEditor(
                  draftLines,
                  updateDraftLine,
                  removeDraftLine,
                  () => setDraftLines((current) => [...current, createDraftLine(products)]),
                )}</AdminField>

                <AdminField label="Notas">
                  <AdminTextarea value={draft.notes} onChange={(event) => setDraft((current) => (current ? { ...current, notes: event.target.value } : current))} rows={4} />
                </AdminField>

                <AdminField label="Total referencia">
                  <AdminInput value={formatPrice(detailPreviewTotal)} disabled />
                </AdminField>
              </div>
            </AdminPanel>
          ) : (
            <AdminPanel title="Editor">
              <AdminEmptyState title="Sin pedido seleccionado" body="Selecciona un pedido de la lista para ver y editar su detalle." />
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
