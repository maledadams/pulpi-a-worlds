import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { Vibe } from "@/data/products";
import appCss from "../styles.css?url";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AgentationToolbar } from "@/components/dev/AgentationToolbar";
import { CheckoutSideWaves } from "@/components/layout/CheckoutSideWaves";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CartProvider } from "@/context/cart";
import { CatalogProvider } from "@/context/catalog";
import { setRuntimeCategoryConfig } from "@/data/products";
import { isAdminRoutePath } from "@/lib/admin-access";
import {
  getStorefrontAnnouncements,
  getStorefrontCategories,
  getStorefrontSettings,
} from "@/lib/admin-content";
import { getStorefrontCatalog } from "@/lib/catalog";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import generalPineapple from "@/assets/PULPINAGENERALPINA.svg";
import moonPineapple from "@/assets/PULPINAMOONPINA.svg";

function NotFoundComponent() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-7xl">404</h1>
        <p className="mt-2 text-muted-foreground">Esta vibra no existe.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-[#c5475f] px-5 py-2.5 font-bold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-3xl">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => ({
    catalogProducts: await getStorefrontCatalog(),
    announcements: await getStorefrontAnnouncements(),
    categories: await getStorefrontCategories(),
    settings: await getStorefrontSettings(),
  }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${SITE_NAME} | Inicio` },
      {
        name: "description",
        content: "Tienda de moda alternativa en República Dominicana.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: generalPineapple, media: "(prefers-color-scheme: light)" },
      { rel: "icon", type: "image/svg+xml", href: moonPineapple, media: "(prefers-color-scheme: dark)" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Coiny&family=Fredoka:wght@400;500;600;700&family=IM+Fell+Great+Primer+SC&family=New+Rocker&family=Outfit:wght@400;500;600;700&family=UnifrakturMaguntia&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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
  const { catalogProducts, announcements, categories, settings } = Route.useLoaderData();
  const location = useLocation();
  const isAdminRoute = isAdminRoutePath(location.pathname);

  setRuntimeCategoryConfig(categories);

  return (
    <QueryClientProvider client={queryClient}>
      <CatalogProvider products={catalogProducts}>
        <CartProvider>
          {isAdminRoute ? (
            <Outlet />
          ) : (
            <AppChrome announcements={announcements} settings={settings} />
          )}
          <AgentationToolbar />
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
  const hasCheckoutTexture =
    renderedPathname === "/carrito" || renderedPathname === "/solicitud";
  const mainThemeOverride = isSubstoreRoute
    ? renderedPathname === "/moon"
      ? "men"
      : themeOverride
    : undefined;

  return (
    <div className={`min-h-screen flex flex-col ${hasCheckoutTexture ? "checkout-texture relative isolate" : ""}`}>
      {hasCheckoutTexture ? <CheckoutSideWaves /> : null}
      <div className={hasCheckoutTexture ? "relative z-10" : undefined}>
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
    </div>
  );
}
