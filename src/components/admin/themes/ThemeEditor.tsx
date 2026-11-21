import { History, Monitor, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTabs,
  confirmAdminDestructiveAction,
} from "@/components/admin/AdminControls";
import { AdminPanel, AdminTag } from "@/components/admin/AdminShell";
import { ThemeBannerTab } from "@/components/admin/themes/ThemeBannerTab";
import { ThemeColorsTab } from "@/components/admin/themes/ThemeColorsTab";
import { ThemeDatesTab } from "@/components/admin/themes/ThemeDatesTab";
import { useVersionDialogs } from "@/components/admin/themes/ThemeVersionDialogs";
import { ThemeDiscountsTab } from "@/components/admin/themes/ThemeDiscountsTab";
import {
  AssetLibraryContext,
  deleteImageQuestion,
  type LibraryAsset,
} from "@/components/admin/themes/ThemeEditorParts";
import { ThemeEffectTab } from "@/components/admin/themes/ThemeEffectTab";
import { ThemeImagesTab } from "@/components/admin/themes/ThemeImagesTab";
import { ThemeStickersTab } from "@/components/admin/themes/ThemeStickersTab";
import { useCatalogProducts } from "@/context/catalog";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import type { AdminCollectionRecord, AdminDiscountRecord } from "@/lib/admin-types";
import {
  THEME_PREVIEW_DRAFT,
  THEME_PREVIEW_READY,
  THEME_PREVIEW_FRAME_NAME,
  THEME_PREVIEW_STICKER_MOVED,
  type ThemePreviewStickerMoved,
} from "@/lib/theme-preview";
import { formatSantoDomingoShort } from "@/lib/theme-schedule";
import { parseTheme, themeSchema, type ThemeDocument } from "@/lib/theme-schema";
import {
  deleteAdminThemeAsset,
  getAdminTheme,
  publishAdminTheme,
  restoreAdminThemeVersion,
  saveAdminTheme,
  type ThemeAssetRef,
} from "@/lib/themes";
import { DEFAULT_THEME_ID, themeAssetIds } from "@/lib/themes-store";
import { DELETED_IMAGE_REF } from "@/lib/theme-placeholder";

// The theme editor (spec §6): settings on the left, the real storefront on the right in
// an iframe (?themePreview=<id>) that receives the draft on every change, so what you see
// is what will be published. Nothing reaches the public site until "Publicar".

type Detail = NonNullable<Awaited<ReturnType<typeof getAdminTheme>>>;
type TabId = "colores" | "imagenes" | "stickers" | "efecto" | "banner" | "descuentos" | "fechas";
export type DocUpdate = (update: (doc: ThemeDocument) => ThemeDocument) => void;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "colores", label: "Colores" },
  { id: "imagenes", label: "Imágenes y logos" },
  { id: "stickers", label: "Stickers" },
  { id: "efecto", label: "Efecto y ola" },
  { id: "banner", label: "Banners" },
  { id: "descuentos", label: "Descuentos" },
  { id: "fechas", label: "Fechas" },
];

function savedAt(iso: string) {
  return formatSantoDomingoShort(iso);
}

