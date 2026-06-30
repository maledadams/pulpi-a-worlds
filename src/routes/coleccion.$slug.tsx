import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { getStorefrontCollectionBySlug } from "@/lib/admin-content";
import { validateCatalogSearch } from "@/lib/store-filters";
import { createSeoHead } from "@/lib/seo";

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
    return createSeoHead({
      pageName: collection.name,
      path: `/coleccion/${params.slug}`,
      description: collection.description || `Colección ${collection.name} de Pulpiña RD.`,
    });
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
