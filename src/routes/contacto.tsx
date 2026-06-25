import { createFileRoute } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
import { getStorefrontSettings } from "@/lib/admin-content";

export const Route = createFileRoute("/contacto")({
  ssr: false,
  loader: async () => ({ settings: await getStorefrontSettings() }),
  head: () => ({ meta: [{ title: "Contacto - Pulpiña RD" }] }),
  component: Contact,
});

function Contact() {
  const { settings } = Route.useLoaderData();
  const whatsappHref = `https://wa.me/${settings.whatsappNumber}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
      <h1 className="text-4xl sm:text-5xl md:text-7xl">{settings.contactPageTitle}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
        {settings.contactPageIntro}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <a
          href={settings.instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4 transition hover:bg-muted"
        >
          <Instagram className="h-5 w-5" />
          <span>{settings.instagramHandle}</span>
        </a>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-2xl border border-foreground/15 bg-card p-4 transition hover:bg-muted"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{settings.whatsappLabel}</span>
        </a>

      </div>
      <h2 className="mt-12 text-2xl sm:mt-16 sm:text-3xl md:text-4xl">Preguntas frecuentes</h2>
      <div className="mt-4 grid gap-2">
        {settings.contactFaqs.map((item) => (
          <details key={item.id} className="rounded-2xl border border-foreground/15 bg-card p-4">
            <summary className="cursor-pointer font-bold">{item.question}</summary>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
