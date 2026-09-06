import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/globalradar")({
  beforeLoad: () => {
    throw redirect({
      to: "/app/explore",
      search: { tab: "screener" },
    });
  },
  component: () => null,
});

