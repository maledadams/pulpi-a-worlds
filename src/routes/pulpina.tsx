import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pulpina")({
  loader: () => {
    throw redirect({ to: "/tienda" });
  },
  component: () => null,
});
