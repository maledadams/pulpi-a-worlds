import { Link, useLocation } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import logoGeneral from "@/assets/pulpinageneralwhite.svg";
import logoMen from "@/assets/pulpinamenwhite.svg";
import logoMoon from "@/assets/moonwhite.svg";
import logoSunshine from "@/assets/sunshinewhite.svg";

type FooterSettings = {
  businessName: string;
  supportEmail: string;
  whatsappNumber: string;
  instagramUrl: string;
  footerHeading: string;
  footerAccent: string;
  footerCopyright: string;
  footerHelpLinks: Array<{ label: string; to: string }>;
  footerShopLinks: Array<{ label: string; to: string }>;
};

type FooterTheme = "store" | "moon" | "sunshine" | "men";

const SHOP_LINKS = [
  { to: "/tienda", label: "Tienda" },
  { to: "/moon", label: "Moon" },
  { to: "/sunshine", label: "Sunshine" },
  { to: "/men", label: "Men" },
] as const;

const HELP_LINKS = [
  { to: "/contacto", label: "Contacto" },
  { to: "/politicas", label: "Politicas y privacidad" },
] as const;

const FOOTER_THEMES: Record<
  FooterTheme,
  {
    accent: string;
    badge: string;
    bg: string;
    border: string;
    icon: string;
    logo: string;
    spacing: string;
    text: string;
    textSoft: string;
  }
> = {
  store: {
    accent: "Solicitudes por WhatsApp",
    badge: "General",
    bg: "bg-[#171111]",
    border: "border-[#171111]",
    icon: "bg-[#f6efe7]/10 hover:bg-[#f6efe7]/20",
    logo: logoGeneral,
    spacing: "mt-16",
    text: "text-[#f6efe7]",
    textSoft: "text-[#f6efe7]/72",
  },
  moon: {
    accent: "Solicitudes por WhatsApp",
    badge: "Moon",
    bg: "bg-[var(--color-background)]",
    border: "border-[var(--color-foreground)]",
    icon: "bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.1)] hover:bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.18)]",
    logo: logoMoon,
    spacing: "mt-0",
    text: "text-[var(--color-foreground)]",
    textSoft: "text-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.72)]",
  },
  sunshine: {
    accent: "Solicitudes por WhatsApp",
    badge: "Sunshine",
    bg: "bg-[var(--color-foreground)]",
    border: "border-[#ff4ea3]",
    icon: "bg-[color:rgb(from_var(--color-background)_r_g_b_/_0.12)] hover:bg-[color:rgb(from_var(--color-background)_r_g_b_/_0.2)]",
    logo: logoSunshine,
    spacing: "mt-16",
    text: "text-[var(--color-background)]",
    textSoft: "text-[color:rgb(from_var(--color-background)_r_g_b_/_0.72)]",
  },
  men: {
    accent: "Solicitudes por WhatsApp",
    badge: "Men",
    bg: "bg-[#111111]",
    border: "border-[#8f2015]",
    icon: "bg-[#f2e9e1]/10 hover:bg-[#f2e9e1]/18",
    logo: logoMen,
    spacing: "mt-16",
    text: "text-[#f2e9e1]",
    textSoft: "text-[#f2e9e1]/72",
  },
};

function getFooterTheme(pathname: string): FooterTheme {
  if (pathname.startsWith("/moon")) return "moon";
  if (pathname.startsWith("/sunshine")) return "sunshine";
  if (pathname.startsWith("/men")) return "men";
  return "store";
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.62 2 2.22 6.4 2.22 11.81c0 1.73.45 3.43 1.31 4.93L2 22l5.42-1.5a9.8 9.8 0 0 0 4.61 1.17h.01c5.41 0 9.81-4.4 9.81-9.81 0-2.62-1.02-5.08-2.8-6.95Zm-7.02 15.1h-.01a8.1 8.1 0 0 1-4.12-1.13l-.29-.17-3.21.89.86-3.13-.19-.32a8.14 8.14 0 0 1-1.24-4.34c0-4.49 3.66-8.15 8.16-8.15 2.18 0 4.23.85 5.77 2.39a8.1 8.1 0 0 1 2.38 5.77c0 4.49-3.66 8.15-8.14 8.15Zm4.47-6.11c-.24-.12-1.41-.69-1.63-.77-.22-.08-.38-.12-.54.12-.16.24-.61.77-.75.92-.14.16-.28.18-.52.06-.24-.12-1-.37-1.9-1.19-.7-.62-1.17-1.39-1.31-1.62-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.68 2.56 4.08 3.59.57.24 1.02.38 1.37.49.58.18 1.11.15 1.53.09.47-.07 1.41-.58 1.61-1.13.2-.55.2-1.02.14-1.13-.06-.11-.22-.18-.46-.3Z" />
    </svg>
  );
}

export function Footer({
  settings,
  themeOverride,
}: {
  settings?: Partial<FooterSettings>;
  themeOverride?: FooterTheme;
}) {
  const location = useLocation();
  const themeKey = themeOverride ?? getFooterTheme(location.pathname);
  const theme = FOOTER_THEMES[themeKey];
  const resolvedSettings: FooterSettings = {
    businessName: "Pulpiña RD",
    supportEmail: "hola@pulpina.do",
    whatsappNumber: "18095550199",
    instagramUrl: "https://instagram.com/pulpina.rd",
    footerHeading: "Pulpiña RD",
    footerAccent: "Solicitudes por WhatsApp",
    footerCopyright: "© {year} Pulpiña RD.",
    footerShopLinks: [...SHOP_LINKS],
    footerHelpLinks: [...HELP_LINKS],
    ...settings,
  };
  const footerHeading = resolvedSettings.footerHeading.replaceAll("Pulpina", "Pulpiña");
  const footerCopyright = resolvedSettings.footerCopyright
    .replaceAll("(c)", "©")
    .replaceAll("Pulpina", "Pulpiña")
    .replace("{year}", String(new Date().getFullYear()));
  const whatsappHref = `https://wa.me/${resolvedSettings.whatsappNumber}`;

  return (
    <footer className={`${theme.spacing} overflow-hidden border-t-2 ${theme.border} ${theme.bg} ${theme.text}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <div className="flex h-16 items-center overflow-hidden">
            <img src={theme.logo} alt={theme.badge} className="h-16 w-auto max-w-[220px] object-contain" />
          </div>
          <div className="mt-3 font-display text-2xl sm:text-3xl">{footerHeading}</div>
        </div>

        <div>
          <div className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${theme.textSoft}`}>Tienda</div>
          <ul className="space-y-1.5 text-sm">
            {resolvedSettings.footerShopLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="transition hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${theme.textSoft}`}>Ayuda</div>
          <ul className="space-y-1.5 text-sm">
            {resolvedSettings.footerHelpLinks
              .filter((link) => link.to !== "/solicitud")
              .map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="transition hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        <div>
          <div className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${theme.textSoft}`}>Contactanos</div>
          <div className="flex gap-2">
            <a
              href={resolvedSettings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-full p-2 transition ${theme.icon}`}
              aria-label="Instagram"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-full p-2 transition ${theme.icon}`}
              aria-label="WhatsApp"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          </div>
          <p className={`mt-4 text-xs ${theme.textSoft}`}>{resolvedSettings.footerAccent || theme.accent}</p>
          <p className={`mt-2 text-xs ${theme.textSoft}`}>{footerCopyright}</p>
        </div>
      </div>
    </footer>
  );
}
