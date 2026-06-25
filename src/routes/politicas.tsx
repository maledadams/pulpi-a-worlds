import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { getStorefrontSettings } from "@/lib/admin-content";

export const Route = createFileRoute("/politicas")({
  ssr: false,
  loader: async () => ({ settings: await getStorefrontSettings() }),
  head: () => ({ meta: [{ title: "Politicas, privacidad y terminos - Pulpiña RD" }] }),
  component: Policies,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-foreground/15 bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

function Policies() {
  const { settings } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <h1 className="text-4xl sm:text-5xl md:text-6xl">{settings.legalPageTitle}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
        Ultima actualizacion: {settings.legalLastUpdated}. {settings.legalIntro}
      </p>

      <div className="mt-6 rounded-3xl border border-[#7e2f17]/20 bg-[#fff2ea] p-5 text-sm leading-6 text-[#7e2f17]">
        <p className="font-bold">Datos legales del operador publicados actualmente:</p>
        <p>Operador: {settings.legalOperatorName}</p>
        <p>Correo legal: {settings.legalOperatorEmail}</p>
        <p>Telefono legal: {settings.legalOperatorPhone}</p>
        <p>Direccion legal: {settings.legalOperatorAddress}</p>
        <p>RNC / ID fiscal: {settings.legalTaxId}</p>
      </div>

      <div className="mt-8 grid gap-4">
        {settings.legalSections.map((section) => (
          <Section key={section.id} title={section.title}>
            {section.body.split(/\n+/).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </Section>
        ))}
      </div>
    </div>
  );
}
