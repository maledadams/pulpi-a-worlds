import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { getStorefrontCollectionBySlug } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import { buildBreadcrumbJsonLd, createSeoHead } from "@/lib/seo";
import logoMoon from "@/assets/logo-moon.png";
import logoSunshine from "@/assets/logo-sunshine.png";
import logoMen from "@/assets/logo-men.png";

const VIBE_LOGO: Partial<Record<string, string>> = {
  moon: logoMoon,
  sunshine: logoSunshine,
  men: logoMen,
};

const VIBE_CRUMB: Record<string, { name: string; path: string }> = {
  moon: { name: "Moon", path: "/moon" },
  sunshine: { name: "Sunshine", path: "/sunshine" },
  men: { name: "Men", path: "/men" },
  store: { name: "Tienda", path: "/tienda" },
  pulpina: { name: "Tienda", path: "/tienda" },
};

export const Route = createFileRoute("/coleccion/$slug")({
  validateSearch: validateCatalogSearch,
  loader: async ({ params }) => {
    const collection = await getStorefrontCollectionBySlug({ data: { slug: params.slug } });
    if (!collection) throw notFound();
    return { collection };
  },
  head: ({ loaderData, params }) => {
    const collection = loaderData?.collection;
    if (!collection) return {};
    const seo = createSeoHead({
      pageName: collection.name,
      path: `/coleccion/${params.slug}`,
      description: collection.description || `Colección ${collection.name} de Pulpiña RD.`,
      image: VIBE_LOGO[collection.vibe],
    });
    const parentCrumb = VIBE_CRUMB[collection.vibe] ?? VIBE_CRUMB.store;
    return {
      ...seo,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              parentCrumb,
              { name: collection.name, path: `/coleccion/${params.slug}` },
            ]),
          ),
        },
      ],
    };
  },
  component: CollectionPage,
});

function CollectionPage() {
  const { collection } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const products = useCatalogProducts().filter((product) => collection.productIds.includes(product.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
          Coleccion
        </p>
        <h1 className="text-4xl md:text-6xl">{collection.name}</h1>
        {collection.description ? (
          <p className="mt-2 max-w-3xl text-muted-foreground">{collection.description}</p>
        ) : null}
      </div>

      <CatalogBrowser
        products={products}
        search={search}
        onSearchChange={(next) =>
          navigate({
            to: "/coleccion/$slug",
            params: { slug: collection.slug },
            search: next,
            replace: true,
            resetScroll: false,
          })
        }
        mode="sidebar"
        tone="store"
        soldOutMode="standard"
        showDepartmentFilter={collection.vibe === "store"}
        departmentTitle={collection.name}
        enableNsfwGate
      />
    </div>
  );
}
