import { createFileRoute, redirect } from "@tanstack/react-router";

// The in-app wiki was consolidated into the public /guides hub (same content,
// no login required, plus a new "Dividend Valuation" tab) — this route only
// exists to redirect anyone with the old /app/docs link/bookmark.
export const Route = createFileRoute("/app/docs")({
  beforeLoad: () => {
    throw redirect({ to: "/guides" });
  },
});
