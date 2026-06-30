import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { validateCatalogSearch } from "@/lib/store-filters";
import { createSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/tienda")({
  validateSearch: validateCatalogSearch,
  head: () => createSeoHead({
    pageName: "Tienda",
    path: "/tienda",
    description: "Catálogo de Pulpiña RD: Moon, Sunshine y Men.",
  }),
  component: Tienda,
});

function Tienda() {
  const products = useCatalogProducts();
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="pb-10 pt-5 sm:pt-6">
      <div id="shop">
        <CatalogBrowser
          products={products}
          search={search}
          onSearchChange={(next) => navigate({ to: "/tienda", search: next, replace: true, resetScroll: false })}
          mode="sidebar"
          tone="store"
          soldOutMode="standard"
          showDepartmentFilter
          departmentTitle="Subtienda"
          enableNsfwGate
          resetFiltersOnQuery
          wideResults
        />
      </div>
    </div>
  );
}
