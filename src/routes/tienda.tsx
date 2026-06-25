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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl md:text-6xl">Tienda</h1>
      </div>

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
        />
      </div>
    </div>
  );
}
