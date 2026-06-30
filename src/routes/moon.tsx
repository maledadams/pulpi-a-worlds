import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import logo from "@/assets/logo-moon.png";
import mood from "@/assets/mood-moon.jpg";
import { getStorefrontSettings } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/moon")({
  loader: async () => ({ settings: await getStorefrontSettings() }),
  validateSearch: validateCatalogSearch,
  head: ({ loaderData }) => createSeoHead({
    pageName: "Moon",
    path: "/moon",
    description: loaderData?.settings.moonPageIntro,
  }),
  component: MoonPage,
});

function MoonPage() {
  const search = Route.useSearch();
  const { settings } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <VibePage
      search={search}
      onSearchChange={(next) => navigate({ to: "/moon", search: next, replace: true, resetScroll: false })}
      cfg={{
        vibe: "moon",
        title: "Moon",
        tagline: settings.moonPageTagline,
        intro: settings.moonPageIntro,
        catalogHeading: settings.vibeCatalogHeading,
        catalogThemeVibe: "men",
        heroWaveColor: "#f3e8e6",
        searchPlaceholderClassName: "placeholder:text-[#8d8d8d]",
        bg: "linear-gradient(135deg,#0a0408,#2a0a14 60%,#5a0a14)",
        logo,
        mood,
      }}
    />
  );
}
