import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PRODUCTS, type Product } from "@/data/products";

export type CartLine = {
  productId: string;
  size: string;
  color: string;
  qty: number;
};

type CartCtx = {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (line: CartLine) => void;
  update: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  itemsWithProduct: (CartLine & { product: Product })[];
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "pulpina_cart_id"; // mock — stores serialized lines

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines]);

  const add = (line: CartLine) => {
    setLines((cur) => {
      const i = cur.findIndex(
        (l) => l.productId === line.productId && l.size === line.size && l.color === line.color,
      );
      if (i >= 0) {
        const copy = [...cur];
        copy[i] = { ...copy[i], qty: copy[i].qty + line.qty };
        return copy;
      }
      return [...cur, line];
    });
    setOpen(true);
  };
  const update = (i: number, qty: number) =>
    setLines((cur) => cur.map((l, idx) => (idx === i ? { ...l, qty: Math.max(1, qty) } : l)));
  const remove = (i: number) => setLines((cur) => cur.filter((_, idx) => idx !== i));
  const clear = () => setLines([]);

  const itemsWithProduct = lines
    .map((l) => {
      const product = PRODUCTS.find((p) => p.id === l.productId);
      return product ? { ...l, product } : null;
    })
    .filter(Boolean) as (CartLine & { product: Product })[];

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const subtotal = itemsWithProduct.reduce(
    (s, it) => s + (it.product.salePrice ?? it.product.price) * it.qty,
    0,
  );

  return (
    <Ctx.Provider value={{ lines, open, setOpen, add, update, remove, clear, count, subtotal, itemsWithProduct }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("CartProvider missing");
  return c;
};
