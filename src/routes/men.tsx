import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { validateCatalogSearch } from "@/lib/store-filters";
import logo from "@/assets/logo-men.png";
import mood from "@/assets/mood-men.jpg";

export const Route = createFileRoute("/men")({
  validateSearch: validateCatalogSearch,
  head: () => ({ meta: [{ title: "Pulpina Men - Punk - Underground" }] }),
  component: MenPage,
});

function MenPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/men", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "men",
        title: "Men",
        tagline: "Punk - Studded - Distressed",
        intro:
          "Cuero, puas, parches y actitud. Streetwear alternativo para los que escuchan a los sin voz.",
        bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a 60%,#3a0a0a)",
        logo,
        mood,
      }}
    />
  );
}
