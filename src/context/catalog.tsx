import { createContext, useContext, type ReactNode } from "react";
import type { Product } from "@/data/products";

const CatalogContext = createContext<Product[]>([]);

export function CatalogProvider({
  children,
  products,
}: {
  children: ReactNode;
  products: Product[];
}) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}

export function useCatalogProducts() {
  return useContext(CatalogContext);
}

export function useCatalogProductBySlug(slug: string) {
  return useCatalogProducts().find((product) => product.slug === slug) ?? null;
}
