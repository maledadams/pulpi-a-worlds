import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/cart";
import logo from "@/assets/logo-pulpina.png";

const NAV = [
  { to: "/", label: "Inicio" },
  { to: "/tienda", label: "Tienda" },
  { to: "/pulpina", label: "Pulpiña" },
  { to: "/men", label: "Men" },
  { to: "/moon", label: "Moon" },
  { to: "/sunshine", label: "Sunshine" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function Header() {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/95 backdrop-blur">
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
                className={`px-3 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide transition ${
                  active ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/tienda" className="p-2 rounded-full hover:bg-muted" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => cart.setOpen(true)}
            className="relative p-2 rounded-full hover:bg-muted"
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
            className="lg:hidden p-2 rounded-full hover:bg-muted"
            aria-label="Menú"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t-2 border-foreground bg-background">
          <div className="px-4 py-3 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg font-semibold uppercase text-sm hover:bg-muted"
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
