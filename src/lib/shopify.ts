import { createServerFn } from "@tanstack/react-start";
import {
  getFallbackProductBySlug,
  getFallbackProducts,
  getFallbackProductsByVibe,
  type Cart,
  type CartLine,
  type Product,
  type ProductImage,
  type ProductVariant,
  type Vibe,
} from "@/data/products";

const DEFAULT_API_VERSION = "2026-04";

const VIBE_COLLECTIONS: Record<Vibe, string> = {
  pulpina: "pulpina-general",
  men: "pulpina-men",
  moon: "pulpina-moon",
  sunshine: "pulpina-sunshine",
};

const COLLECTION_TO_VIBE = Object.fromEntries(
  Object.entries(VIBE_COLLECTIONS).map(([vibe, handle]) => [handle, vibe as Vibe]),
) as Record<string, Vibe>;

const DEFAULT_SWATCHES: Record<Vibe, [string, string]> = {
  pulpina: ["#ffd6ea", "#c5f56a"],
  men: ["#0a0a0a", "#3a0a0a"],
  moon: ["#15080c", "#4a0e1c"],
  sunshine: ["#ff8fc9", "#ffe66a"],
};

type MoneyV2 = {
  amount: string;
  currencyCode: string;
};

type ProductNode = {
  id: string;
  title: string;
  handle: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  tags: string[];
  productType: string;
  createdAt: string;
  featuredImage: { url: string; altText: string | null } | null;
  images: {
    edges: Array<{ node: { url: string; altText: string | null } }>;
  };
  collections: {
    edges: Array<{ node: { handle: string } }>;
  };
  options: Array<{ name: string; values: string[] }>;
  priceRange: {
    minVariantPrice: MoneyV2;
  };
  compareAtPriceRange: {
    minVariantPrice: MoneyV2 | null;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        quantityAvailable: number | null;
        image: { url: string; altText: string | null } | null;
        price: MoneyV2;
        compareAtPrice: MoneyV2 | null;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
};

type CartNode = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: MoneyV2;
  };
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        merchandise:
          | {
              __typename: "ProductVariant";
              id: string;
              title: string;
              image: { url: string; altText: string | null } | null;
              price: MoneyV2;
              selectedOptions: Array<{ name: string; value: string }>;
              product: {
                title: string;
                handle: string;
              };
            }
          | { __typename: string };
      };
    }>;
  };
};

type ShopifyGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type CatalogResponse = {
  configured: boolean;
  products: Product[];
};

type ProductResponse = {
  configured: boolean;
  product: Product | null;
};

type CartResponse = {
  configured: boolean;
  cart: Cart | null;
};

function readEnvValue(name: string) {
  const processValue = process.env[name];
  if (typeof processValue === "string" && processValue.length > 0) {
    return processValue;
  }

  const importMetaEnv = (
    import.meta as ImportMeta & {
      env?: Record<string, string | undefined>;
    }
  ).env;
  const importMetaValue = importMetaEnv?.[name];
  if (typeof importMetaValue === "string" && importMetaValue.length > 0) {
    return importMetaValue;
  }

  return undefined;
}

