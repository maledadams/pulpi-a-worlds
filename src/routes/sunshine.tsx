import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
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
        decor: <><span className="absolute top-2 right-4 text-5xl">💖</span><span className="absolute bottom-2 left-2 text-5xl">✨</span></>,
      }}
    />
  ),
});
