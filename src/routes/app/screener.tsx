import { createFileRoute } from "@tanstack/react-router";
import { ScreenerScreen } from "@/components/screener/ScreenerScreen";

export const Route = createFileRoute("/app/screener")({
  component: ScreenerScreen,
});
