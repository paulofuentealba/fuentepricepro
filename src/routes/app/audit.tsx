import { createFileRoute } from "@tanstack/react-router";
import { AuditPanel } from "@/components/audit/AuditPanel";

export const Route = createFileRoute("/app/audit")({
  head: () => ({
    meta: [
      { title: "Auditoria | Fuente Price Pro" },
      {
        name: "description",
        content: "Histórico de decisões de compra e venda, com o consenso da época e o imposto real pago.",
      },
    ],
  }),
  component: AuditPanel,
});
