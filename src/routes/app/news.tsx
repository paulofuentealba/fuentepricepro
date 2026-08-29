import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const Route = createFileRoute("/app/news")({
  head: () => ({
    meta: [{ title: "O Que Mudou | Fuente Price Pro" }],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { t } = useI18n();
  return (
    <ComingSoonScreen
      icon={Bell}
      title={t.comingSoonScreen?.newsTitle || "Portfolio Changes Not Tracked Yet"}
      description={
        t.comingSoonScreen?.newsDesc ||
        "A feed of what changed in your portfolio and watched assets is planned but not implemented yet."
      }
    />
  );
}
