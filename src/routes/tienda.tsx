import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PRODUCTS } from "@/data/products";
import { validateCatalogSearch } from "@/lib/store-filters";

export const Route = createFileRoute("/tienda")({
  validateSearch: validateCatalogSearch,
  head: () => ({
    meta: [
      { title: "Tienda - Pulpina RD" },
      {
        name: "description",
        content: "Explora toda la coleccion Pulpina: Moon, Sunshine, Men y mas.",
      },
    ],
  }),
  component: Tienda,
});

function Tienda() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl md:text-6xl">Tienda</h1>
        <p className="mt-1 text-muted-foreground">
          Moon, Sunshine, Men y todo el catalogo en un solo lugar.
        </p>
      </div>

      <div id="shop">
        <CatalogBrowser
          products={PRODUCTS}
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
