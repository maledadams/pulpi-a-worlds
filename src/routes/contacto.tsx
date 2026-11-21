import { createFileRoute } from "@tanstack/react-router";
import { ThemeImage } from "@/components/theme/ThemeImage";
import { Instagram } from "lucide-react";
import { WhatsAppIcon } from "@/components/layout/Footer";
import { getStorefrontSettings } from "@/lib/admin-content";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, createSeoHead } from "@/lib/seo";
import { STORE_FAQ } from "@/lib/store-faq";
import phoneBlack from "@/assets/phoneblack.png";

export const Route = createFileRoute("/contacto")({
  loader: async () => ({ settings: await getStorefrontSettings() }),
  head: () => ({
    ...createSeoHead({
      pageName: "Contacto",
      path: "/contacto",
      description:
        "Contacta a Pulpiña RD (Pulpina RD) por WhatsApp o Instagram. Boutique de moda alternativa en República Dominicana.",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildFaqJsonLd(STORE_FAQ)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Contacto", path: "/contacto" },
          ]),
        ),
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { settings } = Route.useLoaderData();
  const whatsappChannels = [
    { href: "https://wa.me/18299643104", label: "+1 (829) 964-3104" },
    { href: "https://wa.me/18295490112", label: "+1 (829) 549-0112" },
  ];

  return (
    <div className="relative w-full overflow-hidden px-4 py-10 sm:py-12">
      <div className="relative z-10 mx-auto max-w-5xl">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 lg:gap-6">
          <ThemeImage
            slot="contact.phoneLeft"
            src={phoneBlack}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 -rotate-[14deg] object-contain sm:h-16 sm:w-16 lg:h-24 lg:w-24"
          />
          <h1 className="text-4xl sm:text-5xl md:text-7xl" style={{ transform: "none" }}>
            {settings.contactPageTitle}
          </h1>
          <ThemeImage
            slot="contact.phoneRight"
            src={phoneBlack}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 shrink-0 -scale-x-100 rotate-[14deg] object-contain sm:h-16 sm:w-16 lg:h-24 lg:w-24"
          />
        </div>
        <p className="mt-2 w-full text-sm text-muted-foreground sm:text-base">
          {settings.contactPageIntro}
        </p>
        <p className="mt-2 text-sm font-semibold sm:text-base">Martes a Domingo de 10am a 5pm</p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <a
          href="https://www.instagram.com/pulpinard/"
          target="_blank"
          rel="noreferrer"
          className="flex w-full min-w-0 items-center gap-3 justify-center !rounded-full border-2 border-foreground bg-[linear-gradient(135deg,#4f5bd5,#d62976_52%,#feda75)] p-4 text-white transition hover:brightness-105"
        >
          <Instagram className="h-5 w-5" />
          <span>@pulpinard</span>
        </a>

        <a
          href="https://www.instagram.com/pulpinamoon/"
          target="_blank"
          rel="noreferrer"
          className="flex w-full min-w-0 items-center gap-3 justify-center !rounded-full border-2 border-foreground bg-[linear-gradient(135deg,#4f5bd5,#d62976_52%,#feda75)] p-4 text-white transition hover:brightness-105"
        >
          <Instagram className="h-5 w-5" />
          <span>@pulpinamoon</span>
        </a>

        <a
          href="https://www.instagram.com/pulpinamen/"
          target="_blank"
          rel="noreferrer"
          className="flex w-full min-w-0 items-center justify-center gap-3 !rounded-full border-2 border-foreground bg-[linear-gradient(135deg,#4f5bd5,#d62976_52%,#feda75)] p-4 text-white transition hover:brightness-105"
        >
          <Instagram className="h-5 w-5" />
          <span>@pulpinamen</span>
        </a>

        {whatsappChannels.map((channel) => (
          <a
            key={channel.href}
            href={channel.href}
            target="_blank"
            rel="noreferrer"
            className="flex w-full min-w-0 items-center justify-center gap-2 !rounded-full border-2 border-foreground bg-[linear-gradient(135deg,#25d366,#128c7e)] px-3 py-4 text-xs font-semibold text-white transition hover:brightness-105"
          >
            <WhatsAppIcon className="h-5 w-5 shrink-0" />
            <span className="whitespace-nowrap">{channel.label}</span>
          </a>
        ))}

      </div>
      <section className="mt-12 sm:mt-16" aria-labelledby="location-heading">
        {/* Title always centered; on phones the Maps link sits under the map. */}
        <div className="mb-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <h2 id="location-heading" className="origin-center text-center text-2xl sm:col-start-2 sm:text-3xl md:text-4xl">
            Dónde Encontrarnos
          </h2>
          <a
            href="https://maps.app.goo.gl/oy2iu3efMdqLgWxs7"
            target="_blank"
            rel="noreferrer"
            className="hidden justify-self-end text-sm font-semibold underline underline-offset-4 sm:block"
          >
            Abrir en Google Maps
          </a>
        </div>
        <iframe
          title="Ubicación de Pulpiña"
          src="https://www.google.com/maps?q=18.4701897,-69.9648797&z=17&output=embed"
          className="h-72 w-full border border-foreground sm:h-80 md:h-96"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
        <a
          href="https://maps.app.goo.gl/oy2iu3efMdqLgWxs7"
          target="_blank"
          rel="noreferrer"
          className="mt-3 block text-center text-sm font-semibold underline underline-offset-4 sm:hidden"
        >
          Abrir en Google Maps
        </a>
      </section>
      <h2
        className="mt-12 text-center text-4xl sm:mt-16 sm:text-5xl md:text-7xl"
        style={{ transform: "none" }}
      >
        FAQ
      </h2>
      <div className="mt-4 grid gap-2">
        {settings.contactFaqs.map((item) => (
          <details key={item.id} className="group rounded-lg border border-foreground/15 bg-muted p-4 text-muted-foreground">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 text-center font-bold">
              <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">▶</span>
              <span>{item.question}</span>
            </summary>
            <p className="mt-2 text-center text-sm text-muted-foreground sm:text-base">{item.answer}</p>
          </details>
        ))}
      </div>
      </div>
    </div>
  );
}
