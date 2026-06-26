import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminPanel, AdminShell } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminToast,
  AdminTextarea,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { getAdminSettingsRecord, saveAdminSettingsRecord } from "@/lib/admin-content";

export const Route = createFileRoute("/admin/configuracion")({
  beforeLoad: () => enforceAdminAccess(),
  loader: async () => ({ settings: await getAdminSettingsRecord() }),
  head: () => ({ meta: [{ title: "Admin - Configuracion" }] }),
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { settings } = Route.useLoaderData();
  const [form, setForm] = useState(settings);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!saveMessage) return;
    const timeout = window.setTimeout(() => setSaveMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  const handleSave = () => {
    void saveAdminSettingsRecord({ data: form })
      .then((saved) => {
        setForm(saved);
        setSaveMessage("Configuracion guardada.");
      })
      .catch(() => {
        setSaveMessage("No se pudo guardar la configuracion ahora mismo.");
      });
  };

  return (
    <AdminShell
      section="configuracion"
      title="Configuracion"
      actions={
        <AdminButton tone="primary" onClick={handleSave}>
          Guardar cambios
        </AdminButton>
      }
    >
      <div className="grid gap-4">
        <AdminPanel title="Canales de contacto">
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="Nombre del negocio">
              <AdminInput
                value={form.businessName}
                onChange={(event) => setForm({ ...form, businessName: event.target.value })}
              />
            </AdminField>
            <AdminField label="Correo de soporte">
              <AdminInput
                type="email"
                value={form.supportEmail}
                onChange={(event) => setForm({ ...form, supportEmail: event.target.value })}
              />
            </AdminField>
            <AdminField label="WhatsApp visible">
              <AdminInput
                value={form.whatsappLabel}
                onChange={(event) => setForm({ ...form, whatsappLabel: event.target.value })}
              />
            </AdminField>
            <AdminField label="WhatsApp numero sin formato">
              <AdminInput
                value={form.whatsappNumber}
                onChange={(event) => setForm({ ...form, whatsappNumber: event.target.value })}
              />
            </AdminField>
            <AdminField label="Instagram handle">
              <AdminInput
                value={form.instagramHandle}
                onChange={(event) => setForm({ ...form, instagramHandle: event.target.value })}
              />
            </AdminField>
            <AdminField label="Instagram URL">
              <AdminInput
                value={form.instagramUrl}
                onChange={(event) => setForm({ ...form, instagramUrl: event.target.value })}
              />
            </AdminField>
            <AdminField label="Titulo de contacto">
              <AdminInput
                value={form.contactPageTitle}
                onChange={(event) => setForm({ ...form, contactPageTitle: event.target.value })}
              />
            </AdminField>
            <AdminField label="Intro de contacto">
              <AdminTextarea
                value={form.contactPageIntro}
                onChange={(event) => setForm({ ...form, contactPageIntro: event.target.value })}
                rows={3}
              />
            </AdminField>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Preguntas frecuentes"
          actions={
            <AdminButton
              tone="secondary"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  contactFaqs: [
                    ...current.contactFaqs,
                    { id: `faq-${Date.now()}`, question: "", answer: "" },
                  ],
                }))
              }
            >
              Agregar FAQ
            </AdminButton>
          }
        >
          <div className="grid gap-3">
            {form.contactFaqs.map((faq) => (
              <div key={faq.id} className="rounded-[18px] border border-[#231717]/15 bg-[#faf6f0] p-4">
                <div className="grid gap-3">
                  <div className="flex justify-end">
                    <AdminButton
                      tone="ghost"
                      onClick={() =>
                        confirmAdminDestructiveAction("Vas a eliminar esta pregunta frecuente. ¿Quieres continuar?") &&
                        setForm((current) => ({
                          ...current,
                          contactFaqs: current.contactFaqs.filter((entry) => entry.id !== faq.id),
                        }))
                      }
                    >
                      Quitar
                    </AdminButton>
                  </div>
                  <AdminField label="Pregunta">
                    <AdminInput
                      value={faq.question}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contactFaqs: current.contactFaqs.map((entry) =>
                            entry.id === faq.id ? { ...entry, question: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                  </AdminField>
                  <AdminField label="Respuesta">
                    <AdminTextarea
                      value={faq.answer}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          contactFaqs: current.contactFaqs.map((entry) =>
                            entry.id === faq.id ? { ...entry, answer: event.target.value } : entry,
                          ),
                        }))
                      }
                      rows={3}
                    />
                  </AdminField>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel
          title="Legal y privacidad"
          actions={
            <AdminButton
              tone="secondary"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  legalSections: [
                    ...current.legalSections,
                    { id: `legal-${Date.now()}`, title: "", body: "" },
                  ],
                }))
              }
            >
              Agregar bloque legal
            </AdminButton>
          }
        >
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="Titulo legal">
                <AdminInput
                  value={form.legalPageTitle}
                  onChange={(event) => setForm({ ...form, legalPageTitle: event.target.value })}
                />
              </AdminField>
              <AdminField label="Ultima actualizacion">
                <AdminInput
                  value={form.legalLastUpdated}
                  onChange={(event) => setForm({ ...form, legalLastUpdated: event.target.value })}
                />
              </AdminField>
              <AdminField label="Operador legal">
                <AdminInput
                  value={form.legalOperatorName}
                  onChange={(event) => setForm({ ...form, legalOperatorName: event.target.value })}
                />
              </AdminField>
              <AdminField label="Telefono legal">
                <AdminInput
                  value={form.legalOperatorPhone}
                  onChange={(event) => setForm({ ...form, legalOperatorPhone: event.target.value })}
                />
              </AdminField>
            </div>
            <AdminField label="Correo legal">
              <AdminInput
                value={form.legalOperatorEmail}
                onChange={(event) => setForm({ ...form, legalOperatorEmail: event.target.value })}
              />
            </AdminField>
            <AdminField label="Direccion legal">
              <AdminTextarea
                value={form.legalOperatorAddress}
                onChange={(event) => setForm({ ...form, legalOperatorAddress: event.target.value })}
                rows={2}
              />
            </AdminField>
            <AdminField label="RNC / ID fiscal">
              <AdminInput
                value={form.legalTaxId}
                onChange={(event) => setForm({ ...form, legalTaxId: event.target.value })}
              />
            </AdminField>
            <AdminField label="Intro legal">
              <AdminTextarea
                value={form.legalIntro}
                onChange={(event) => setForm({ ...form, legalIntro: event.target.value })}
                rows={4}
              />
            </AdminField>

            {form.legalSections.map((section) => (
              <div key={section.id} className="rounded-[18px] border border-[#231717]/15 bg-[#faf6f0] p-4">
                <div className="grid gap-3">
                  <div className="flex justify-end">
                    <AdminButton
                      tone="ghost"
                      onClick={() =>
                        confirmAdminDestructiveAction("Vas a eliminar este bloque legal. ¿Quieres continuar?") &&
                        setForm((current) => ({
                          ...current,
                          legalSections: current.legalSections.filter((entry) => entry.id !== section.id),
                        }))
                      }
                    >
                      Quitar
                    </AdminButton>
                  </div>
                  <AdminField label="Titulo del bloque">
                    <AdminInput
                      value={section.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          legalSections: current.legalSections.map((entry) =>
                            entry.id === section.id ? { ...entry, title: event.target.value } : entry,
                          ),
                        }))
                      }
                    />
                  </AdminField>
                  <AdminField label="Contenido del bloque">
                    <AdminTextarea
                      value={section.body}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          legalSections: current.legalSections.map((entry) =>
                            entry.id === section.id ? { ...entry, body: event.target.value } : entry,
                          ),
                        }))
                      }
                      rows={6}
                    />
                  </AdminField>
                </div>
              </div>
            ))}
          </div>
        </AdminPanel>
      </div>
      <AdminToast message={saveMessage} />
    </AdminShell>
  );
}
