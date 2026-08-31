import { createFileRoute } from "@tanstack/react-router";
import { AddAssetPage } from "@/components/portfolio/AddAssetPage";

export const Route = createFileRoute("/app/add-asset")({
  head: () => ({
    meta: [
      { title: "Adicionar Ativo | Fuente Price Pro" },
      {
        name: "description",
        content: "Adicione uma nova posição à sua carteira com prévia de impacto e consenso na data da compra.",
      },
    ],
  }),
  component: AddAssetPage,
});
