import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type Cart, type CartLine } from "@/data/products";
import { useCatalogProducts } from "@/context/catalog";

type CartCtx = {
  cart: Cart | null;
  lines: Cart["lines"];
  open: boolean;
  loading: boolean;
  configured: boolean;
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
const LEGACY_REMOTE_CART_KEY = "pulpina_cart_id";
const PREVIEW_KEY = "pulpina_preview_cart_lines";
const PREVIEW_CART_ID = "preview-cart";

function buildPreviewCart(lines: CartLine[]): Cart {
  return {
    id: PREVIEW_CART_ID,
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
  const products = useCatalogProducts();
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const configured = false;

  const applyCart = (nextCart: Cart | null) => {
    startTransition(() => {
      setCart(nextCart);
      persistPreviewLines(nextCart?.id === PREVIEW_CART_ID ? nextCart.lines : []);
    });
  };

  const applyPreviewLines = (lines: CartLine[]) => {
    applyCart(lines.length > 0 ? buildPreviewCart(lines) : null);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(LEGACY_REMOTE_CART_KEY);

    const previewLines = loadPreviewLines();
    if (previewLines.length > 0) {
      applyPreviewLines(previewLines);
    }
  }, []);

  const add = async ({ variantId, quantity }: { variantId: string; quantity: number }) => {
    const fallback = products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.id === variantId)
        .map((variant) => ({ product, variant })),
    )[0];
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
  };

  const update = async (lineId: string, quantity: number) => {
    const currentLines = cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines();
    const nextLines = currentLines.map((line) =>
      line.id === lineId ? { ...line, quantity: Math.max(1, quantity) } : line,
    );
    applyPreviewLines(nextLines);
  };

  const remove = async (lineId: string) => {
    const currentLines = cart?.id === PREVIEW_CART_ID ? cart.lines : loadPreviewLines();
    const nextLines = currentLines.filter((line) => line.id !== lineId);
    applyPreviewLines(nextLines);
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
