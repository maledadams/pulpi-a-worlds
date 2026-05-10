import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag, Search, Menu, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/cart";
import logo from "@/assets/logo-pulpina.png";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

const VIBE_PILLS = [
  { to: "/pulpina" as const, label: "Pulpiña", emoji: "🐙", color: "var(--bubblegum)" },
  { to: "/men" as const, label: "Men", emoji: "🤘", color: "var(--blood)" },
  { to: "/moon" as const, label: "Moon", emoji: "🌹", color: "oklch(0.5 0.21 22)" },
  { to: "/sunshine" as const, label: "Sunshine", emoji: "🍓", color: "oklch(0.85 0.21 130)" },
];

const TICKER = [
  "🐙 Envío gratis sobre RD$3,500",
  "✦ Edición limitada Pulpiña Moon",
  "🍓 Nueva colección Sunshine Y2K",
  "🤘 Pulpiña Men · drop punk",
  "💌 Hecho en RD con amor alternativo",
];

export function Header() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-foreground text-background border-b-2 border-foreground overflow-hidden">
        <div className="flex whitespace-nowrap py-1.5 marquee text-xs font-bold uppercase tracking-widest">
          {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="px-6">{t}</span>
          ))}
        </div>
      </div>

      <div className="bg-background/95 backdrop-blur border-b-2 border-foreground">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 wobble">
            <img src={logo} alt="Pulpiña" className="h-10 w-10 object-contain" />
            <span className="font-display text-xl tracking-wide">Pulpiña RD</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            {NAV.map((n) => {
              const active = loc.pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide border-2 border-transparent transition ${
                    active ? "bg-foreground text-background border-foreground" : "hover:border-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/tienda" className="p-2 rounded-full border-2 border-transparent hover:border-foreground hover:bg-muted" aria-label="Buscar">
              <Search className="h-5 w-5" />
            </Link>
            <button
              onClick={() => cart.setOpen(true)}
              className="relative p-2 rounded-full border-2 border-transparent hover:border-foreground hover:bg-muted"
              aria-label="Carrito"
            >
              <ShoppingBag className="h-5 w-5" />
              {cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold bg-accent text-accent-foreground rounded-full h-5 min-w-5 px-1 flex items-center justify-center border-2 border-background">
                  {cart.count}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-full border-2 border-foreground bg-accent text-accent-foreground"
              aria-label="Menú"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="border-t-2 border-foreground bg-secondary">
          <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-2 overflow-x-auto">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
              <Sparkles className="h-3 w-3" /> Cambia tu vibra:
            </span>
            {VIBE_PILLS.map((v) => {
              const active = loc.pathname === v.to;
              return (
                <Link
                  key={v.to}
                  to={v.to}
                  className={`shrink-0 chunky px-3 py-1 rounded-full border-2 border-foreground text-xs font-bold uppercase tracking-wide ${
                    active ? "bg-foreground text-background" : "bg-card"
                  }`}
                  style={!active ? { background: `color-mix(in oklch, ${v.color} 25%, white)` } : undefined}
                >
                  <span className="mr-1">{v.emoji}</span>{v.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-b-2 border-foreground bg-background">
          <div className="px-4 py-3 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg font-bold uppercase text-sm hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
