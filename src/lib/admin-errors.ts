function isZodIssueArray(value: unknown): value is Array<{ path?: unknown[]; message?: string }> {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => entry && typeof entry === "object" && "message" in entry);
}

const FIELD_LABELS: Record<string, string> = {
  name: "el nombre",
  slug: "el slug",
  label: "el nombre",
  code: "el codigo",
  price: "el precio",
  value: "el valor",
  description: "la descripcion",
  sizes: "las tallas",
  colors: "el color",
  categories: "las categorias",
  primaryCategory: "la categoria principal",
  images: "las imagenes",
  variants: "las variantes",
};

/**
 * Server functions throw ZodErrors and raw D1/SQLite exceptions that would
 * otherwise reach the admin UI verbatim (e.g. a stringified Zod issue array,
 * or "D1_ERROR: UNIQUE constraint failed: collections.slug..."). Translate
 * the common shapes into plain Spanish; anything unrecognized falls back to
 * a generic message rather than leaking implementation detail.
 */
export function getAdminErrorMessage(error: unknown, fallback = "No se pudo guardar. Intenta de nuevo."): string {
  if (!(error instanceof Error) || !error.message.trim()) return fallback;
  const raw = error.message.trim();

  try {
    const parsed = JSON.parse(raw);
    if (isZodIssueArray(parsed)) {
      const issue = parsed[0]!;
      const fieldPath = Array.isArray(issue.path) ? issue.path.join(".") : "";
      const field = FIELD_LABELS[fieldPath] ?? (fieldPath ? `"${fieldPath}"` : "un campo");
      return `Revisa ${field}: falta o no es valido.`;
    }
  } catch {
    // not JSON - fall through to the plain-text checks below
  }

  if (raw.includes("UNIQUE constraint failed")) {
    if (raw.includes(".slug")) return "Ya existe otro registro con ese mismo nombre.";
    if (raw.includes(".code")) return "Ya existe un codigo igual a ese.";
    if (raw.includes(".id")) return "Ya existe otro registro con ese mismo identificador.";
    return "Ya existe un registro con ese mismo valor unico.";
  }
  if (raw.includes("D1_ERROR") || raw.includes("SQLITE_") || raw.includes("Failed query")) {
    return fallback;
  }

  return raw;
}
