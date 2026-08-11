import { createFileRoute } from "@tanstack/react-router";

/**
 * Placeholder da v2 "Horizonte FI" (prompt 49): só valida que a rota monta e
 * o layout (`app-v2.tsx` + `SidebarHorizonte`) renderiza corretamente com os
 * tokens `--h-*` (prompt 46). Nenhuma tela de conteúdo real ainda — isso
 * chega nos prompts seguintes (50: hero canvas, 51: dashboard v2).
 */
export const Route = createFileRoute("/app-v2/")({
  component: HorizonteV2Placeholder,
});

function HorizonteV2Placeholder() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl p-16 text-center"
      style={{
        backgroundColor: "var(--h-paper-raised)",
        border: "1px solid var(--h-line)",
        borderRadius: "var(--h-radius-2xl)",
      }}
    >
      <span
        className="text-2xl"
        style={{ fontFamily: "var(--h-font-display)", color: "var(--h-ink)" }}
      >
        Horizonte FI v2 — em construção
      </span>
      <p className="text-sm max-w-md" style={{ color: "var(--h-ink-soft)" }}>
        Esta é a rota paralela da v2. As telas de conteúdo chegam nos
        próximos prompts.
      </p>
    </div>
  );
}
