import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { isAdminRoutePath } from "@/lib/admin-access";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends a GA4 page_view for every client-side navigation.
 *
 * The inline gtag snippet in __root.tsx sends exactly one page_view, when the
 * document loads. This storefront is a SPA, so every link after that is a
 * router transition that never reloads the document: a visitor who landed on
 * the home page and then browsed ten products counted as a single page_view.
 * GA4 was not broken there - it was only ever told about the first page of
 * each visit, which is a large part of why the traffic numbers never looked
 * believable next to what the shop actually sees.
 *
 * The first page_view is deliberately left to the snippet rather than moving
 * everything in here behind `send_page_view: false`. The snippet fires even if
 * React never hydrates, so the baseline cannot be taken out by app code; this
 * hook only fills in the navigations the snippet cannot see, and therefore
 * skips the render it was mounted on.
 */
export function usePageViewTracking() {
  const href = useRouterState({
    select: (state) => state.resolvedLocation?.href ?? state.location.href,
  });
  const lastTrackedHref = useRef<string | null>(null);

  useEffect(() => {
    const previousHref = lastTrackedHref.current;
    if (previousHref === href) return;
    lastTrackedHref.current = href;

    // The document-load page_view already covered whichever route we booted
    // on, so counting it here too would double every visit's entry page.
    if (previousHref === null) return;

    // Admin is the shop owner clicking around their own dashboard. On a store
    // this size that traffic would drown out the actual customers.
    const url = new URL(href, window.location.origin);
    if (isAdminRoutePath(url.pathname)) return;

    trackPageView({
      page_location: url.href,
      page_title: document.title,
      page_referrer: new URL(previousHref, window.location.origin).href,
    });
  }, [href]);
}
