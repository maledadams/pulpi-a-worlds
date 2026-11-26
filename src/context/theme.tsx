import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { setActiveThemeForAnalytics } from "@/lib/analytics";
import { bannerPath } from "@/lib/theme-banner";
import { buildThemeCss } from "@/lib/theme-css";
import { parseTheme } from "@/lib/theme-schema";
import {
  THEME_PREVIEW_DRAFT,
  THEME_PREVIEW_FRAME_NAME,
  THEME_PREVIEW_READY,
  type ThemePreviewDraftMessage,
} from "@/lib/theme-preview";
import type { PromoBannerSlide, ThemeSlice } from "@/lib/themes";

// The active theme for the storefront (spec §4.4). The root loader resolves it on
// the server; this provider renders its CSS and hands its slots, stickers and
// effects to the components that draw them.
//
// Admin preview: /admin/temas loads the page in an iframe with ?themePreview=<id>.
// The page tells its parent it is ready, and the editor answers with the draft as
// it is being edited (same origin only), so changes show without saving.

const ThemeContext = createContext<ThemeSlice | null>(null);
const ThemePreviewingContext = createContext(false);
const PromoBannersContext = createContext<PromoBannerSlide[]>([]);

/** Banners of the promotions that are on (theme or not), for Inicio and Tienda. */
export function usePromoBanners() {
  return useContext(PromoBannersContext);
}

/** True inside the admin editor's preview frame (stickers become draggable there). */
export function useThemePreviewing() {
  return useContext(ThemePreviewingContext);
}

/** The theme for this page, or null (Sin tema). */
export function useActiveTheme() {
  return useContext(ThemeContext);
}

function sliceFromDraft(
  message: ThemePreviewDraftMessage,
  base: ThemeSlice | null,
): ThemeSlice | null {
  const theme = parseTheme(message.doc);
  if (!theme) return null;
  return {
    themeId: base?.themeId ?? "preview",
    name: theme.name,
    source: "preview",
    css: buildThemeCss(theme),
    slots: theme.slots,
    stickers: theme.stickers,
    heroEffect: theme.heroEffect,
    heroWave: theme.heroWave,
    heroGradient: theme.heroGradient,
    // Preview only: the admin picked the targets from the live list, so they exist.
    keepStorePicker: theme.keepStorePicker,
    homeBanners: theme.homeBanners.map((banner) => ({ ...banner, href: bannerPath(banner.link, true) })),
    tiendaBanners: theme.tiendaBanners.map((banner) => ({
      ...banner,
      href: bannerPath(banner.link, true),
    })),
    favicon: theme.favicon,
    shareImage: theme.shareImage,
    assets: message.assets,
  };
}

export function ThemeProvider({
  slice,
  previewing,
  promoBanners = [],
  children,
}: {
  slice: ThemeSlice | null;
  previewing: boolean;
  promoBanners?: PromoBannerSlide[];
  children: ReactNode;
}) {
  const [live, setLive] = useState<ThemeSlice | null | undefined>(undefined);
  // A link clicked inside the preview frame drops ?themePreview: stay in preview mode anyway.
  const [startedInPreview] = useState(previewing);
  // A full reload inside the frame (a plain link) drops the query too: the frame's name stays.
  const [framed, setFramed] = useState(false);
  useEffect(() => {
    setFramed(window.parent !== window && window.name === THEME_PREVIEW_FRAME_NAME);
  }, []);
  const inPreview = previewing || startedInPreview || framed;

  useEffect(() => {
    if (!inPreview || window.parent === window) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const data = event.data as Partial<ThemePreviewDraftMessage> | null;
      if (data?.type !== THEME_PREVIEW_DRAFT) return;
      setLive(sliceFromDraft(data as ThemePreviewDraftMessage, slice));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: THEME_PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [inPreview, slice]);

  const current = live === undefined ? slice : live;
  // A theme that starts or ends during the visit: later events report the new one.
  // The editor preview is never reported (gtag is not configured inside its frame).
  const reportedName = inPreview ? null : (slice?.name ?? null);
  useEffect(() => {
    if (!inPreview) setActiveThemeForAnalytics(reportedName);
  }, [inPreview, reportedName]);
  return (
    <ThemePreviewingContext.Provider value={inPreview}>
      <PromoBannersContext.Provider value={promoBanners}>
      <ThemeContext.Provider value={current}>
        {/* Built only from validated colors (theme-css.ts), so it holds no markup; raw, because
          React would escape the selector quotes inside <style>. Rendered first in <body>, so
          the page never paints today's colors before the theme's. */}
        {current?.css ? (
          <style id="theme-css" dangerouslySetInnerHTML={{ __html: current.css }} />
        ) : null}
        {children}
      </ThemeContext.Provider>
      </PromoBannersContext.Provider>
    </ThemePreviewingContext.Provider>
  );
}
