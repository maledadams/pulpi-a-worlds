import { AdminCheckbox } from "@/components/admin/AdminControls";
import { AdminPanel } from "@/components/admin/AdminShell";
import type { DocUpdate } from "@/components/admin/themes/ThemeEditor";
import type { AdminDiscountRecord } from "@/lib/admin-types";
import type { ThemeDocument } from "@/lib/theme-schema";

/** Discounts this theme owns (spec §5.9): on exactly while the theme is active, never in a preview. */
export function ThemeDiscountsTab({
  doc,
  update,
  discounts,
}: {
  doc: ThemeDocument;
  update: DocUpdate;
  discounts: AdminDiscountRecord[];
}) {
  const toggle = (id: string, on: boolean) =>
    update((current) => ({
      ...current,
      discountIds: on
        ? [...new Set([...current.discountIds, id])]
        : current.discountIds.filter((entry) => entry !== id),
    }));

  return (
    <AdminPanel title="Descuentos del tema">
      <div className="grid gap-3">
        <p className="text-sm text-[var(--admin-muted)]">
          Los descuentos que marques se encienden solos mientras el tema esté activo y se apagan
          cuando termina. En Promociones su interruptor queda bloqueado ("Controlado por el tema").
          Empieza a contar cuando publicas el tema; la vista previa nunca cambia precios.
        </p>
        {discounts.length === 0 ? (
          <p className="text-sm text-[var(--admin-muted)]">
            No hay descuentos. Créalos en Promociones.
          </p>
        ) : (
          discounts.map((discount) => (
            <AdminCheckbox
              key={discount.id}
              label={`${discount.label} · ${discount.type === "percentage" ? `${discount.value}%` : `RD$${discount.value}`}`}
              hint={
                discount.kind === "code"
                  ? `Código: ${discount.code}`
                  : "Promoción automática en los precios"
              }
              checked={doc.discountIds.includes(discount.id)}
              onCheckedChange={(checked) => toggle(discount.id, checked)}
            />
          ))
        )}
      </div>
    </AdminPanel>
  );
}
