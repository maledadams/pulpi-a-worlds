import { createFileRoute } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { Eye, Heart } from "@/components/ui/Decor";
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
        decor: (
          <>
            <Eye className="absolute top-2 left-0 h-14 w-14 text-primary" />
            <Heart className="absolute bottom-0 right-0 h-12 w-12 text-primary/80" />
          </>
        ),
      }}
    />
  ),
});
