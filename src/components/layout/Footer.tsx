import { Link, useLocation } from "@tanstack/react-router";
import { Instagram, MessageCircle } from "lucide-react";
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
  { to: "/contacto", label: "Contactanos" },
  { to: "/politicas", label: "Politicas y privacidad" },
] as const;

const FOOTER_THEMES: Record<
  FooterTheme,
  {
    accent: string;
    badge: string;
    bg: string;
    border: string;
    divider: string;
    icon: string;
    logo: string;
    text: string;
    textSoft: string;
  }
> = {
  store: {
    accent: "Solicitudes por WhatsApp",
    badge: "General",
    bg: "bg-[#171111]",
    border: "border-[#171111]",
    divider: "border-[#f6efe7]/20",
    icon: "bg-[#f6efe7]/10 hover:bg-[#f6efe7]/20",
    logo: logoGeneral,
    text: "text-[#f6efe7]",
    textSoft: "text-[#f6efe7]/72",
  },
  moon: {
    accent: "Solicitudes por WhatsApp",
    badge: "Moon",
    bg: "bg-[var(--color-background)]",
    border: "border-[var(--color-foreground)]",
    divider: "border-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.18)]",
    icon: "bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.1)] hover:bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.18)]",
    logo: logoMoon,
    text: "text-[var(--color-foreground)]",
    textSoft: "text-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.72)]",
  },
  sunshine: {
    accent: "Solicitudes por WhatsApp",
    badge: "Sunshine",
    bg: "bg-[var(--color-background)]",
    border: "border-[var(--color-foreground)]",
    divider: "border-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.2)]",
    icon: "bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.1)] hover:bg-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.16)]",
    logo: logoSunshine,
    text: "text-[var(--color-foreground)]",
    textSoft: "text-[color:rgb(from_var(--color-foreground)_r_g_b_/_0.72)]",
  },
  men: {
    accent: "Solicitudes por WhatsApp",
    badge: "Men",
    bg: "bg-[#111111]",
    border: "border-[#8f2015]",
    divider: "border-[#f2e9e1]/18",
    icon: "bg-[#f2e9e1]/10 hover:bg-[#f2e9e1]/18",
    logo: logoMen,
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

export function Footer({
  settings,
  themeOverride,
}: {
  settings?: Partial<FooterSettings>;
  themeOverride?: FooterTheme;
}) {
  const location = useLocation();
  const theme = FOOTER_THEMES[themeOverride ?? getFooterTheme(location.pathname)];
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
    <footer className={`mt-20 border-t-2 ${theme.border} ${theme.bg} ${theme.text}`}>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="mt-4">
            <img src={theme.logo} alt={theme.badge} className="h-16 w-auto max-w-[220px] object-contain" />
          </div>
          <div className="mt-4 font-display text-2xl sm:text-3xl">{footerHeading}</div>
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
          <div className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${theme.textSoft}`}>Siguenos</div>
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
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>
          <p className={`mt-4 text-xs ${theme.textSoft}`}>{resolvedSettings.footerAccent || theme.accent}</p>
          <p className={`mt-2 text-xs ${theme.textSoft}`}>{footerCopyright}</p>
        </div>
      </div>
    </footer>
  );
}
