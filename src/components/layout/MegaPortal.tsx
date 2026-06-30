import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MegaPortal({ children, top = 0 }: { children: React.ReactNode; top?: number }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement("div");
    el.id = "mega-portal";
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      if (document.body.contains(el)) document.body.removeChild(el);
    };
  }, []);

  if (!container) return null;

  return createPortal(
    <div style={{ position: "fixed", left: 0, right: 0, top, zIndex: 99999 }}>{children}</div>,
    container,
  );
}
