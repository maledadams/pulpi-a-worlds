// Shared by the checkout form and submitManualOrder. When the browser accepted
// something the server then rejected, the customer only ever saw a generic
// "No se pudo crear el pedido" and kept retrying the same input forever.

export const ORDER_FIELD_LIMITS = {
  address: 160,
  city: 120,
  email: 254,
  name: 120,
  notes: 1200,
} as const;

// The exact pattern zod's .email() uses, so both sides agree.
export const ORDER_EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

// Phone keyboards add stray spaces, capitals and a trailing period
// ("maria@gmail.com.") that would otherwise fail validation.
export function normalizeOrderEmail(raw: string) {
  return raw.trim().replace(/\.+$/, "").toLowerCase();
}

// Autofill hands over "+1 809 555 1234": drop the country code so the
// 10-digit local number survives instead of being cut to "1809555123".
export function normalizeOrderPhoneDigits(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(0, 10);
}
