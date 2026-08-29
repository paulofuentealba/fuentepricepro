import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import { useI18n } from "@/lib/i18n-provider";
import { ComingSoonScreen } from "@/components/shared/ComingSoonScreen";

export const Route = createFileRoute("/app/withdraw")({
  head: () => ({
    meta: [{ title: "Retirar | Fuente Price Pro" }],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { t } = useI18n();
  return (
    <ComingSoonScreen
      icon={ArrowDown}
      title={t.comingSoonScreen?.withdrawTitle || "Withdraw Engine Not Built Yet"}
      description={
        t.comingSoonScreen?.withdrawDesc ||
        "The tax-optimized withdrawal engine is planned but not implemented yet."
      }
    />
  );
}
