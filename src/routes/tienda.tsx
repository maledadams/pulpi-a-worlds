import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { useCatalogProducts } from "@/context/catalog";
import { validateCatalogSearch } from "@/lib/store-filters";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  createSeoHead,
} from "@/lib/seo";

const TIENDA_DESCRIPTION =
  "Catálogo completo de Pulpiña RD: ropa, calzado y accesorios de moda alternativa para todos los géneros, con las secciones Moon, Sunshine y Men.";

export const Route = createFileRoute("/tienda")({
  validateSearch: validateCatalogSearch,
  head: () => ({
    ...createSeoHead({
      pageName: "Tienda",
      path: "/tienda",
      description: TIENDA_DESCRIPTION,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildCollectionPageJsonLd({
            name: "Tienda",
            path: "/tienda",
            description: TIENDA_DESCRIPTION,
          }),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildBreadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Tienda", path: "/tienda" },
          ]),
        ),
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