function getShopifyConfig() {
  const storeDomain =
    readEnvValue("SHOPIFY_STORE_DOMAIN") ?? readEnvValue("VITE_SHOPIFY_STORE_DOMAIN");
  const storefrontToken =
    readEnvValue("SHOPIFY_STOREFRONT_ACCESS_TOKEN") ??
    readEnvValue("VITE_SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const apiVersion =
    readEnvValue("SHOPIFY_API_VERSION") ??
    readEnvValue("VITE_SHOPIFY_API_VERSION") ??
    DEFAULT_API_VERSION;

  if (!storeDomain || !storefrontToken) {
    return null;
  }

  return {
    storeDomain: storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    storefrontToken,
    apiVersion,
  };
}

async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>) {
  const config = getShopifyConfig();
  if (!config) {
    return { configured: false, data: null as T | null };
  }

  const response = await fetch(
    `https://${config.storeDomain}/api/${config.apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    throw new Error(`Shopify request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as ShopifyGraphQlResponse<T>;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return { configured: true, data: payload.data ?? null };
}

function moneyToNumber(money: MoneyV2 | null | undefined) {
  return money ? Number(money.amount) : null;
}

function mapImage(
  image: { url: string; altText: string | null } | null | undefined,
): ProductImage | null {
  if (!image?.url) return null;
  return {
    url: image.url,
    altText: image.altText ?? null,
  };
}

function hasTag(tags: string[], tag: string) {
  return tags.some((value) => value.trim().toLowerCase() === tag.toLowerCase());
}

function getTagValue(tags: string[], prefix: string) {
  const lowerPrefix = `${prefix.toLowerCase()}:`;
  const tag = tags.find((value) => value.toLowerCase().startsWith(lowerPrefix));
  return tag?.slice(prefix.length + 1).trim();
}

function parseSwatch(tags: string[], vibe: Vibe): [string, string] {
  const tagValue = getTagValue(tags, "swatch");
  if (!tagValue) return DEFAULT_SWATCHES[vibe];

  const parts = tagValue.split(",").map((value) => value.trim());
  if (parts.length !== 2 || parts.some((part) => !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(part))) {
    return DEFAULT_SWATCHES[vibe];
  }

  return [parts[0], parts[1]];
}

function resolveVibe(tags: string[], collectionHandles: string[]): Vibe {
  const taggedVibe = getTagValue(tags, "vibe");
  if (
    taggedVibe === "pulpina" ||
    taggedVibe === "men" ||
    taggedVibe === "moon" ||
    taggedVibe === "sunshine"
  ) {
    return taggedVibe;
  }

  for (const handle of collectionHandles) {
    const vibe = COLLECTION_TO_VIBE[handle];
    if (vibe) return vibe;
  }

  return "pulpina";
}

function isNewArrival(tags: string[], createdAt: string) {
  if (hasTag(tags, "new") || hasTag(tags, "new-arrival")) {
    return true;
  }

  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) return false;

  return Date.now() - createdAtMs <= 1000 * 60 * 60 * 24 * 45;
}

function mapProduct(node: ProductNode): Product {
  const collectionHandles = node.collections.edges.map((edge) => edge.node.handle);
  const vibe = resolveVibe(node.tags, collectionHandles);
  const variants: ProductVariant[] = node.variants.edges.map(({ node: variant }) => ({
    id: variant.id,
    title: variant.title,
    available: variant.availableForSale,
    quantityAvailable: variant.quantityAvailable,
    price: Number(variant.price.amount),
    compareAtPrice: moneyToNumber(variant.compareAtPrice),
    currencyCode: variant.price.currencyCode,
    image: mapImage(variant.image),
    selectedOptions: variant.selectedOptions,
  }));

  const availableVariant = variants.find((variant) => variant.available) ?? variants[0] ?? null;
  const stock = variants.reduce<number | null>((sum, variant) => {
    if (variant.quantityAvailable == null) return sum;
    return (sum ?? 0) + variant.quantityAvailable;
  }, 0);

  return {
    id: node.id,
    slug: node.handle,
    name: node.title,
    vibe,
    category: node.productType?.trim() || "General",
    description: node.description,
    descriptionHtml: node.descriptionHtml,
    price: availableVariant?.price ?? Number(node.priceRange.minVariantPrice.amount),
    compareAtPrice:
      availableVariant?.compareAtPrice ?? moneyToNumber(node.compareAtPriceRange.minVariantPrice),
    currencyCode: availableVariant?.currencyCode ?? node.priceRange.minVariantPrice.currencyCode,
    available: node.availableForSale,
    stock,
    featured: hasTag(node.tags, "featured"),
    newArrival: isNewArrival(node.tags, node.createdAt),
    tags: node.tags,
    swatch: parseSwatch(node.tags, vibe),
    images: node.images.edges.map((edge) => mapImage(edge.node)).filter(Boolean) as ProductImage[],
    featuredImage: mapImage(node.featuredImage),
    options: node.options.map((option) => ({
      name: option.name,
      values: option.values,
    })),
    variants,
    createdAt: node.createdAt,
  };
}

