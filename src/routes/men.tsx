import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
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
        decor: <><span className="absolute top-4 right-2 text-5xl">⛓️</span><span className="absolute bottom-2 left-0 text-5xl">🖤</span></>,
      }}
    />
  ),
});
