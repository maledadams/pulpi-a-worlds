import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminPanel, AdminShell, AdminTag } from "@/components/admin/AdminShell";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminInput,
  AdminPagination,
} from "@/components/admin/AdminControls";
import { enforceAdminAccess } from "@/lib/admin-access";
import { ADMIN_MEDIA, getVibeLabel } from "@/lib/admin-service";
import type { AdminMediaRecord } from "@/lib/admin-types";
import type { Vibe } from "@/data/products";

const PAGE_SIZE = 10;

function cloneMedia(item: AdminMediaRecord): AdminMediaRecord {
  return { ...item, fallback: [...item.fallback] as [string, string] };
}

export const Route = createFileRoute("/admin/media")({
  beforeLoad: () => enforceAdminAccess(),
  loader: () => ({ media: ADMIN_MEDIA }),
  head: () => ({ meta: [{ title: "Admin - Media" }] }),
  component: AdminMediaPage,
});

function AdminMediaPage() {
  const { media } = Route.useLoaderData();
  const [rows, setRows] = useState(() => media.map(cloneMedia));
  const [scope, setScope] = useState<"all" | Vibe>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState(media[0]?.id ?? "");
  const [draft, setDraft] = useState<AdminMediaRecord | null>(media[0] ? cloneMedia(media[0]) : null);
  const [saveMessage, setSaveMessage] = useState("");

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((item) => {
      const matchesScope = scope === "all" || item.vibe === scope;
      const haystack = `${item.productName} ${item.label}`.toLowerCase();
      return matchesScope && haystack.includes(lowered);
    });
  }, [rows, scope, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    setPage(0);
  }, [scope, query]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }

    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      return;
    }
    setDraft(cloneMedia(selected));
  }, [selected]);

  const handleSave = () => {
    if (!draft) return;
    setRows((current) => current.map((item) => (item.id === draft.id ? draft : item)));
    setSaveMessage("Media actualizada en la interfaz. El upload real quedara conectado a R2.");
  };

  return (
    <AdminShell
      section="media"
      title="Media"
      subtitle="Biblioteca compacta con seleccion rapida, sin mosaicos gigantes ni scroll absurdo para encontrar un asset."
      actions={<AdminButton tone="primary">Subir imagen</AdminButton>}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_390px]">
        <AdminPanel
          title="Biblioteca"
          eyebrow="Assets"
          actions={
            <div className="flex flex-wrap gap-2">
              {(["all", "moon", "sunshine", "men"] as const).map((entry) => (
                <AdminButton key={entry} tone={scope === entry ? "primary" : "ghost"} onClick={() => setScope(entry)}>
                  {entry === "all" ? "Todos" : getVibeLabel(entry)}
                </AdminButton>
              ))}
            </div>
          }
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <AdminInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por producto o label"
            />
            <div className="shrink-0 rounded-xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2.5 text-sm font-semibold">
              {filtered.length} assets
            </div>
          </div>

          {!paged.length ? (
            <AdminEmptyState
              title="No hay assets aqui"
              body="Prueba otro filtro o usa el boton de subida cuando conectemos R2."
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {paged.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-3xl border p-3 text-left transition-colors ${
                      selectedId === item.id
                        ? "border-[#231717] bg-[#f7f2ec]"
                        : "border-[#231717]/10 bg-[#faf6f0] hover:bg-[#f3eadf]"
                    }`}
                  >
                    <div
                      className="aspect-square rounded-2xl"
                      style={{ background: `linear-gradient(135deg, ${item.fallback[0]}, ${item.fallback[1]})` }}
                    >
                      {item.url ? (
                        <img src={item.url} alt={item.productName} className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-2xl font-black text-white/80">
                          {item.productName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-sm font-bold">{item.productName}</div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <AdminTag>{getVibeLabel(item.vibe)}</AdminTag>
                      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#7c665f]">{item.label}</span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <AdminPagination page={safePage} pages={pages} onChange={setPage} />
              </div>
            </>
          )}
        </AdminPanel>

        <AdminPanel
          title={draft?.productName || "Detalle"}
          eyebrow="Inspector"
          actions={
            <AdminButton tone="primary" onClick={handleSave} disabled={!draft}>
              Guardar
            </AdminButton>
          }
        >
          {draft ? (
            <div className="grid gap-4">
              {saveMessage ? (
                <div className="rounded-2xl border border-[#231717]/10 bg-[#f7f2ec] px-3 py-2 text-xs font-semibold text-[#5f4941]">
                  {saveMessage}
                </div>
              ) : null}

              <div
                className="aspect-square rounded-3xl"
                style={{ background: `linear-gradient(135deg, ${draft.fallback[0]}, ${draft.fallback[1]})` }}
              >
                {draft.url ? (
                  <img src={draft.url} alt={draft.productName} className="h-full w-full rounded-3xl object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl font-black text-white/80">
                    {draft.productName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <AdminField label="Producto">
                <AdminInput
                  value={draft.productName}
                  onChange={(event) => setDraft((current) => (current ? { ...current, productName: event.target.value } : current))}
                />
              </AdminField>
              <AdminField label="Label interno">
                <AdminInput
                  value={draft.label}
                  onChange={(event) => setDraft((current) => (current ? { ...current, label: event.target.value } : current))}
                />
              </AdminField>
              <AdminField label="URL">
                <AdminInput
                  value={draft.url ?? ""}
                  onChange={(event) => setDraft((current) => (current ? { ...current, url: event.target.value || null } : current))}
                  placeholder="https://..."
                />
              </AdminField>

              <div className="rounded-2xl border border-dashed border-[#231717]/20 px-3 py-4 text-sm text-[#6b5a55]">
                El upload real se conectara a R2. Por ahora este inspector deja listo el flujo y el espacio donde va el preview.
              </div>
            </div>
          ) : (
            <AdminEmptyState
              title="Sin asset seleccionado"
              body="Selecciona un asset de la biblioteca para revisarlo o cambiar sus datos."
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
