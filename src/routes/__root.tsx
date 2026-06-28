import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { useMemo } from "react";
import type { Vibe } from "@/data/products";
import appCss from "../styles.css?url";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { AgentationToolbar } from "@/components/dev/AgentationToolbar";
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
      { title: "Pulpiña RD - Prendas de otro mundo" },
      {
        name: "description",
        content: "Marca dominicana de moda alternativa: Pulpiña, Men, Moon y Sunshine. Diseñado en RD.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Coiny&family=Fredoka:wght@400;500;600;700&family=IM+Fell+Great+Primer+SC&family=New+Rocker&family=Outfit:wght@400;500;600;700&family=UnifrakturMaguntia&display=swap",
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
  const location = useLocation();
  const { catalogProducts } = Route.useLoaderData();

  const themeOverride = useMemo(() => {
    if (location.pathname.startsWith("/producto/")) {
      const slug = location.pathname.replace(/^\/producto\//, "");
      const product = catalogProducts.find((entry) => entry.slug === slug);
      return product?.vibe && product.vibe !== "pulpina" ? product.vibe : undefined;
    }

    const section = location.pathname.split("/")[1] as Vibe | undefined;
    if (section === "moon" || section === "sunshine" || section === "men") {
      return section;
    }

    return undefined;
  }, [catalogProducts, location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header announcements={announcements} announcementThemeOverride={themeOverride} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer settings={settings} themeOverride={themeOverride} />
      <CartDrawer theme={themeOverride ?? "store"} />
    </div>
  );
}
