import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";

const LINKS = {
  shop: [
    { to: "/tienda", label: "Tienda" },
    { to: "/moon", label: "Moon" },
    { to: "/sunshine", label: "Sunshine" },
    { to: "/men", label: "Men" },
  ],
  help: [
    { to: "/contacto", label: "Contáctanos" },
    { to: "/politicas", label: "Envíos y devoluciones" },
    { to: "/politicas", label: "Privacidad" },
  ],
};

export function Footer() {
  return (
    <footer className="mt-16 border-t border-foreground/10">
      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="font-display text-2xl">Pulpiña RD</div>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Moda alternativa dominicana. Tres mundos, una marca: Moon, Sunshine y Men.
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground transition hover:border-foreground hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="mailto:hola@pulpina.do"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 text-muted-foreground transition hover:border-foreground hover:text-foreground"
                aria-label="Email"
              >
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Shop
            </p>
            <ul className="space-y-2">
              {LINKS.shop.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help links */}
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Ayuda
            </p>
            <ul className="space-y-2">
              {LINKS.help.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-foreground/8 px-4 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <span>© {new Date().getFullYear()} Pulpiña RD. Hecho en República Dominicana.</span>
          <span>Pagos seguros con AZUL · SSL</span>
        </div>
      </div>
    </footer>
  );
}
