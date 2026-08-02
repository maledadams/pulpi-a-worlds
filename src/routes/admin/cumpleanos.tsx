import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import { AdminEmptyState } from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminBirthdaySubscribers } from "@/lib/public-forms";

function formatBirthDate(value: string) {
  const [, month, day] = value.split("-");
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const monthLabel = months[Number(month) - 1] ?? month;
  return `${day} de ${monthLabel}`;
}

export const Route = createFileRoute("/admin/cumpleanos")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({ subscribers: await getAdminBirthdaySubscribers() }),
  head: () => ({ meta: [{ title: "Admin - Cumpleaños" }] }),
  component: AdminBirthdaysPage,
});

function AdminBirthdaysPage() {
  const { subscribers } = Route.useLoaderData();
  const [rows] = useState(subscribers);

  const todayCount = rows.filter((row) => row.isBirthdayToday).length;

  return (
    <AdminShell section="cumpleanos" title="Cumpleaños">
      <AdminPanel title={`Suscriptores (${rows.length})`}>
        <div className="mb-4 rounded-xl bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
          {todayCount > 0
            ? `${todayCount} persona(s) cumplen años hoy.`
            : "Nadie cumple años hoy."}
        </div>

        {rows.length === 0 ? (
          <AdminEmptyState
            title="Sin suscriptores todavía"
            body="Cuando alguien registre su cumpleaños desde la tienda, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-2">
            {rows.map((row) => (
              <div
                key={row.email}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#faf6f0] px-4 py-3"
              >
                <div>
                  <div className="text-sm font-bold">{row.email}</div>
                  <div className="mt-1 text-xs text-[#6b5a55]">Cumpleaños: {formatBirthDate(row.birthDate)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {row.isBirthdayToday ? <AdminTag tone="dark">Hoy</AdminTag> : null}
                  {row.lastCouponSentDate ? (
                    <AdminTag tone="soft">Enviado {row.lastCouponSentDate}</AdminTag>
                  ) : (
                    <AdminTag tone="soft">Sin enviar</AdminTag>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
