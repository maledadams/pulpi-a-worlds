import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { validateCatalogSearch } from "@/lib/store-filters";

export const Route = createFileRoute("/tienda")({
  ssr: false,
  validateSearch: validateCatalogSearch,
  head: () => ({
    meta: [
      { title: "Tienda - Pulpiña RD" },
      {
        name: "description",
        content: "Explora toda la coleccion Pulpina: Moon, Sunshine, Men y mas.",
      },
    ],
  }),
  component: Tienda,
});

function Tienda() {
  const products = useCatalogProducts();
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="py-10">
      <div className="mx-auto mb-6 max-w-7xl px-4 md:hidden">
        <h1 className="text-4xl">Tienda</h1>
      </div>
      <div className="mb-6 hidden h-[60px] md:block" aria-hidden="true" />

      <div id="shop">
        <CatalogBrowser
          products={products}
          search={search}
          onSearchChange={(next) => navigate({ to: "/tienda", search: next, replace: true, resetScroll: false })}
          mode="sidebar"
          tone="store"
          soldOutMode="standard"
          showDepartmentFilter
          departmentTitle="Tienda"
          enableNsfwGate
          resetFiltersOnQuery
          wideResults
          wideResultsTitle="Tienda"
        />
      </div>
    </div>
  );
}
