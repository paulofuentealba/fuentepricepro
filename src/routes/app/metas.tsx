import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n-provider";
import { GoalWizard } from "@/components/goals/GoalWizard";

export const Route = createFileRoute("/app/metas")({
  head: () => ({
    meta: [
      { title: "Metas de Investimento | Fuente Price Pro" },
      {
        name: "description",
        content: "Configure as metas de alocação por classe, yield-alvo e critérios de exclusão usados pelo AskEngine.",
      },
    ],
  }),
  component: MetasPage,
});

function MetasPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t.goalWizard.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.goalWizard.pageSubtitle}</p>
      </div>

      <GoalWizard
        onComplete={() => {
          toast.success(t.goalWizard.savedToast);
          navigate({ to: "/app/smartallocation" });
        }}
      />
    </div>
  );
}
