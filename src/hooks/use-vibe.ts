import { useEffect } from "react";
import type { Vibe } from "@/data/products";

export function useVibe(vibe: Vibe | null) {
  useEffect(() => {
    const el = document.documentElement;

    if (vibe && vibe !== "pulpina") {
      el.setAttribute("data-vibe", vibe);
    } else {
      el.removeAttribute("data-vibe");
    }

    // Restore on unmount so non-vibe pages (Inicio, Tienda, etc.) always use the default theme.
    return () => el.removeAttribute("data-vibe");
  }, [vibe]);
}
