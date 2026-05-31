import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { validateCatalogSearch } from "@/lib/store-filters";
import logo from "@/assets/logo-sunshine.png";
import mood from "@/assets/mood-sunshine.jpg";

export const Route = createFileRoute("/sunshine")({
  validateSearch: validateCatalogSearch,
  head: () => ({ meta: [{ title: "Pulpina Sunshine - Prendas de otro mundo" }] }),
  component: SunshinePage,
});

function SunshinePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/sunshine", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "sunshine",
        title: "Sunshine",
        tagline: "Kawaii - Y2K - Glossy",
        intro:
          "Rosa bubblegum, leopardo, perlas y mucho brillo. Para princesas alternativas de otro mundo.",
        bg: "linear-gradient(135deg,#ff8fc9,#ffe66a 60%,#c5f56a)",
        logo,
        mood,
      }}
    />
  );
}
