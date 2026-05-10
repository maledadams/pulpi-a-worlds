import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { Lightning, Skull } from "@/components/ui/Decor";
import logo from "@/assets/logo-men.png";
import mood from "@/assets/mood-men.jpg";

export const Route = createFileRoute("/men")({
  head: () => ({ meta: [{ title: "Pulpiña Men — Punk · Underground" }] }),
  component: () => (
    <VibePage
      cfg={{
        vibe: "men",
        title: "Men",
        tagline: "Punk · Studded · Distressed",
        intro: "Cuero, púas, parches y actitud. Streetwear alternativo para los que escuchan a los sin voz.",
        bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a 60%,#3a0a0a)",
        logo,
        mood,
        decor: (
          <>
            <Lightning className="absolute top-2 right-0 h-14 w-14 text-primary" />
            <Skull className="absolute bottom-0 left-0 h-14 w-14 text-foreground/70" />
          </>
        ),
      }}
    />
  ),
});
