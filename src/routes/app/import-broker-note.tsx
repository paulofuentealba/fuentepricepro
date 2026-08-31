import { createFileRoute } from "@tanstack/react-router";
import { BrokerNoteImportPage } from "@/components/portfolio/BrokerNoteImportPage";

export const Route = createFileRoute("/app/import-broker-note")({
  head: () => ({
    meta: [
      { title: "Importar Nota de Corretagem | Fuente Price Pro" },
      {
        name: "description",
        content: "Envie o PDF da sua nota de corretagem e revise as transações detectadas antes de confirmar.",
      },
    ],
  }),
  component: BrokerNoteImportPage,
});
