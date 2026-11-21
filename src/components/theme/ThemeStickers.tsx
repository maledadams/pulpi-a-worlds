import { useRouterState } from "@tanstack/react-router";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useActiveTheme, useThemePreviewing } from "@/context/theme";
import { THEME_PREVIEW_STICKER_MOVED, type ThemePreviewStickerMoved } from "@/lib/theme-preview";
import { stickerAreasForPath } from "@/lib/theme-css";
import type { StickerArea } from "@/lib/theme-schema";
import { pickPageStickers, stickerStyle, type PickedSticker } from "@/lib/theme-stickers";
import type { ThemeAssetRef } from "@/lib/themes";

// Theme stickers (spec §5.2): plain <img>s placed with CSS, never clickable, never
// read by screen readers. Positions are the sticker's center in % of its area
// (the page, the screen, the footer or the dropdown panel), phone and desktop apart.

/** Stickers for the page being shown, with the page-wide caps applied. */
export function usePageStickers(): PickedSticker[] {
  const theme = useActiveTheme();
  const pathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  });
  const collectionVibe = useRouterState({
    select: (state) =>
      (
        state.matches.find((match) => match.routeId === "/coleccion/$slug")?.loaderData as
          | { collection?: { vibe?: string } }
          | undefined
      )?.collection?.vibe,
  });
  return useMemo(
    () =>
      theme ? pickPageStickers(theme.stickers, stickerAreasForPath(pathname, collectionVibe)) : [],
    [theme, pathname, collectionVibe],
  );
}

/** A decoration that fails takes only itself down, never the page. */
class StickerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[themes] sticker layer failed", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// One observer for every moving sticker: animations pause while off screen.
let motionObserver: IntersectionObserver | null = null;
function observeMotion(element: HTMLElement) {
  if (typeof IntersectionObserver === "undefined") return () => undefined;
  motionObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries)
      entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
  });
  motionObserver.observe(element);
  return () => motionObserver?.unobserve(element);
}

function srcSet(asset: ThemeAssetRef) {
  return [
    ...asset.variants.map((variant) => `${variant.url} ${variant.width}w`),
    `${asset.url} ${asset.width}w`,
  ].join(", ");
}

/**
 * Editor preview only: drag a sticker to a new center. It moves live and, on release, tells
 * the editor its position (percent of its area, for the device being previewed).
 */
