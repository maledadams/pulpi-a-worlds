import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultStaleTime: 0,
    defaultViewTransition: true,
    defaultHashScrollIntoView: { behavior: "smooth" },
  });

  // The first load in the browser (hydration) must not run inside a view
  // transition: on client-only pages (ssr: false, i.e. /carrito and /solicitud)
  // the transition delays the "pending" render until after the router has
  // already cleared its load promise, so React gets `throw undefined` and the
  // whole page goes blank. Seen when the page loads in a tab that is not on
  // screen (e.g. opened in a background tab); visible tabs load fine. Same switch the router
  // itself flips in invalidate(); it applies to one load only, so in-app
  // navigation keeps its transitions.
  if (typeof document !== "undefined") router.shouldViewTransition = false;

  return router;
};
