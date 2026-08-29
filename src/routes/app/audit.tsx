import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [{ title: "Auditoria | Fuente Price Pro" }],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { t } = useI18n();
  return (
    <ComingSoonScreen
      icon={Clock}
      title={t.comingSoonScreen?.auditTitle || "Audit Trail Not Built Yet"}
      description={
        t.comingSoonScreen?.auditDesc ||
        "A history of every calculation and decision made in the app is planned but not implemented yet."
      }
    />
  );
}
