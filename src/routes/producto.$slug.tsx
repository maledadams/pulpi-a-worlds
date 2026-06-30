import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product/ProductCard";
import { useCatalogProducts } from "@/context/catalog";
import { useCart } from "@/context/cart";
import { formatPrice, type Product } from "@/data/products";
import { useVibe } from "@/hooks/use-vibe";
import { getStorefrontProductBySlug } from "@/lib/catalog";
import { buildProductColorRecord, normalizeProductColorName } from "@/lib/product-colors";
import { absoluteSiteUrl, createSeoHead, SITE_NAME } from "@/lib/seo";

export const Route = createFileRoute("/producto/$slug")({
  loader: async ({ params }) => {
    const product = await getStorefrontProductBySlug({ data: { slug: params.slug } });
    if (!product) throw notFound();

    return { product };
  },
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    if (!product) return {};
    const seo = createSeoHead({
      pageName: product.name,
      path: `/producto/${params.slug}`,
      description: product.description,
      type: "product",
    });
    return {
      ...seo,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            url: absoluteSiteUrl(`/producto/${params.slug}`),
            brand: { "@type": "Brand", name: SITE_NAME },
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: product.currencyCode,
              availability: product.available
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url: absoluteSiteUrl(`/producto/${params.slug}`),
            },
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-5xl">Producto no encontrado</h1>
      <Link to="/tienda" className="mt-4 inline-block underline underline-offset-4">
        Volver a la tienda
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
  component: ProductPage,
});

const RELATED_PRODUCT_COUNT = 6;

function getProductCategorySet(entry: Product) {
  return new Set([entry.category, ...(entry.categories ?? [])].map((value) => value.trim().toLowerCase()));
}

function getProductSizeSet(entry: Product) {
  const sizes = entry.sizes ?? entry.options.find((option) => option.name === "Talla")?.values ?? [];
  return new Set(sizes.map((value) => value.trim().toLowerCase()));
}

function getProductColorSet(entry: Product) {
  const colors =
    entry.colors?.map((color) => color.name) ??
    entry.options.find((option) => option.name === "Color")?.values ??
    [];
  return new Set(colors.map((value) => normalizeProductColorName(value)));
}

function countSharedValues(left: Set<string>, right: Set<string>) {
  let total = 0;
  for (const value of left) {
    if (right.has(value)) total += 1;
  }
  return total;
}

