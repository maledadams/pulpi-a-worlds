import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import logo from "@/assets/logo-pulpina.png";

export const Route = createFileRoute("/pulpina")({
  head: () => ({ meta: [{ title: "Pulpiña — Línea principal" }] }),
  component: () => (
    <VibePage
      cfg={{
        vibe: "pulpina",
        title: "Pulpiña",
        tagline: "El centro del universo",
        intro: "La línea madre. Mezcla de todas las vibras: alternativa, juguetona, expresiva.",
        bg: "linear-gradient(135deg,#ffd6ea,#fff3b0,#c5f56a)",
        logo,
        mood: null,
        decor: <><span className="absolute -top-6 left-2 text-5xl">✦</span><span className="absolute bottom-0 right-2 text-5xl">🐙</span></>,
      }}
    />
  ),
});
