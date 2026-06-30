import { useEffect, useRef, useState } from "react";

export function useScrollFollow(minWidth = 768) {
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLElement>(null);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let frame = 0;

    const updatePosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const container = containerRef.current;
        const floating = floatingRef.current;

        if (!container || !floating || window.innerWidth < minWidth) {
          offsetRef.current = 0;
          setOffset(0);
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const floatingRect = floating.getBoundingClientRect();
        const containerTop = containerRect.top + window.scrollY;
        const maximumOffset = Math.max(0, containerRect.height - floatingRect.height);
        const isPageTop = window.scrollY <= 1;
        const isPageBottom =
          window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;

        let nextOffset = 0;
        if (isPageBottom) {
          nextOffset = maximumOffset;
        } else if (!isPageTop) {
          const centeredTop = window.scrollY + window.innerHeight / 2 - floatingRect.height / 2;
          nextOffset = Math.min(maximumOffset, Math.max(0, centeredTop - containerTop));
        }

        nextOffset = Math.round(nextOffset * 100) / 100;
        if (Math.abs(offsetRef.current - nextOffset) < 0.5) return;
        offsetRef.current = nextOffset;
        setOffset(nextOffset);
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    const resizeObserver = new ResizeObserver(updatePosition);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (floatingRef.current) resizeObserver.observe(floatingRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
      resizeObserver.disconnect();
    };
  }, [minWidth]);

  return { containerRef, floatingRef, offset };
}
