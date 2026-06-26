import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { getStorefrontSettings } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import logo from "@/assets/logo-sunshine.png";
import mood from "@/assets/mood-sunshine.jpg";

export const Route = createFileRoute("/sunshine")({
  ssr: false,
  loader: async () => ({ settings: await getStorefrontSettings() }),
  validateSearch: validateCatalogSearch,
  head: () => ({ meta: [{ title: "Pulpiña Sunshine - Prendas de otro mundo" }] }),
  component: SunshinePage,
});

function SunshinePage() {
  const search = Route.useSearch();
  const { settings } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/sunshine", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "sunshine",
        title: "Sunshine",
        tagline: settings.sunshinePageTagline,
        intro: settings.sunshinePageIntro,
        catalogHeading: settings.vibeCatalogHeading,
        heroBorderClassName: "border-[#ff4ea3]",
        searchPlaceholderClassName: "placeholder:text-[#dc72aa]",
        bg: "linear-gradient(135deg,#ff8fc9,#ffe66a 60%,#c5f56a)",
        logo,
        mood,
      }}
    />
  );
}
