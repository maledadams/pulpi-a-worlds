import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { Star, OctopusMark } from "@/components/ui/Decor";
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
        decor: (
          <>
            <Star className="absolute -top-4 left-2 h-12 w-12 text-accent" />
            <OctopusMark className="absolute -bottom-4 right-0 h-14 w-14 text-foreground" />
          </>
        ),
      }}
    />
  ),
});
