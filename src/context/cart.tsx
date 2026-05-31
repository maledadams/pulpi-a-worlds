import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getFallbackVariantById, type Cart, type CartLine } from "@/data/products";
import { addCartLine, getCart, removeCartLine, updateCartLine } from "@/lib/shopify";

type CartCtx = {
  cart: Cart | null;
  lines: Cart["lines"];
  open: boolean;
  loading: boolean;
  configured: boolean;
  checkoutUrl: string | null;
  setOpen: (v: boolean) => void;
  add: (line: { variantId: string; quantity: number }) => Promise<void>;
  update: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  clear: () => void;
  count: number;
  subtotal: number;
  currencyCode: string;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "pulpina_cart_id";
const PREVIEW_KEY = "pulpina_preview_cart_lines";
const PREVIEW_CART_ID = "preview-cart";

function persistCartId(cartId: string | null) {
  if (typeof window === "undefined") return;
  if (cartId) {
    localStorage.setItem(KEY, cartId);
    return;
  }
  localStorage.removeItem(KEY);
}

function buildPreviewCart(lines: CartLine[]): Cart {
  return {
    id: PREVIEW_CART_ID,
    checkoutUrl: "",
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    currencyCode: lines[0]?.currencyCode ?? "DOP",
    lines,
  };
}

function loadPreviewLines() {
  if (typeof window === "undefined") return [] as CartLine[];

  try {
    const raw = localStorage.getItem(PREVIEW_KEY);
    if (!raw) return [] as CartLine[];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as CartLine[];
  }
}

function persistPreviewLines(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  if (lines.length > 0) {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(lines));
    return;
  }
  localStorage.removeItem(PREVIEW_KEY);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(true);

  const applyCart = (nextCart: Cart | null) => {
    startTransition(() => {
      setCart(nextCart);
      if (nextCart?.id && nextCart.id !== PREVIEW_CART_ID) {
        persistCartId(nextCart.id);
      } else {
        persistCartId(null);
      }
      persistPreviewLines(nextCart?.id === PREVIEW_CART_ID ? nextCart.lines : []);
    });
  };

  const applyPreviewLines = (lines: CartLine[]) => {
    setConfigured(false);
    applyCart(lines.length > 0 ? buildPreviewCart(lines) : null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previewLines = loadPreviewLines();
    if (previewLines.length > 0) {
      applyPreviewLines(previewLines);
    }

    const cartId = localStorage.getItem(KEY);
    if (!cartId) return;

    let cancelled = false;
    setLoading(true);

    void getCart({ data: { cartId } })
      .then((result) => {
        if (cancelled) return;
        setConfigured(result.configured);
        if (result.configured) {
          applyCart(result.cart);
        } else if (previewLines.length > 0) {
          applyPreviewLines(previewLines);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const add = async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
    if (!configured) {
      const fallback = getFallbackVariantById(variantId);
      if (!fallback) return;

      const currentLines = cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines();
      const existing = currentLines.findIndex((line) => line.merchandiseId === variantId);
      const nextLines = [...currentLines];

      if (existing >= 0) {
        nextLines[existing] = {
          ...nextLines[existing],
          quantity: nextLines[existing].quantity + quantity,
        };
      } else {
        nextLines.push({
          id: `preview-${variantId}`,
          quantity,
          merchandiseId: fallback.variant.id,
          title: fallback.variant.title,
          productTitle: fallback.product.name,
          productHandle: fallback.product.slug,
          image: fallback.variant.image ?? fallback.product.featuredImage,
          price: fallback.variant.price,
          currencyCode: fallback.variant.currencyCode,
          selectedOptions: fallback.variant.selectedOptions,
        });
      }

      applyPreviewLines(nextLines);
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const result = await addCartLine({
        data: {
          cartId: cart?.id,
          variantId,
          quantity,
        },
      });
      if (!result.configured) {
        setConfigured(false);
        const fallback = getFallbackVariantById(variantId);
        if (fallback) {
          applyPreviewLines([
            ...(cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines()),
            {
              id: `preview-${variantId}`,
              quantity,
              merchandiseId: fallback.variant.id,
              title: fallback.variant.title,
              productTitle: fallback.product.name,
              productHandle: fallback.product.slug,
              image: fallback.variant.image ?? fallback.product.featuredImage,
              price: fallback.variant.price,
              currencyCode: fallback.variant.currencyCode,
              selectedOptions: fallback.variant.selectedOptions,
            },
          ]);
          setOpen(true);
        }
        return;
      }
      setConfigured(true);
      applyCart(result.cart);
      if (result.cart) setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const update = async (lineId: string, quantity: number) => {
    if (!configured) {
      const currentLines = cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines();
      const nextLines = currentLines.map((line) =>
        line.id === lineId ? { ...line, quantity: Math.max(1, quantity) } : line,
      );
      applyPreviewLines(nextLines);
      return;
    }

    if (!cart?.id) return;
    setLoading(true);
    try {
      const result = await updateCartLine({
        data: {
          cartId: cart.id,
          lineId,
          quantity: Math.max(1, quantity),
        },
      });
      setConfigured(result.configured);
      applyCart(result.cart);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (lineId: string) => {
    if (!configured) {
      const currentLines = cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines();
      const nextLines = currentLines.filter((line) => line.id !== lineId);
      applyPreviewLines(nextLines);
      return;
    }

    if (!cart?.id) return;
    setLoading(true);
    try {
      const result = await removeCartLine({
        data: {
          cartId: cart.id,
          lineId,
        },
      });
      setConfigured(result.configured);
      applyCart(result.cart);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => applyCart(null);

  return (
    <Ctx.Provider
      value={{
        cart,
        lines: cart?.lines ?? [],
        open,
        loading,
        configured,
        checkoutUrl: cart?.checkoutUrl ?? null,
        setOpen,
        add,
        update,
        remove,
        clear,
        count: cart?.totalQuantity ?? 0,
        subtotal: cart?.subtotal ?? 0,
        currencyCode: cart?.currencyCode ?? "DOP",
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider missing");
  return c;
};
