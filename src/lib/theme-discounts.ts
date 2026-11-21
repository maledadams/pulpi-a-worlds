// Discounts linked to themes (spec §5.9). A discount listed by a published theme is
// owned by that theme: it is on exactly while that theme is active (schedule or
// "Activar ahora", never an admin preview) and its own switch is ignored. Every other
// discount keeps following its switch. Pure, so the money rule is tested.

export type ThemeDiscountControl = {
  /** discount id -> names of the published themes that list it */
  linked: Map<string, string[]>;
  /** discount ids the currently active (public) theme turns on */
  activeIds: Set<string>;
};

export const NO_THEME_DISCOUNTS: ThemeDiscountControl = { linked: new Map(), activeIds: new Set() };

export function discountIsOn(
  discount: { id: string; active: boolean },
  control: ThemeDiscountControl,
) {
  return control.linked.has(discount.id) ? control.activeIds.has(discount.id) : discount.active;
}
