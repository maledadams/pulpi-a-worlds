import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { ADMIN_SETTINGS } from "@/lib/admin-service";

export const Route = createFileRoute("/admin/configuracion")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({ settings: ADMIN_SETTINGS }),
  head: () => ({ meta: [{ title: "Admin - Configuracion" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { settings } = Route.useLoaderData();
  const [form, setForm] = useState(settings);
  const [pendingEmail, setPendingEmail] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const addAllowedEmail = () => {
    const value = pendingEmail.trim().toLowerCase();
    if (!value || form.adminAllowedEmails.includes(value)) return;
    setForm((current) => ({ ...current, adminAllowedEmails: [...current.adminAllowedEmails, value] }));
    setPendingEmail("");
  };

  const removeAllowedEmail = (email: string) => {
    setForm((current) => ({
      ...current,
      adminAllowedEmails: current.adminAllowedEmails.filter((entry) => entry !== email),
    }));
  };

  const handleSave = () => {
    setSaveMessage("Configuracion lista en la interfaz. Falta persistencia real y enlace a secrets/env.");
  };

  return (
    <AdminShell
      section="configuracion"
      title="Configuracion"
      subtitle="Datos minimos para operar checkout manual, soporte y acceso del equipo sin tener que navegar por una pantalla exagerada."
      actions={
        <AdminButton tone="primary" onClick={handleSave}>
          Guardar cambios
        </AdminButton>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_390px]">
        <div className="grid gap-4">
          <AdminPanel title="Cobro manual" eyebrow="Checkout">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="Banco">
                <AdminInput value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </AdminField>
              <AdminField label="Tipo de cuenta">
                <AdminInput value={form.bankAccountType} onChange={(e) => setForm({ ...form, bankAccountType: e.target.value })} />
              </AdminField>
              <AdminField label="Numero de cuenta">
                <AdminInput value={form.bankAccountNumber} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })} />
              </AdminField>
              <AdminField label="Titular">
                <AdminInput value={form.bankAccountOwner} onChange={(e) => setForm({ ...form, bankAccountOwner: e.target.value })} />
              </AdminField>
              <AdminField label="Correo PayPal">
                <AdminInput value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} />
              </AdminField>
              <AdminField label="Nombre del negocio">
                <AdminInput value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="Nota de envio y confirmacion">
                  <AdminTextarea value={form.shippingNote} onChange={(e) => setForm({ ...form, shippingNote: e.target.value })} rows={4} />
                </AdminField>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Soporte y contacto" eyebrow="Atencion">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="Email soporte">
                <AdminInput value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
              </AdminField>
              <AdminField label="Label WhatsApp">
                <AdminInput value={form.whatsappLabel} onChange={(e) => setForm({ ...form, whatsappLabel: e.target.value })} />
              </AdminField>
              <div className="md:col-span-2">
                <AdminField label="WhatsApp numero sin formato">
                  <AdminInput value={form.whatsappNumber} onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })} />
                </AdminField>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="grid gap-4">
          <AdminPanel title="Acceso del equipo" eyebrow="Cloudflare Access">
            {saveMessage ? (
              <div className="mb-3 rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                {saveMessage}
              </div>
            ) : null}

            <div className="rounded-2xl bg-[#f7f2ec] p-3 text-sm leading-6 text-[#5f4941]">
              En local el admin queda abierto mientras uses <code>npm run dev</code>. Fuera de local, la ruta debe quedar detras de Cloudflare Access con login Google y hosts permitidos.
            </div>

            <div className="mt-4 grid gap-3">
              <AdminField label="Agregar correo autorizado">
                <div className="flex gap-2">
                  <AdminInput value={pendingEmail} onChange={(e) => setPendingEmail(e.target.value)} placeholder="team@pulpina.do" />
                  <AdminButton tone="secondary" onClick={addAllowedEmail}>
                    Agregar
                  </AdminButton>
                </div>
              </AdminField>
              <div className="flex flex-wrap gap-2">
                {form.adminAllowedEmails.map((email) => (
                  <button
                    key={email}
                    type="button"
                    onClick={() => removeAllowedEmail(email)}
                    className="rounded-xl bg-[#f3eadf] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#5f4941]"
                  >
                    {email}
                  </button>
                ))}
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Notas tecnicas" eyebrow="Infra">
            <div className="grid gap-2 text-sm leading-6 text-[#5f4941]">
              <p>D1 guardara catalogo, pedidos y settings reales.</p>
              <p>R2 sera la capa de imagenes cuando conectemos upload real.</p>
              <p>El checkout actual esta pensado para transferencia, PayPal y WhatsApp con validacion manual.</p>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
