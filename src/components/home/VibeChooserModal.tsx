import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";
import logoMen from "@/assets/logo-men.png";
import logoMoon from "@/assets/logo-moon.png";
import logoSun from "@/assets/logo-sunshine.png";

const STORAGE_KEY = "pulpina_vibe_chooser_seen";

const OPTIONS = [
  {
    to: "/sunshine" as const,
    name: "Pulpiña Sunshine",
    tag: "Kawaii · Y2K · Glossy",
    logo: logoSun,
    bg: "linear-gradient(135deg,#ff8fc9,#ffe66a 60%,#c5f56a)",
  },
  {
    to: "/men" as const,
    name: "Pulpiña Men",
    tag: "Punk · Underground",
    logo: logoMen,
    bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a 60%,#3a0a0a)",
  },
  {
    to: "/moon" as const,
    name: "Pulpiña Moon",
    tag: "Romance gótico",
    logo: logoMoon,
    bg: "linear-gradient(135deg,#0a0408,#2a0a14 60%,#5a0a14)",
  },
];

export function VibeChooserModal() {
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loc.pathname !== "/") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 350);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [loc.pathname]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border-2 border-foreground bg-background shadow-2xl overflow-hidden">
        <button
          onClick={close}
          aria-label="Cerrar"
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-foreground text-background hover:scale-110 transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-8 pb-4 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-widest border-2 border-foreground">
            Bienvenid@ a Pulpiña
          </span>
          <h2 className="mt-3 font-display text-3xl md:text-4xl">Elige tu vibe</h2>
          <p className="mt-1 text-sm text-muted-foreground">¿Qué vibe quieres explorar hoy?</p>
        </div>

        <div className="px-6 grid sm:grid-cols-3 gap-3">
          {OPTIONS.map((o) => (
            <Link
              key={o.to}
              to={o.to}
              onClick={close}
              className="group sticker rounded-2xl border-2 border-foreground overflow-hidden bg-card"
            >
              <div className="aspect-square relative" style={{ background: o.bg }}>
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={o.logo}
                    alt={o.name}
                    className="max-h-full max-w-[85%] object-contain drop-shadow-2xl group-hover:scale-105 transition"
                  />
                </div>
              </div>
              <div className="p-3 text-center">
                <div className="font-display text-base leading-tight">{o.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                  {o.tag}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="px-6 py-6 text-center">
          <button
            onClick={close}
            className="text-sm font-semibold underline underline-offset-4 hover:text-accent transition"
          >
            No, quiero seguir en la tienda →
          </button>
        </div>
      </div>
    </div>
  );
}
