declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendEvent(name: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
};

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
}) {
  sendEvent("purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: params.currency,
    items: params.items,
  });
}

export function trackSearch(searchTerm: string) {
  if (!searchTerm.trim()) return;
  sendEvent("search", { search_term: searchTerm.trim() });
}

export function trackGenerateLead(method: string) {
  sendEvent("generate_lead", { method });
}
