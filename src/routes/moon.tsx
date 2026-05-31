import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { validateCatalogSearch } from "@/lib/store-filters";
import logo from "@/assets/logo-moon.png";
import mood from "@/assets/mood-moon.jpg";

export const Route = createFileRoute("/moon")({
  validateSearch: validateCatalogSearch,
  head: () => ({ meta: [{ title: "Pulpina Moon - Romance gotico" }] }),
  component: MoonPage,
});

function MoonPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/moon", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "moon",
        title: "Moon",
        tagline: "Gotico - Eerie - Antique",
        intro:
          "Romance oscuro. Encajes, rosas marchitas, candelabros y un tercer ojo siempre abierto.",
        bg: "linear-gradient(135deg,#0a0408,#2a0a14 60%,#5a0a14)",
        logo,
        mood,
      }}
    />
  );
}