function mapCartLine(line: CartNode["lines"]["edges"][number]["node"]): CartLine | null {
  if (line.merchandise.__typename !== "ProductVariant") {
    return null;
  }

  return {
    id: line.id,
    quantity: line.quantity,
    merchandiseId: line.merchandise.id,
    title: line.merchandise.title,
    productTitle: line.merchandise.product.title,
    productHandle: line.merchandise.product.handle,
    image: mapImage(line.merchandise.image),
    price: Number(line.merchandise.price.amount),
    currencyCode: line.merchandise.price.currencyCode,
    selectedOptions: line.merchandise.selectedOptions,
  };
}

function mapCart(cart: CartNode): Cart {
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    totalQuantity: cart.totalQuantity,
    subtotal: Number(cart.cost.subtotalAmount.amount),
    currencyCode: cart.cost.subtotalAmount.currencyCode,
    lines: cart.lines.edges.map((edge) => mapCartLine(edge.node)).filter(Boolean) as CartLine[],
  };
}

function uniqProducts(products: Product[]) {
  return Array.from(new Map(products.map((product) => [product.id, product])).values());
}

const PRODUCT_FIELDS = `
  id
  title
  handle
  description
  descriptionHtml
  availableForSale
  tags
  productType
  createdAt
  featuredImage {
    url
    altText
  }
  images(first: 10) {
    edges {
      node {
        url
        altText
      }
    }
  }
  collections(first: 10) {
    edges {
      node {
        handle
      }
    }
  }
  options {
    name
    values
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  compareAtPriceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  variants(first: 100) {
    edges {
      node {
        id
        title
        availableForSale
        quantityAvailable
        image {
          url
          altText
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
`;

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount {
      amount
      currencyCode
    }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          __typename
          ... on ProductVariant {
            id
            title
            image {
              url
              altText
            }
            price {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            product {
              title
              handle
            }
          }
        }
      }
    }
  }
