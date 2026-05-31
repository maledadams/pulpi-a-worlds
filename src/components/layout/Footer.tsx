import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-foreground bg-foreground text-background">
      <div className="overflow-hidden border-b-2 border-background/20 py-3">
        <div className="marquee whitespace-nowrap font-display text-2xl tracking-widest">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-6">
              PULPINA RD * PRENDAS DE OTRO MUNDO *
            </span>
          ))}
        </div>
      </div>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-2xl">Pulpina RD</div>
          <p className="mt-2 text-sm opacity-80">
            Tienda dominicana de moda alternativa con vibes Moon, Sunshine y Men.
          </p>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase opacity-70">Shop</div>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link to="/tienda" className="hover:underline">
                Tienda
              </Link>
            </li>
            <li>
              <Link to="/moon" className="hover:underline">
                Moon
              </Link>
            </li>
            <li>
              <Link to="/sunshine" className="hover:underline">
                Sunshine
              </Link>
            </li>
            <li>
              <Link to="/men" className="hover:underline">
                Men
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase opacity-70">Ayuda</div>
          <ul className="space-y-1.5 text-sm">
            <li>
              <Link to="/contacto" className="hover:underline">
                Contactanos
              </Link>
            </li>
            <li>
              <Link to="/politicas" className="hover:underline">
                Envios y devoluciones
              </Link>
            </li>
            <li>
              <Link to="/politicas" className="hover:underline">
                Privacidad
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase opacity-70">Siguenos</div>
          <div className="flex gap-2">
            <a
              href="https://instagram.com"
              className="rounded-full bg-background/10 p-2 hover:bg-background/20"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="mailto:hola@pulpina.do"
              className="rounded-full bg-background/10 p-2 hover:bg-background/20"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
          <p className="mt-4 text-xs opacity-60">
            © {new Date().getFullYear()} Pulpina RD.
          </p>
        </div>
      </div>
    </footer>
  );
}
