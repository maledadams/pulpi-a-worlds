import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemePageStickers, usePageLayerStickers } from "@/components/theme/ThemeStickers";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  type ErrorComponentProps,
  useLocation,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Vibe } from "@/data/products";
import appCss from "../styles.css?url";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AgeGate } from "@/components/layout/AgeGate";
import { Toaster } from "@/components/ui/sonner";
import { CheckoutSideWaves } from "@/components/layout/CheckoutSideWaves";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartProvider } from "@/context/cart";
import { CatalogProvider } from "@/context/catalog";
import { setRuntimeCategoryConfig } from "@/data/products";
import { isAdminRoutePath } from "@/lib/admin-access";
import { themeScopeForPath } from "@/lib/theme-css";
import {
  getStorefrontAnnouncements,
  getStorefrontCategories,
  getStorefrontSettings,
} from "@/lib/admin-content";
import { getStorefrontCatalog } from "@/lib/catalog";
import { activeThemeSnippet } from "@/lib/analytics";
import { getActiveThemeSlice, getPromoBanners } from "@/lib/themes";
import { ThemeProvider } from "@/context/theme";
import { usePageViewTracking } from "@/hooks/use-page-view-tracking";
import {
  absoluteSiteUrl,
  buildOrganizationJsonLd,
  buildWebsiteJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "@/lib/seo";
import generalPineapple from "@/assets/PULPINAGENERALPINA.svg";
import moonPineapple from "@/assets/PULPINAMOONPINA.svg";
import generalLogo from "@/assets/logo-sunshine.png";

function NotFoundComponent() {
  return (
    <div className="min-h-[calc(70vh/var(--page-zoom))] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">Esta vibra no existe.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-[#121212] px-5 py-2.5 font-bold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="min-h-[calc(70vh/var(--page-zoom))] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-3xl">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No pudimos cargar esta página. Inténtalo otra vez en unos segundos.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
            className="bg-[#121212] px-5 py-2.5 font-bold text-white"
          >
            Reintentar
          </button>
          {/* A full page load, not a client navigation: the app's own state may be what failed. */}
          <a href="/" className="border border-foreground/30 px-5 py-2.5 font-bold">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async ({ location }) => {
    const previewThemeId = themePreviewIdFrom(location.search);
    const previewAt = themeDateFrom(location.search);
    const [catalogProducts, announcements, categories, settings, theme, promoBanners] = await Promise.all([
      getStorefrontCatalog(),
      getStorefrontAnnouncements(),
      getStorefrontCategories(),
      getStorefrontSettings(),
      // Admin pages are never themed, so they don't ask.
      isAdminRoutePath(location.pathname)
        ? Promise.resolve(null)
        : getActiveThemeSlice({ data: { path: location.pathname, previewThemeId, previewAt } }),
      // Promotion banners (Inicio, Tienda), on with their promotion, theme or not.
      isAdminRoutePath(location.pathname)
        ? Promise.resolve([])
        : getPromoBanners({ data: { path: location.pathname } }),
    ]);
    return {
      catalogProducts,
      announcements,
      categories,
      settings,
      theme,
      previewThemeId,
      promoBanners,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Fallback only - every real route sets its own via createSeoHead.
      { title: `${SITE_NAME} | Tienda de moda alternativa en República Dominicana` },
      { name: "description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Unconditional default: crawlers (Google Search, link unfurlers, etc.)
      // don't evaluate the prefers-color-scheme media queries below, so
      // without this they have nothing dependable to pick up as the icon.
      ...faviconLinks(loaderData?.theme),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Coiny&family=Fredoka:wght@400;500;600;700&family=IM+Fell+Great+Primer+SC&family=New+Rocker&family=Outfit:wght@400;500;600;700&family=UnifrakturMaguntia&display=swap",
      },
    ],
    scripts: [
      {
        // Admin dark mode, before first paint (src/lib/admin-theme.ts).
        children: `try{if(localStorage.getItem("admin-theme")==="dark")document.documentElement.setAttribute("data-admin-theme","dark")}catch(e){}`,
      },
      {
        src: "https://www.googletagmanager.com/gtag/js?id=G-N6LGC4Z2PN",
        async: true,
      },
      {
        children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

// Not inside the admin theme editor's preview frame: that is the owner, not a visitor.
// The theme that is on, for the theme reports (event param active_theme; src/lib/analytics.ts).
${activeThemeSnippet(loaderData?.theme?.source === "preview" ? null : (loaderData?.theme?.name ?? null))}
if (window.self === window.top) gtag('config', 'G-N6LGC4Z2PN');`,
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(buildWebsiteJsonLd()),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          buildOrganizationJsonLd({
            logo: absoluteSiteUrl(generalLogo),
            // Every profile that verifiably belongs to this brand strengthens
            // the entity: more corroborating sources for search/LLMs to tie
            // the name to this shop rather than the cartoon.
            sameAs: Array.from(
              new Set(
                [
                  loaderData?.settings.instagramUrl,
                  "https://www.instagram.com/pulpinard/",
                  "https://www.instagram.com/pulpinamoon/",
                  "https://www.instagram.com/pulpinamen/",
                ].filter((entry): entry is string => Boolean(entry)),
              ),
            ),
          }),
        ),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

/** Browser tab icons: today's set, or the active theme's icon (spec §5.8). */
function faviconLinks(
  theme:
    | { favicon: string | null; assets: Record<string, { url: string; variants: Array<{ url: string; width: number }> }> }
    | null
    | undefined,
) {
  const themeIcon = theme?.favicon ? theme.assets[theme.favicon] : undefined;
  if (themeIcon) {
    // The upload makes 48 / 96 / 192 px copies of the 512 px icon (theme-image-prepare.ts).
    const sized = (size: number) => themeIcon.variants.find((variant) => variant.width === size)?.url;
    return [
      { rel: "icon", type: "image/png", href: themeIcon.url, sizes: "512x512" },
      ...[48, 96, 192].flatMap((size) =>
        sized(size) ? [{ rel: "icon", type: "image/png", href: sized(size)!, sizes: `${size}x${size}` }] : [],
      ),
      { rel: "apple-touch-icon", href: sized(192) ?? themeIcon.url },
    ];
  }
  return [
    { rel: "icon", type: "image/svg+xml", href: generalPineapple },
    { rel: "icon", type: "image/svg+xml", href: generalPineapple, media: "(prefers-color-scheme: light)" },
    { rel: "icon", type: "image/svg+xml", href: moonPineapple, media: "(prefers-color-scheme: dark)" },
    { rel: "icon", href: "/favicon.ico", sizes: "any" },
    // Explicit square PNGs at sizes Google Search's favicon crawler checks
    // for (multiples of 48px) - the SVGs above are for browsers, this is
    // the fallback that keeps working for crawlers that skip SVG icons.
    { rel: "icon", type: "image/png", href: "/icons/icon-48.png", sizes: "48x48" },
    { rel: "icon", type: "image/png", href: "/icons/icon-96.png", sizes: "96x96" },
    { rel: "icon", type: "image/png", href: "/icons/icon-192.png", sizes: "192x192" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  ];
}

/** ?themeDate=YYYY-MM-DDTHH:mm: "Ver como el día…" from /admin/temas (honored only for admins). */
function themeDateFrom(search: unknown) {
  const value = (search as Record<string, unknown> | undefined)?.themeDate;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? value : undefined;
}

/** ?themePreview=<id>: the admin editor's preview frame (honored only for admins, server side). */
function themePreviewIdFrom(search: unknown) {
  const value = (search as Record<string, unknown> | undefined)?.themePreview;
  return typeof value === "string" && /^[\w-]{1,80}$/.test(value) ? value : undefined;
}

function RootShell({ children }: { children: React.ReactNode }) {
  // Where a theme's general colors apply (src/lib/theme-css.ts). Set during
  // server rendering, so a themed page never flashes today's colors first.
  const themeScope = useRouterState({
    select: (state) => {
      const pathname = state.resolvedLocation?.pathname ?? state.location.pathname;
      const collectionMatch = state.matches.find((match) => match.routeId === "/coleccion/$slug");
      const collectionVibe = (
        collectionMatch?.loaderData as { collection?: { vibe?: string } } | undefined
      )?.collection?.vibe;
      return themeScopeForPath(pathname, collectionVibe) ?? undefined;
    },
  });
  // React doesn't update <html> attributes after hydration, so client navigations
  // (Tienda -> Moon) keep the scope in sync here; the server sets it for first paint.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (themeScope) root.setAttribute("data-theme-scope", themeScope);
    else root.removeAttribute("data-theme-scope");
  }, [themeScope]);
  return (
    <html lang="es" suppressHydrationWarning data-theme-scope={themeScope}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { catalogProducts, announcements, categories, settings, theme, previewThemeId, promoBanners } =
    Route.useLoaderData();
  const location = useLocation();
  const isAdminRoute = isAdminRoutePath(location.pathname);

  // The gtag snippet only ever sees the document load; this reports the
  // client-side navigations that make up the rest of every visit.
  usePageViewTracking();

  setRuntimeCategoryConfig(categories);

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogProvider products={catalogProducts}>
        <CartProvider>
          {isAdminRoute ? (
            <Outlet />
          ) : (
            <ThemeProvider
              slice={theme}
              previewing={Boolean(previewThemeId)}
              promoBanners={promoBanners}
            >
              <AppChrome announcements={announcements} settings={settings} />
            </ThemeProvider>
          )}
        </CartProvider>
      </CatalogProvider>
    </QueryClientProvider>
  );
}

function AppChrome({
  announcements,
  settings,
}: {
  announcements: Awaited<ReturnType<typeof getStorefrontAnnouncements>>;
  settings: Awaited<ReturnType<typeof getStorefrontSettings>>;
}) {
  const { catalogProducts } = Route.useLoaderData();
  const renderedPathname = useRouterState({
    select: (state) => state.resolvedLocation?.pathname ?? state.location.pathname,
  });
  const previousPathRef = useRef(renderedPathname);
  const transitionEnableFrameRef = useRef(0);

  const isSubstorePath = (path: string) =>
    path === "/moon" || path === "/sunshine" || path === "/men";
  const isSubstoreRoute = isSubstorePath(renderedPathname);

  useLayoutEffect(() => {
    window.cancelAnimationFrame(transitionEnableFrameRef.current);
    const enableThemeTransition =
      isSubstorePath(previousPathRef.current) && isSubstorePath(renderedPathname);
    document.documentElement.classList.toggle(
      "substore-theme-transition",
      enableThemeTransition,
    );

    if (isSubstorePath(renderedPathname) && !enableThemeTransition) {
      transitionEnableFrameRef.current = window.requestAnimationFrame(() => {
        document.documentElement.classList.add("substore-theme-transition");
      });
    }

    previousPathRef.current = renderedPathname;
  }, [renderedPathname]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(transitionEnableFrameRef.current);
      document.documentElement.classList.remove("substore-theme-transition");
    },
    [],
  );

  const themeOverride = useMemo(() => {
    if (renderedPathname.startsWith("/producto/")) {
      const slug = renderedPathname.replace(/^\/producto\//, "");
      const product = catalogProducts.find((entry) => entry.slug === slug);
      return product?.vibe && product.vibe !== "pulpina" ? product.vibe : undefined;
    }

    const section = renderedPathname.split("/")[1] as Vibe | undefined;
    if (section === "moon" || section === "sunshine" || section === "men") {
      return section;
    }

    return undefined;
  }, [catalogProducts, renderedPathname]);
  // Theme stickers for this page; the frame becomes `relative` only when one is anchored
  // to the page, so without stickers the markup is exactly as before.
  const pageStickers = usePageLayerStickers();
  const pageAnchoredStickers = pageStickers.some((entry) => entry.sticker.anchor === "page");
  const hasCheckoutTexture =
    renderedPathname === "/carrito" || renderedPathname === "/solicitud";
  const mainThemeOverride = isSubstoreRoute
    ? renderedPathname === "/moon"
      ? "men"
      : themeOverride
    : undefined;

  return (
    <div
      className={`min-h-[calc(100vh/var(--page-zoom))] flex flex-col ${hasCheckoutTexture ? "checkout-texture relative isolate" : ""}${pageAnchoredStickers && !hasCheckoutTexture ? " relative" : ""}`}
    >
      <ThemePageStickers picked={pageStickers} />
      {hasCheckoutTexture ? <CheckoutSideWaves /> : null}
      {/* z-20, one above <main>'s z-10, so the header's dropdown paints over
          the checkout form instead of under it. */}
      <div className={hasCheckoutTexture ? "relative z-20" : undefined}>
        <Header announcements={announcements} announcementThemeOverride={themeOverride} />
      </div>
      <main
        data-vibe={mainThemeOverride}
        className={`flex-1 ${isSubstoreRoute ? "bg-background" : ""} ${hasCheckoutTexture ? "relative z-10" : ""}`}
      >
        {hasCheckoutTexture ? (
          <div className="relative z-10">
            <Outlet />
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      <div className={hasCheckoutTexture ? "relative z-10" : undefined}>
        <Footer settings={settings} themeOverride={themeOverride} />
      </div>
      <CartDrawer theme={themeOverride ?? "store"} />
      <Toaster position="top-center" />
      <AgeGate />
    </div>
  );
}