export function ThemeEditor({
  theme,
  assets: initialAssets,
  discounts,
  collections,
  onNotice,
  onClose,
}: {
  theme: Detail;
  assets: LibraryAsset[];
  discounts: AdminDiscountRecord[];
  collections: AdminCollectionRecord[];
  onNotice: (message: string, tone: "success" | "error" | "info") => void;
  onClose: () => void;
}) {
  const products = useCatalogProducts();
  const [doc, setDoc] = useState<ThemeDocument>(theme.doc);
  // The latest doc, so a save can tell whether it was edited while the request was out.
  const docRef = useRef(doc);
  docRef.current = doc;
  const [version, setVersion] = useState(theme.version);
  const [publishedVersion, setPublishedVersion] = useState(theme.publishedVersion);
  const [versions, setVersions] = useState(theme.versions);
  // The saved version the draft is right now (going back moves this, without copying).
  const [basedOn, setBasedOn] = useState(theme.basedOnVersion ?? theme.version);
  const { askName, askUnsaved, dialogs } = useVersionDialogs();
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<TabId>("colores");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [assets, setAssets] = useState<LibraryAsset[]>(initialAssets);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [previewSize, setPreviewSize] = useState({ width: 1280, height: 800 });
  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const measure = () => setPreviewSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const pages = useMemo(() => {
    const product = products.find((entry) => entry.vibe === "pulpina") ?? products[0];
    return [
      { path: "/", label: "Inicio" },
      { path: "/tienda", label: "Tienda" },
      { path: "/moon", label: "Moon" },
      { path: "/sunshine", label: "Sunshine" },
      { path: "/men", label: "Men" },
      ...(product ? [{ path: `/producto/${product.slug}`, label: "Producto" }] : []),
      { path: "/contacto", label: "Contacto" },
      { path: "/carrito", label: "Carrito" },
      { path: "/solicitud", label: "Solicitud" },
    ];
  }, [products]);
  const [page, setPage] = useState("/");

  const update: DocUpdate = useCallback((change) => {
    setDoc((current) => change(current));
    setDirty(true);
  }, []);

  const assetMap = useMemo(() => {
    const map: Record<string, ThemeAssetRef> = Object.fromEntries(
      assets.map((asset) => [
        asset.id,
        {
          url: asset.url,
          width: asset.width,
          height: asset.height,
          variants: asset.variants,
        } satisfies ThemeAssetRef,
      ]),
    );
    // Images this theme points at that were deleted: the green-screen cube, so the preview
    // shows exactly where something needs a new image.
    const parsed = parseTheme(doc);
    for (const id of parsed ? themeAssetIds(parsed) : []) map[id] ??= DELETED_IMAGE_REF;
    return map;
  }, [assets, doc]);

  // Send the draft to the preview whenever it changes, and when the preview (re)loads.
  const postDraft = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: THEME_PREVIEW_DRAFT, doc, assets: assetMap },
      window.location.origin,
    );
  }, [doc, assetMap]);
  useEffect(() => {
    const timer = window.setTimeout(postDraft, 120);
    return () => window.clearTimeout(timer);
  }, [postDraft]);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== frameRef.current?.contentWindow
      )
        return;
      const data = event.data as { type?: string } | null;
      if (data?.type === THEME_PREVIEW_READY) postDraft();
      if (data?.type === THEME_PREVIEW_STICKER_MOVED) {
        const moved = data as ThemePreviewStickerMoved;
        update((current) => {
          const list = [...(current.stickers[moved.area] ?? [])];
          const sticker = list[moved.index];
          if (!sticker) return current;
          list[moved.index] = {
            ...sticker,
            ...(moved.flip === undefined ? {} : { flip: moved.flip }),
            [moved.device]: {
              ...sticker[moved.device],
              x: moved.x,
              y: moved.y,
              ...(moved.w === undefined ? {} : { w: moved.w }),
              ...(moved.rot === undefined ? {} : { rot: moved.rot }),
            },
          };
          return { ...current, stickers: { ...current.stickers, [moved.area]: list } };
        });
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [postDraft, update]);

  // Leaving with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const problem = useMemo(() => {
    const result = themeSchema.safeParse(doc);
    if (result.success) return null;
    const issue = result.error.issues[0];
    // Half-filled sections read better in words than as the validator's messages.
    if (issue?.path[0] === "homeBanners" || issue?.path[0] === "tiendaBanners")
      return "A un banner le falta algo: la imagen de computadora, la de teléfono y el texto alternativo son obligatorios.";
    if (issue?.path[0] === "heroEffect")
      return "Al efecto le falta su imagen (efecto personalizado).";
    if (issue?.path[0] === "name") return "Ponle un nombre al tema.";
    return issue?.message && !/^(Expected|Invalid|Required)/.test(issue.message)
      ? issue.message
      : "El tema tiene un dato incompleto.";
  }, [doc]);

  // Every save is a named version (Lucia, 2026-11-20); the name can stay the default.
  const save = async () => {
    if (problem) {
      onNotice(problem, "error");
      return null;
    }
    const label = await askName(`Versión ${version + 1}`);
    if (label === null) return null;
    setBusy(true);
    try {
      const saved = await saveAdminTheme({
        data: { id: theme.id, baseVersion: version, doc, label },
      });
      setVersion(saved.version);
      setBasedOn(saved.version);
      // Edited while saving: those changes are still unsaved.
      if (docRef.current === doc) setDirty(false);
      const fresh = await getAdminTheme({ data: { id: theme.id } });
      setVersions(fresh.versions);
      onNotice(
        "Borrador guardado. La tienda todavía no lo ve: publica cuando esté listo.",
        "success",
      );
      return saved.version;
    } catch (error) {
      onNotice(getAdminErrorMessage(error), "error");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    const base = dirty ? await save() : version;
    if (!base) return;
    setBusy(true);
    try {
      await publishAdminTheme({ data: { id: theme.id, baseVersion: base } });
      setPublishedVersion(base);
      onNotice(
        "Publicado. Se verá en la tienda cuando el tema esté activo o programado.",
        "success",
      );
    } catch (error) {
      onNotice(getAdminErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  // Going back (Lucia, 2026-11-20): no copy is made; the draft just becomes that version.
  // Unsaved changes are saved (as a named version) or dropped first, as she chooses.
  const restore = async (target: number) => {
    if (target === basedOn && !dirty) return;
    let base = version;
    if (dirty) {
      const answer = await askUnsaved();
      if (answer === "cancel") return;
      if (answer === "save") {
        const saved = await save();
        if (!saved) return;
        base = saved;
      }
    }
    setBusy(true);
    try {
      const restored = await restoreAdminThemeVersion({
        data: { id: theme.id, baseVersion: base, version: target },
      });
      const fresh = await getAdminTheme({ data: { id: theme.id } });
      setDoc(fresh.doc);
      setVersion(restored.version);
      setBasedOn(target);
      setVersions(fresh.versions);
      setDirty(false);
      const entry = fresh.versions.find((item) => item.version === target);
      onNotice(`Ahora estás en "${entry?.label ?? `Versión ${target}`}".`, "success");
    } catch (error) {
      onNotice(getAdminErrorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    if (
      dirty &&
      !(await confirmAdminDestructiveAction("Tienes cambios sin guardar. ¿Salir sin guardarlos?"))
    )
      return;
    onClose();
  };

  const frameWidth = device === "phone" ? 390 : 1280;
  const scale = Math.min(1, previewSize.width / frameWidth) || 1;

  const shared = {
    doc,
    update,
    assets,
    onUploaded: (asset: LibraryAsset) => setAssets((current) => [asset, ...current]),
    onError: (message: string) => onNotice(message, "error"),
  };

  // Borrar from the library (Lucia, 2026-11-20): really deleted, even if a theme uses it;
  // those spots show the green-screen cube here until another image is picked.
  const library = useMemo(
    () => ({
      dismiss: async (asset: LibraryAsset) => {
        if (!(await confirmAdminDestructiveAction(deleteImageQuestion(asset.usedBy)))) return false;
        try {
          await deleteAdminThemeAsset({ data: { id: asset.id, force: true } });
          setAssets((current) => current.filter((entry) => entry.id !== asset.id));
          onNotice("Imagen borrada.", "success");
          return true;
        } catch (error) {
          onNotice(getAdminErrorMessage(error, "No se pudo borrar la imagen."), "error");
          return false;
        }
      },
    }),
    [onNotice],
  );

  return (
    <AssetLibraryContext.Provider value={library}>
      <div className="grid items-start gap-4 a2xl:grid-cols-[30rem_minmax(0,1fr)] axl:grid-cols-[26rem_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-4">
          <AdminPanel
            eyebrow={
              publishedVersion === null
                ? "Nunca publicado"
                : publishedVersion === version && !dirty
                  ? "Publicado"
                  : "Cambios sin publicar"
            }
            title="Tema"
            actions={
              <>
                <AdminButton tone="ghost" disabled={busy} onClick={() => void close()}>
                  Cerrar
                </AdminButton>
                <AdminButton tone="secondary" disabled={busy || !dirty} onClick={() => void save()}>
                  Guardar borrador
                </AdminButton>
                <AdminButton
                  tone="save"
                  disabled={busy || Boolean(problem) || (!dirty && publishedVersion === version)}
                  onClick={() => void publish()}
                >
                  Publicar
                </AdminButton>
              </>
            }
          >
            <div className="grid gap-3">
              <AdminInput
                aria-label="Nombre del tema"
                value={doc.name}
                readOnly={theme.id === DEFAULT_THEME_ID}
                title={theme.id === DEFAULT_THEME_ID ? "El Tema general no se renombra" : undefined}
                maxLength={60}
                onChange={(event) =>
                  update((current) => ({ ...current, name: event.target.value }))
                }
              />
              {problem ? <p className="text-sm text-[var(--admin-danger)]">{problem}</p> : null}
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 shrink-0 text-[var(--admin-faint)]" />
                <AdminSelect
                  aria-label="Historial"
                  value=""
                  disabled={busy || versions.length < 2}
                  onChange={(event) => {
                    if (event.target.value) void restore(Number(event.target.value));
                  }}
                >
                  <option value="">
                    Historial:{" "}
                    {versions.length === 1 ? "1 versión" : `últimas ${versions.length} versiones`}
                  </option>
                  {versions.map((entry) => (
                    <option
                      key={entry.version}
                      value={entry.version}
                      disabled={entry.version === basedOn && !dirty}
                    >
                      {entry.label ?? `Versión ${entry.version}`} · {savedAt(entry.savedAt)}
                      {entry.savedBy && entry.savedBy !== "local" ? ` · ${entry.savedBy}` : ""}
                      {entry.version === basedOn ? (dirty ? " (con cambios)" : " (actual)") : ""}
                    </option>
                  ))}
                </AdminSelect>
              </div>
            </div>
          </AdminPanel>

          <AdminTabs tabs={TABS} active={tab} onChange={setTab} />

          <div className="grid gap-4">
            {tab === "colores" ? <ThemeColorsTab doc={doc} update={update} /> : null}
            {tab === "imagenes" ? <ThemeImagesTab {...shared} /> : null}
            {tab === "stickers" ? <ThemeStickersTab {...shared} /> : null}
            {tab === "efecto" ? <ThemeEffectTab {...shared} /> : null}
            {tab === "banner" ? (
              <ThemeBannerTab {...shared} collections={collections} products={products} />
            ) : null}
            {tab === "descuentos" ? (
              <ThemeDiscountsTab doc={doc} update={update} discounts={discounts} />
            ) : null}
            {tab === "fechas" && theme.id === DEFAULT_THEME_ID ? (
              <AdminPanel title="Fechas">
                <p className="text-sm text-[var(--admin-muted)]">
                  El Tema general no tiene fechas: es el predeterminado y se ve siempre que no haya
                  otro tema activo o programado.
                </p>
              </AdminPanel>
            ) : tab === "fechas" ? (
              <ThemeDatesTab
                themeId={theme.id}
                published={publishedVersion !== null}
                onNotice={onNotice}
              />
            ) : null}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 axl:sticky axl:top-4">
          <div className="flex flex-wrap items-center gap-2">
            <AdminSelect
              aria-label="Página de la vista previa"
              value={page}
              onChange={(event) => setPage(event.target.value)}
              className="w-auto"
            >
              {pages.map((entry) => (
                <option key={entry.path} value={entry.path}>
                  {entry.label}
                </option>
              ))}
            </AdminSelect>
            <div className="inline-flex gap-1 rounded-xl border border-[var(--admin-edge)] bg-[var(--admin-surface)] p-1">
              <AdminButton
                tone={device === "desktop" ? "active" : "ghost"}
                onClick={() => setDevice("desktop")}
                aria-label="Vista de computadora"
              >
                <Monitor className="h-4 w-4" />
              </AdminButton>
              <AdminButton
                tone={device === "phone" ? "active" : "ghost"}
                onClick={() => setDevice("phone")}
                aria-label="Vista de teléfono"
              >
                <Smartphone className="h-4 w-4" />
              </AdminButton>
            </div>
            <AdminTag tone="info">Vista previa: solo tú la ves</AdminTag>
          </div>
          {/* The store renders at a real device width (1280 desktop, 390 phone) and is scaled
            down to fit, so the preview shows the actual desktop or phone layout. */}
          <div
            ref={previewBoxRef}
            className="relative h-[calc(100vh/var(--page-zoom)-12rem)] min-h-[32rem] overflow-hidden rounded-2xl border border-[var(--admin-edge)] bg-[var(--admin-surface)]"
          >
            <iframe
              ref={frameRef}
              key={`${page}-${device}`}
              title="Vista previa del tema"
              name={THEME_PREVIEW_FRAME_NAME}
              src={`${page}?themePreview=${encodeURIComponent(theme.id)}`}
              className="absolute top-0 border-0 bg-white"
              style={{
                width: frameWidth,
                height: previewSize.height / scale,
                left: Math.max(0, (previewSize.width - frameWidth * scale) / 2),
                transform: `scale(${scale})`,
                transformOrigin: "0 0",
              }}
            />
          </div>
        </div>
      </div>
      {dialogs}
    </AssetLibraryContext.Provider>
  );
}
