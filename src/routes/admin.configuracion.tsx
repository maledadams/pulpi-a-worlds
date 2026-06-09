import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminPanel, AdminShell } from "@/components/admin/AdminShell";
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
  const [saveMessage, setSaveMessage] = useState("");

  const handleSave = () => {
    setSaveMessage("Configuracion lista en la interfaz. Falta persistencia real. El acceso admin se controla por Cloudflare Access y env del servidor.");
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
          <AdminPanel title="Pago con AZUL" eyebrow="Tarjeta de credito">
            <div className="mb-3 rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs leading-5 text-[#5f4941]">
              AZUL es la pasarela de pagos dominicana. Configura tus credenciales de merchant para habilitar pagos con tarjeta en el checkout.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="Merchant ID">
                <AdminInput value={form.azulMerchantId} placeholder="Ej: 39038540035" onChange={(e) => setForm({ ...form, azulMerchantId: e.target.value })} />
              </AdminField>
              <AdminField label="Merchant Name">
                <AdminInput value={form.azulMerchantName} placeholder="PULPINA RD" onChange={(e) => setForm({ ...form, azulMerchantName: e.target.value })} />
              </AdminField>
              <AdminField label="Merchant Type">
                <AdminInput value={form.azulMerchantType} placeholder="E-Commerce" onChange={(e) => setForm({ ...form, azulMerchantType: e.target.value })} />
              </AdminField>
              <AdminField label="Nombre del negocio">
                <AdminInput value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              </AdminField>
            </div>
          </AdminPanel>

          <AdminPanel title="Cobro manual" eyebrow="Transferencia / PayPal">
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
              En local el admin queda abierto mientras uses <code>pnpm dev</code>. Fuera de local, la ruta exige Cloudflare Access y una identidad reenviada por Cloudflare.
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl border border-[#231717]/10 bg-white px-3 py-3 text-sm leading-6 text-[#5f4941]">
                <p><code>ADMIN_ALLOWED_HOSTS</code> limita en que host corre el admin.</p>
                <p><code>ADMIN_ALLOWED_EMAILS</code> y <code>ADMIN_ALLOWED_EMAIL_DOMAINS</code> limitan quien entra si Cloudflare ya autentico la solicitud.</p>
                <p>La policy principal sigue viviendo en Cloudflare Zero Trust sobre <code>/admin*</code>.</p>
              </div>
              <div className="rounded-2xl border border-dashed border-[#231717]/15 bg-white/70 px-3 py-3 text-xs leading-5 text-[#6b5a55]">
                Esta pantalla ya no edita correos autorizados. Cambia la policy de Cloudflare o los env del servidor para modificar acceso real.
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Notas tecnicas" eyebrow="Infra">
            <div className="grid gap-2 text-sm leading-6 text-[#5f4941]">
              <p>D1 guardara catalogo, pedidos y settings reales.</p>
              <p>R2 sera la capa de imagenes cuando conectemos upload real.</p>
              <p>El checkout soporta AZUL (tarjeta), transferencia, PayPal y WhatsApp.</p>
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}
