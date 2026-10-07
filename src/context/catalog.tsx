import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Product } from "@/data/products";
import { useIsVerifiedAdult } from "@/lib/age-verification";
import { isNsfwProduct } from "@/lib/store-filters";

const CatalogContext = createContext<Product[]>([]);

export function CatalogProvider({
  children,
  products,
}: {
  children: ReactNode;
  products: Product[];
}) {
  // Adult-category products only exist for visitors who said they are 18+.
  // Everything downstream (listings, menus, search, cart) reads this list.
  const isAdult = useIsVerifiedAdult();
  const visible = useMemo(
    () => (isAdult ? products : products.filter((product) => !isNsfwProduct(product))),
    [isAdult, products],
  );
  return <CatalogContext.Provider value={visible}>{children}</CatalogContext.Provider>;
}

export function useCatalogProducts() {
  return useContext(CatalogContext);
}

export function useCatalogProductBySlug(slug: string) {
  return useCatalogProducts().find((product) => product.slug === slug) ?? null;
}
