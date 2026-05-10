import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { Heart, Sparkle } from "@/components/ui/Decor";
import logo from "@/assets/logo-sunshine.png";
import mood from "@/assets/mood-sunshine.jpg";

export const Route = createFileRoute("/sunshine")({
  head: () => ({ meta: [{ title: "Pulpiña Sunshine — Prendas de otro mundo" }] }),
  component: () => (
    <VibePage
      cfg={{
        vibe: "sunshine",
        title: "Sunshine",
        tagline: "Kawaii · Y2K · Glossy",
        intro: "Rosa bubblegum, leopardo, perlas y mucho brillo. Para princesas alternativas de otro mundo.",
        bg: "linear-gradient(135deg,#ff8fc9,#ffe66a 60%,#c5f56a)",
        logo,
        mood,
        decor: (
          <>
            <Heart className="absolute top-2 right-2 h-14 w-14 text-primary" />
            <Sparkle className="absolute bottom-2 left-2 h-12 w-12 text-accent" />
          </>
        ),
      }}
    />
  ),
});