function startDrag(
  event: React.PointerEvent<HTMLSpanElement>,
  picked: PickedSticker,
  mode: "move" | "resize" | "rotate",
) {
  // The sticker's own span, whether the grab was on it or on its resize handle.
  const element = (event.currentTarget.closest(".theme-sticker") ??
    event.currentTarget) as HTMLElement;
  const desktop = window.matchMedia("(width >= 60rem)").matches;
  const fit = desktop ? picked.sticker.desktop : picked.sticker.mobile;
  const frame = (element.offsetParent ?? document.body).getBoundingClientRect();
  const container =
    picked.sticker.anchor === "viewport"
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : isScreenMeasured(picked)
        ? // Page stickers: across = % of the page width, down = % of one screen from the
          // page's top (Lucia, 2026-11-21). The screen is measured in the frame's own units,
          // so the page zoom can't throw it off.
          { left: frame.left, top: frame.top, width: frame.width, height: screenHeightIn(element) }
        : frame;
  const percent = (value: number) => Math.round(value * 10) / 10;
  const position = (clientX: number, clientY: number) => ({
    x: percent(((clientX - container.left) / container.width) * 100),
    y: percent(((clientY - container.top) / container.height) * 100),
  });
  event.preventDefault();
  event.stopPropagation();
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // No capturable pointer (some touch browsers): the listeners below still follow it.
  }
  const target = event.currentTarget;
  // Moving: the center follows the pointer. Resizing: the center stays put and the width is
  // twice the pointer's distance from it (corner handle, like Canva), 1-100% of the area.
  const box = element.getBoundingClientRect();
  const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  const start = { x: event.clientX, y: event.clientY, w: fit.w };
  let last = mode === "move" ? position(event.clientX, event.clientY) : { x: fit.x, y: fit.y };
  let width = fit.w;
  // Rotating: the sticker turns by however much the pointer has turned around its center.
  const angle = (clientX: number, clientY: number) =>
    (Math.atan2(clientY - center.y, clientX - center.x) * 180) / Math.PI;
  const startAngle = angle(event.clientX, event.clientY);
  let rot = fit.rot;
  const move = (moveEvent: PointerEvent) => {
    if (mode === "rotate") {
      const turned = fit.rot + angle(moveEvent.clientX, moveEvent.clientY) - startAngle;
      // Back into -180..180, whole degrees.
      rot = Math.round(((((turned + 180) % 360) + 360) % 360) - 180);
      element.style.setProperty(desktop ? "--st-drot" : "--st-rot", `${rot}deg`);
      return;
    }
    if (mode === "move") {
      last = position(moveEvent.clientX, moveEvent.clientY);
      element.style.setProperty(desktop ? "--st-dx" : "--st-x", `${last.x}%`);
      element.style.setProperty(desktop ? "--st-dy" : "--st-y", `${last.y}%`);
      if (isScreenMeasured(picked))
        element.style.setProperty(desktop ? "--st-dyn" : "--st-yn", String(last.y));
      return;
    }
    const before = Math.hypot(start.x - center.x, start.y - center.y) || 1;
    const now = Math.hypot(moveEvent.clientX - center.x, moveEvent.clientY - center.y);
    width = percent(Math.min(100, Math.max(1, start.w * (now / before))));
    element.style.setProperty(desktop ? "--st-dw" : "--st-w", `${width}%`);
  };
  const end = () => {
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", end);
    target.removeEventListener("pointercancel", end);
    const message: ThemePreviewStickerMoved = {
      type: THEME_PREVIEW_STICKER_MOVED,
      area: picked.area,
      index: picked.index,
      device: desktop ? "desktop" : "mobile",
      x: Math.min(150, Math.max(-50, last.x)),
      y: Math.min(150, Math.max(-50, last.y)),
      ...(mode === "resize" ? { w: width } : {}),
      ...(mode === "rotate" ? { rot } : {}),
    };
    window.parent.postMessage(message, window.location.origin);
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", end);
  target.addEventListener("pointercancel", end);
}

/** Editor preview only: mirror the sticker left to right (the editor saves it). */
function flipSticker(picked: PickedSticker) {
  const desktop = window.matchMedia("(width >= 60rem)").matches;
  const fit = desktop ? picked.sticker.desktop : picked.sticker.mobile;
  const message: ThemePreviewStickerMoved = {
    type: THEME_PREVIEW_STICKER_MOVED,
    area: picked.area,
    index: picked.index,
    device: desktop ? "desktop" : "mobile",
    x: fit.x,
    y: fit.y,
    flip: !picked.sticker.flip,
  };
  window.parent.postMessage(message, window.location.origin);
}

/** Which sticker the editor preview has selected (one at a time, across every list). */
let selectedKey: string | null = null;
const selectionListeners = new Set<() => void>();
function selectSticker(key: string | null) {
  selectedKey = key;
  for (const listener of selectionListeners) listener();
}
function useSelectedSticker(key: string, enabled: boolean) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const listener = () => setSelected(selectedKey === key);
    selectionListeners.add(listener);
    listener();
    // A click anywhere else in the page lets go of the selection.
    const outside = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.(".theme-sticker")) selectSticker(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => {
      selectionListeners.delete(listener);
      document.removeEventListener("pointerdown", outside);
    };
  }, [key, enabled]);
  return selected;
}

/** Page-anchored stickers of the page itself (not the footer's or dropdown's): height in screens. */
function isScreenMeasured(picked: PickedSticker) {
  return picked.sticker.anchor === "page" && !CONTAINED_AREAS.includes(picked.area);
}

/** One screen's height, in the same units as the element's container. */
function screenHeightIn(element: HTMLElement) {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;top:0;left:0;width:1px;height:calc(100vh / var(--page-zoom, 1));visibility:hidden;pointer-events:none";
  (element.offsetParent ?? document.body).appendChild(probe);
  const height = probe.getBoundingClientRect().height || window.innerHeight;
  probe.remove();
  return height;
}