`;

export const getCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogResponse> => {
    const result = await shopifyFetch<{
      products: { edges: Array<{ node: ProductNode }> };
    }>(`
    query CatalogProducts {
      products(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            ${PRODUCT_FIELDS}
          }
        }
      }
    }
  `);

    if (!result.configured || !result.data) {
      return { configured: false, products: getFallbackProducts() };
    }

    return {
      configured: true,
      products: uniqProducts(result.data.products.edges.map((edge) => mapProduct(edge.node))),
    };
  },
);

export const getProductsByVibe = createServerFn({ method: "GET" })
  .inputValidator((data: { vibe: Vibe }) => data)
  .handler(async ({ data }): Promise<CatalogResponse> => {
    const handle = VIBE_COLLECTIONS[data.vibe];
    const result = await shopifyFetch<{
      collection: {
        products: { edges: Array<{ node: ProductNode }> };
      } | null;
    }>(
      `
        query CollectionProducts($handle: String!) {
          collection(handle: $handle) {
            products(first: 100, sortKey: CREATED_AT, reverse: true) {
              edges {
                node {
                  ${PRODUCT_FIELDS}
                }
              }
            }
          }
        }
      `,
      { handle },
    );

    if (!result.configured || !result.data) {
      return { configured: false, products: getFallbackProductsByVibe(data.vibe) };
    }

    const products =
      result.data.collection?.products.edges.map((edge) => mapProduct(edge.node)) ?? [];
    return {
      configured: true,
      products: uniqProducts(products),
    };
  });

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }): Promise<ProductResponse> => {
    const result = await shopifyFetch<{
      product: ProductNode | null;
    }>(
      `
        query ProductByHandle($handle: String!) {
          product(handle: $handle) {
            ${PRODUCT_FIELDS}
          }
        }
      `,
      { handle: data.slug },
    );

    if (!result.configured || !result.data) {
      return { configured: false, product: getFallbackProductBySlug(data.slug) };
    }

    return {
      configured: true,
      product: result.data.product ? mapProduct(result.data.product) : null,
    };
  });

export const getCart = createServerFn({ method: "GET" })
  .inputValidator((data: { cartId: string }) => data)
  .handler(async ({ data }): Promise<CartResponse> => {
    const result = await shopifyFetch<{
      cart: CartNode | null;
    }>(
      `
        query GetCart($cartId: ID!) {
          cart(id: $cartId) {
            ${CART_FIELDS}
          }
        }
      `,
      { cartId: data.cartId },
    );

    if (!result.configured || !result.data) {
      return { configured: false, cart: null };
    }

    return {
      configured: true,
      cart: result.data.cart ? mapCart(result.data.cart) : null,
    };
  });

export const addCartLine = createServerFn({ method: "POST" })
  .inputValidator((data: { cartId?: string; variantId: string; quantity: number }) => data)
  .handler(async ({ data }): Promise<CartResponse> => {
    const line = {
      merchandiseId: data.variantId,
      quantity: data.quantity,
    };

    if (data.cartId) {
      const existingCartResult = await shopifyFetch<{
        cartLinesAdd: {
          cart: CartNode | null;
          userErrors: Array<{ message: string }>;
        };
      }>(
        `
          mutation AddCartLine($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                ${CART_FIELDS}
              }
              userErrors {
                message
              }
            }
          }
        `,
        { cartId: data.cartId, lines: [line] },
      );

      if (existingCartResult.configured && existingCartResult.data?.cartLinesAdd.cart) {
        return {
          configured: true,
          cart: mapCart(existingCartResult.data.cartLinesAdd.cart),
        };
      }
    }

    const createResult = await shopifyFetch<{
      cartCreate: {
        cart: CartNode | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `
        mutation CreateCart($lines: [CartLineInput!]) {
          cartCreate(input: { lines: $lines }) {
            cart {
              ${CART_FIELDS}
            }
            userErrors {
              message
            }
          }
        }
      `,
      { lines: [line] },
    );

    if (!createResult.configured || !createResult.data?.cartCreate.cart) {
      return { configured: false, cart: null };
    }

    return {
      configured: true,
      cart: mapCart(createResult.data.cartCreate.cart),
    };
  });

export const updateCartLine = createServerFn({ method: "POST" })
  .inputValidator((data: { cartId: string; lineId: string; quantity: number }) => data)
  .handler(async ({ data }): Promise<CartResponse> => {
    const result = await shopifyFetch<{
      cartLinesUpdate: {
        cart: CartNode | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `
        mutation UpdateCartLine($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
          cartLinesUpdate(cartId: $cartId, lines: $lines) {
            cart {
              ${CART_FIELDS}
            }
            userErrors {
              message
            }
          }
        }
      `,
      {
        cartId: data.cartId,
        lines: [{ id: data.lineId, quantity: data.quantity }],
      },
    );

    if (!result.configured || !result.data?.cartLinesUpdate.cart) {
      return { configured: false, cart: null };
    }

    return {
      configured: true,
      cart: mapCart(result.data.cartLinesUpdate.cart),
    };
  });

export const removeCartLine = createServerFn({ method: "POST" })
  .inputValidator((data: { cartId: string; lineId: string }) => data)
  .handler(async ({ data }): Promise<CartResponse> => {
    const result = await shopifyFetch<{
      cartLinesRemove: {
        cart: CartNode | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `
        mutation RemoveCartLine($cartId: ID!, $lineIds: [ID!]!) {
          cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
            cart {
              ${CART_FIELDS}
            }
            userErrors {
              message
            }
          }
        }
      `,
      { cartId: data.cartId, lineIds: [data.lineId] },
    );

    if (!result.configured || !result.data?.cartLinesRemove.cart) {
      return { configured: false, cart: null };
    }

    return {
      configured: true,
      cart: mapCart(result.data.cartLinesRemove.cart),
    };
  });
