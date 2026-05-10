import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-foreground bg-foreground text-background">
      <div className="overflow-hidden border-b-2 border-background/20 py-3">
        <div className="marquee whitespace-nowrap font-display text-2xl tracking-widest">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-6">PULPIÑA RD ✦ PRENDAS DE OTRO MUNDO ✦ </span>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 md:grid-cols-4">
        <div>
          <div className="font-display text-2xl">Pulpiña RD</div>
          <p className="mt-2 text-sm opacity-80">Marca dominicana de moda alternativa con cuatro universos de estilo.</p>
        </div>
        <div>
          <div className="font-bold uppercase text-xs mb-3 opacity-70">Universos</div>
          <ul className="space-y-1.5 text-sm">
            <li><Link to="/pulpina" className="hover:underline">Pulpiña</Link></li>
            <li><Link to="/men" className="hover:underline">Pulpiña Men</Link></li>
            <li><Link to="/moon" className="hover:underline">Pulpiña Moon</Link></li>
            <li><Link to="/sunshine" className="hover:underline">Pulpiña Sunshine</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold uppercase text-xs mb-3 opacity-70">Ayuda</div>
          <ul className="space-y-1.5 text-sm">
            <li><Link to="/contacto" className="hover:underline">Contáctanos</Link></li>
            <li><Link to="/politicas" className="hover:underline">Envíos & Devoluciones</Link></li>
            <li><Link to="/politicas" className="hover:underline">Privacidad</Link></li>
            <li><Link to="/admin" className="hover:underline">Admin (preview)</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold uppercase text-xs mb-3 opacity-70">Síguenos</div>
          <div className="flex gap-2">
            <a href="https://instagram.com" className="p-2 rounded-full bg-background/10 hover:bg-background/20"><Instagram className="h-5 w-5" /></a>
            <a href="mailto:hola@pulpina.do" className="p-2 rounded-full bg-background/10 hover:bg-background/20"><Mail className="h-5 w-5" /></a>
          </div>
          <p className="mt-4 text-xs opacity-60">© {new Date().getFullYear()} Pulpiña RD. Hecho con cariño en RD.</p>
        </div>
      </div>
    </footer>
  );
}