function StickerItem({ picked, asset }: { picked: PickedSticker; asset: ThemeAssetRef }) {
  const { sticker } = picked;
  const imageRef = useRef<HTMLImageElement>(null);
  const previewing = useThemePreviewing();
  const key = `${picked.area}-${picked.index}`;
  const selected = useSelectedSticker(key, previewing);
  useEffect(() => {
    if (sticker.motion === "none" || !imageRef.current) return;
    return observeMotion(imageRef.current);
  }, [sticker.motion]);
  const classes = [
    "theme-sticker",
    sticker.anchor === "viewport" ? "theme-sticker-fixed" : "",
    isScreenMeasured(picked) ? "theme-sticker-page" : "",
    sticker.layer === "behind" ? "theme-sticker-behind" : "theme-sticker-front",
    picked.onPhone ? "" : "theme-sticker-desktop-only",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      aria-hidden="true"
      className={
        previewing
          ? `${classes} theme-sticker-draggable${selected ? " theme-sticker-selected" : ""}${
              // Behind the content it is covered wherever the page has a background of its
              // own, so the editor could neither show nor grab it (Lucia, 2026-11-21). In the
              // preview it comes forward, see-through and marked; the store keeps it behind.
              sticker.layer === "behind" ? " theme-sticker-preview-behind" : ""
            }`
          : classes
      }
      style={stickerStyle(sticker)}
      onPointerDown={
        previewing
          ? (event) => {
              selectSticker(key);
              startDrag(event, picked, "move");
            }
          : undefined
      }
    >
      <img
        ref={imageRef}
        src={asset.url}
        srcSet={asset.variants.length ? srcSet(asset) : undefined}
        sizes={`(min-width: 60rem) ${sticker.desktop.w}vw, ${sticker.mobile.w}vw`}
        width={asset.width}
        height={asset.height}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`theme-sticker-img theme-motion-${sticker.motion}`}
      />
      {previewing && selected ? (
        <>
          <span
            className="theme-sticker-handle"
            title="Arrastra para agrandar o achicar"
            onPointerDown={(event) => startDrag(event, picked, "resize")}
          />
          <span
            className="theme-sticker-rotate"
            title="Arrastra para girar"
            onPointerDown={(event) => startDrag(event, picked, "rotate")}
          />
          <button
            type="button"
            className="theme-sticker-flip"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => flipSticker(picked)}
          >
            Voltear
          </button>
        </>
      ) : null}
    </span>
  );
}

function StickerList({ picked }: { picked: PickedSticker[] }) {
  const assets = useActiveTheme()?.assets ?? {};
  return (
    <StickerBoundary>
      {picked.map((entry) => {
        const asset = assets[entry.sticker.asset];
        return asset ? (
          <StickerItem key={`${entry.area}-${entry.index}`} picked={entry} asset={asset} />
        ) : null;
      })}
    </StickerBoundary>
  );
}

const CONTAINED_AREAS: StickerArea[] = ["footer", "dropdown"];

/** The page's own stickers (not the footer's or the dropdown's). */
export function usePageLayerStickers() {
  const picked = usePageStickers();
  return useMemo(() => picked.filter((entry) => !CONTAINED_AREAS.includes(entry.area)), [picked]);
}

/** Rendered once in the page frame; the frame is made `relative` only when it has page-anchored stickers. */
export function ThemePageStickers({ picked }: { picked: PickedSticker[] }) {
  return picked.length ? <StickerList picked={picked} /> : null;
}

/** Stickers inside a container (footer, dropdown panel); the container must be positioned. */
export function ThemeAreaStickers({ area }: { area: "footer" | "dropdown" }) {
  const picked = usePageStickers();
  const inArea = useMemo(() => picked.filter((entry) => entry.area === area), [picked, area]);
  return inArea.length ? <StickerList picked={inArea} /> : null;
}

/** Whether the footer or dropdown has stickers (so it can become a positioned container). */
export function useAreaHasStickers(area: "footer" | "dropdown") {
  return usePageStickers().some((entry) => entry.area === area);
}
