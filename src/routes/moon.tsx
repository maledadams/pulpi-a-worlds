import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { VibePage } from "@/components/collections/VibePage";
import { getStorefrontSettings } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import logo from "@/assets/logo-moon.png";
import mood from "@/assets/mood-moon.jpg";

export const Route = createFileRoute("/moon")({
  ssr: false,
  loader: async () => ({ settings: await getStorefrontSettings() }),
  validateSearch: validateCatalogSearch,
  head: () => ({ meta: [{ title: "Pulpiña Moon - Romance gotico" }] }),
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
        bg: "linear-gradient(135deg,#0a0408,#2a0a14 60%,#5a0a14)",
        logo,
        mood,
      }}
    />
  );
}
