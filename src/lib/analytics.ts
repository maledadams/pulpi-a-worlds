declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

// Theme and discount reporting (Lucia, 2026-11-20), for the GA reports in Client Reports.
// Only names and shared codes ever go to Google: never an email, phone, order contents
// beyond the existing ecommerce items, or a birthday code (those are per person).

/** Value of the `active_theme` parameter when no theme is on. */
export const NO_THEME_LABEL = "Sin tema";

/** Every later event on this page carries the theme that was on (event param `active_theme`). */
export function setActiveThemeForAnalytics(themeName: string | null) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("set", { active_theme: themeName ?? NO_THEME_LABEL });
}

/** The `coupon` sent to Google: a shared code as typed, birthday codes only as their kind. */
export function analyticsCoupon(code: string, kind: "general" | "birthday" | "") {
  if (!code) return undefined;
  return kind === "birthday" ? "CUMPLEANOS" : code.trim().toUpperCase().slice(0, 40);
}

/**
 * The inline snippet's line that sets the theme before the first page_view. JSON-encoded
 * with "<" escaped, so a theme name can never close the <script> tag.
 */
export function activeThemeSnippet(themeName: string | null) {
  const value = JSON.stringify(themeName ?? NO_THEME_LABEL).replace(/</g, "\\u003c");
  return `gtag('set', {active_theme: ${value}});`;
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
};

export function trackPageView(params: {
  page_location: string;
  page_title: string;
  page_referrer?: string;
}) {
  sendEvent("page_view", params);
}

export function trackViewItem(item: AnalyticsItem, currency: string) {
  sendEvent("view_item", { currency, value: item.price, items: [item] });
}

export function trackAddToCart(item: AnalyticsItem, currency: string) {
  sendEvent("add_to_cart", { currency, value: item.price * (item.quantity ?? 1), items: [item] });
}

export function trackRemoveFromCart(item: AnalyticsItem, currency: string) {
  sendEvent("remove_from_cart", { currency, value: item.price * (item.quantity ?? 1), items: [item] });
}

export function trackBeginCheckout(items: AnalyticsItem[], value: number, currency: string) {
  sendEvent("begin_checkout", { currency, value, items });
}

export function trackPurchase(params: {
  transactionId: string;
  value: number;
  currency: string;
  items: AnalyticsItem[];
  /** From analyticsCoupon: a shared code, or "CUMPLEANOS". */
  coupon?: string;
  /** Money taken off by that code. */
  discountValue?: number;
}) {
  sendEvent("purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    items: params.items,
    ...(params.coupon ? { coupon: params.coupon, discount_value: params.discountValue ?? 0 } : {}),
  });
}

export function trackSearch(searchTerm: string) {
  if (!searchTerm.trim()) return;
  sendEvent("search", { search_term: searchTerm.trim() });
}

export function trackGenerateLead(method: string) {
  sendEvent("generate_lead", { method });
}
