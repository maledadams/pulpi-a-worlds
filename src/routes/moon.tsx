import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import logo from "@/assets/logo-moon.png";
import mood from "@/assets/mood-moon.jpg";

export const Route = createFileRoute("/moon")({
  head: () => ({ meta: [{ title: "Pulpiña Moon — Romance gótico" }] }),
  component: () => (
    <VibePage
      cfg={{
        vibe: "moon",
        title: "Moon",
        tagline: "Gótico · Eerie · Antique",
        intro: "Romance oscuro. Encajes, rosas marchitas, candelabros y un tercer ojo siempre abierto.",
        bg: "linear-gradient(135deg,#0a0408,#2a0a14 60%,#5a0a14)",
        logo,
        mood,
        decor: <><span className="absolute top-4 left-0 text-5xl">🥀</span><span className="absolute bottom-0 right-2 text-5xl">🌑</span></>,
      }}
    />
  ),
});