function createStableRank(seed: string, candidateId: string) {
  const value = `${seed}:${candidateId}`;
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getMoreFromThisVibeProducts(product: Product, products: Product[]) {
  const sameVibeProducts = products.filter((entry) => entry.vibe === product.vibe && entry.id !== product.id);
  if (sameVibeProducts.length <= RELATED_PRODUCT_COUNT) {
    return sameVibeProducts.slice(0, RELATED_PRODUCT_COUNT);
  }

  const productCategories = getProductCategorySet(product);
  const productSizes = getProductSizeSet(product);
  const productColors = getProductColorSet(product);

  const ranked = sameVibeProducts
    .map((entry) => {
      const categoryMatches = countSharedValues(productCategories, getProductCategorySet(entry));
      const sizeMatches = countSharedValues(productSizes, getProductSizeSet(entry));
      const colorMatches = countSharedValues(productColors, getProductColorSet(entry));
      const sharedAspectCount = categoryMatches + sizeMatches + colorMatches;

      return {
        entry,
        sharedAspectCount,
        stableRank: createStableRank(product.id, entry.id),
      };
    })
    .sort((left, right) => {
      if (right.sharedAspectCount !== left.sharedAspectCount) {
        return right.sharedAspectCount - left.sharedAspectCount;
      }
      return left.stableRank - right.stableRank;
    });

  const selected: Product[] = [];
  const selectedIds = new Set<string>();

  for (const minimumMatches of [3, 2, 1]) {
    for (const candidate of ranked) {
      if (candidate.sharedAspectCount < minimumMatches || selectedIds.has(candidate.entry.id)) continue;
      selected.push(candidate.entry);
      selectedIds.add(candidate.entry.id);
      if (selected.length === RELATED_PRODUCT_COUNT) return selected;
    }
  }

  for (const candidate of ranked) {
    if (selectedIds.has(candidate.entry.id)) continue;
    selected.push(candidate.entry);
    selectedIds.add(candidate.entry.id);
    if (selected.length === RELATED_PRODUCT_COUNT) break;
  }

  return selected.slice(0, RELATED_PRODUCT_COUNT);
}

function ProductPage() {
  const { product } = Route.useLoaderData() as {
    product: Product;
  };
  const products = useCatalogProducts();
  const cart = useCart();

  useVibe(product.vibe);

  const galleryImages =
    product.images.length > 0 ? product.images : product.featuredImage ? [product.featuredImage] : [];
  const sizes = product.sizes ?? product.options.find((option) => option.name === "Talla")?.values ?? ["Unica"];
  const rawColors =
    product.colors ??
    (product.options.find((option) => option.name === "Color")?.values ?? ["Unica"]).map((name, index) => ({
      name,
      hex: product.swatch[index % product.swatch.length],
    }));
  const colors = rawColors.map((entry) => buildProductColorRecord(entry.name, entry.hex));

  const [size, setSize] = useState(sizes[0]);
  const [color, setColor] = useState(colors[0]?.name ?? "Unica");
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) =>
        variant.selectedOptions.every((option) => {
          if (option.name === "Talla") return option.value === size;
          if (option.name === "Color") return normalizeProductColorName(option.value) === color;
          return true;
        }),
      ) ?? product.variants[0],
    [color, product.variants, size],
  );

  const onSale =
    typeof selectedVariant?.compareAtPrice === "number" && selectedVariant.compareAtPrice > selectedVariant.price;
  const related = useMemo(() => getMoreFromThisVibeProducts(product, products), [product, products]);
  const currentImage = galleryImages[imageIndex] ?? null;
  const averageLuma =
    product.swatch
      .map((hex) => {
        const clean = hex.replace("#", "");
        const normalized = clean.length === 3 ? clean.split("").map((char) => `${char}${char}`).join("") : clean;
        const value = Number.parseInt(normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      })
      .reduce((total, value) => total + value, 0) / product.swatch.length;
  const arrowToneClass = averageLuma < 140 ? "text-white" : "text-black";

  return (
    <div
      className={`mx-auto max-w-[86rem] px-4 py-10 ${
        product.vibe === "pulpina"
          ? "product-page-shell"
          : product.vibe === "moon"
            ? "moon-product-page-shell"
            : ""
      }`}
    >
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
        <div>
          <div
            className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-foreground/20 grain"
            style={{ background: `linear-gradient(135deg, ${product.swatch[0]}, ${product.swatch[1]})` }}
          >
            {currentImage ? (
              <img
                src={currentImage.url}
                alt={currentImage.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="select-none font-display text-[8rem] leading-none text-foreground/70 mix-blend-multiply md:text-[10rem]">
                {product.name
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word[0]?.toUpperCase())
                  .join("")}
              </span>
            )}
            {galleryImages.length > 1 ? (
              <>
                <button
                  onClick={() => setImageIndex((current) => (current === 0 ? galleryImages.length - 1 : current - 1))}
                  className={`absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-black/20 p-2 transition hover:bg-black/35 ${arrowToneClass}`}
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setImageIndex((current) => (current === galleryImages.length - 1 ? 0 : current + 1))}
                  className={`absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-black/20 p-2 transition hover:bg-black/35 ${arrowToneClass}`}
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
          {galleryImages.length > 1 ? (
            <div className={`mt-3 flex items-center justify-center text-sm font-black uppercase ${arrowToneClass}`}>
              <span className="text-[10px] tracking-[0.24em] opacity-80">
                {imageIndex + 1} / {galleryImages.length}
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex h-full flex-col">
          <h1 className="text-4xl md:text-5xl">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            {onSale ? (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(selectedVariant.compareAtPrice!, selectedVariant.currencyCode)}
              </span>
            ) : null}
            <span className="text-3xl font-bold">{formatPrice(selectedVariant.price, selectedVariant.currencyCode)}</span>
          </div>
          <p className="mt-4 text-muted-foreground">{product.description}</p>
          <div
            className={`mt-3 inline-flex w-fit self-start px-3 py-1 text-xs font-bold ${
              selectedVariant.available ? "bg-[#c5f56a] text-[#243011]" : "bg-muted text-muted-foreground"
            }`}
          >
            {selectedVariant.available
              ? `Disponible · ${selectedVariant.quantityAvailable ?? 0} en stock`
              : "Agotado"}
          </div>

          <div className="mt-3 flex min-h-0 flex-1 flex-col">
            <div className="my-auto py-4">
              <div>
                <div className="mb-2 text-sm font-bold uppercase">Tallas</div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((entry) => (
                    <button
                      key={entry}
                      onClick={() => setSize(entry)}
                      className={`rounded-full border border-foreground/20 px-4 py-2 text-sm font-bold ${
                        size === entry ? "bg-foreground text-background" : "bg-card"
                      }`}
                    >
                      {entry}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-2 text-sm font-bold uppercase">Colores</div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((entry) => (
                    <button
                      key={entry.name}
                      onClick={() => setColor(entry.name)}
                      className={`flex items-center gap-2 rounded-full border border-foreground/20 px-3 py-2 text-sm font-bold ${
                        color === entry.name ? "bg-foreground text-background" : "bg-card"
                      }`}
                    >
                      <span className="ui-circle h-3 w-3 border" style={{ background: entry.hex }} /> {entry.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="ui-quantity-pill flex items-center overflow-hidden border border-foreground/20">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2">
                  -
                </button>
                <span className="px-2 font-bold">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2">
                  +
                </button>
              </div>
              <button
                disabled={!selectedVariant.available}
                onClick={() =>
                  void cart.add({
                    variantId: selectedVariant.id,
                    quantity: qty,
                  })
                }
                className={`flex-1 rounded-full border border-foreground/20 px-6 py-3 font-bold uppercase disabled:opacity-50 ${
                  product.vibe === "men"
                    ? "bg-[#8f2015] text-[#fff7f2]"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                Agregar al carrito
              </button>
            </div>
          </div>

        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16">
          <div className="mb-4">
            <h2 className="text-3xl md:text-4xl">Mas De Esta Vibra</h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((entry) => (
              <ProductCard key={entry.id} product={entry} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
