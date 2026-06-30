import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { getStorefrontSettings } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import { createSeoHead } from "@/lib/seo";
import logo from "@/assets/logo-men.png";
import mood from "@/assets/mood-men.jpg";

export const Route = createFileRoute("/men")({
  loader: async () => ({ settings: await getStorefrontSettings() }),
  validateSearch: validateCatalogSearch,
  head: ({ loaderData }) => createSeoHead({
    pageName: "Men",
    path: "/men",
    description: loaderData?.settings.menPageIntro,
  }),
  component: MenPage,
});

function MenPage() {
  const search = Route.useSearch();
  const { settings } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/men", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "men",
        title: "Men",
        tagline: settings.menPageTagline,
        intro: settings.menPageIntro,
        catalogHeading: settings.vibeCatalogHeading,
        heroBorderClassName: "border-[#8f2015]",
        heroWaveColor: "#8f2015",
        searchPlaceholderClassName: "placeholder:text-[#8d8d8d]",
        bg: "linear-gradient(135deg,#0a0a0a,#1a1a1a 60%,#3a0a0a)",
        logo,
        mood,
      }}
    />
  );
}
