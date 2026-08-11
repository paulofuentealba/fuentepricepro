import { useEffect, useRef, useState } from "react";
import { useFIProgress } from "@/lib/useFIProgress";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { formatCurrency, formatMonthsAsYearsMonths } from "@/lib/formatters";

/**
 * "Horizonte FI" — elemento hero de assinatura da v2 (Horizonte).
 *
 * Desenha uma linha do horizonte em <canvas> cuja altura representa
 * `coveragePercent` (0-100%), animando do zero até o valor real na
 * primeira renderização (respeitando `prefers-reduced-motion`).
 *
 * Todos os números exibidos vêm de `useFIProgress()` — nada é mockado.
 * Não integrado a nenhuma rota ainda (prompt 51 cuida disso).
 */

const EASE_OUT_DURATION_MS = 1300;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function readColor(varName: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function drawHorizon(canvas: HTMLCanvasElement, levelPercent: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const accent = readColor("--h-accent", "#2c6b63");
  const accentStrong = readColor("--h-accent-strong", "#1f4e47");
  const line = readColor("--h-line", "#e0d9cc");

  const clampedLevel = Math.min(100, Math.max(0, levelPercent));
  // Piso visual mínimo: mesmo em progresso perto de 0%, a faixa preenchida
  // precisa ocupar uma fração perceptível do canvas — do contrário o card
  // vira um retângulo quase vazio, sem função visual clara. Isso é só
  // cosmético (não altera o valor numérico exibido no header).
  const MIN_VISUAL_LEVEL_PERCENT = 8;
  const displayLevel = clampedLevel > 0
    ? Math.max(clampedLevel, MIN_VISUAL_LEVEL_PERCENT)
    : 0;
  const levelY = height - (displayLevel / 100) * height;

  // Linha pontilhada de referência no topo (100%)
  ctx.save();
  ctx.strokeStyle = line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(width, 1);
  ctx.stroke();
  ctx.restore();

  // Preenchimento "chão" com gradiente do accent até transparente
  const gradient = ctx.createLinearGradient(0, height, 0, levelY);
  gradient.addColorStop(0, accentStrong);
  gradient.addColorStop(1, `${accent}00`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(0, levelY);
  ctx.lineTo(width, levelY);
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  // Linha do horizonte
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, levelY);
  ctx.lineTo(width, levelY);
  ctx.stroke();
  ctx.restore();

  // Marcador circular "você está aqui"
  const markerX = width * 0.5;
  ctx.save();
  ctx.fillStyle = accentStrong;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(markerX, levelY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function HorizonteHero() {
  const { coveragePercent, isReached, totalCapitalBRL, monthsToFI, isSetup } = useFIProgress();
  const { items, isAppLoading } = useValuedPortfolio();
  const hasNoAssets = !isAppLoading && items.length === 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [, forceRedraw] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      drawHorizon(canvas, coveragePercent);
      return;
    }

    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / EASE_OUT_DURATION_MS);
      const eased = easeOutCubic(progress);
      const currentLevel = coveragePercent * eased;

      drawHorizon(canvas, currentLevel);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coveragePercent]);

  // Redesenha ao trocar tema claro/escuro (tokens de cor mudam via CSS,
  // mas o canvas precisa ser repintado manualmente).
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      forceRedraw((n) => n + 1);
      const canvas = canvasRef.current;
      if (canvas) drawHorizon(canvas, coveragePercent);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [coveragePercent]);

  // Redesenha em resize (canvas responsivo)
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) drawHorizon(canvas, coveragePercent);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [coveragePercent]);

  const monthsLabel = formatMonthsAsYearsMonths(monthsToFI ?? 0);
  const capitalLabel = formatCurrency(totalCapitalBRL, "BRL", "ptBR");

  const milestones: { label: string; achieved: boolean }[] = [];
  if (totalCapitalBRL > 0) {
    milestones.push({
      label: "Primeiros R$ 100 mil",
      achieved: totalCapitalBRL >= 100_000,
    });
  }
  if (coveragePercent > 0) {
    milestones.push({
      label: "Renda cobre 50% dos gastos",
      achieved: coveragePercent >= 50,
    });
  }

  // Quando a meta de gastos mensais não está configurada, coveragePercent
  // é forçado a 0 por definição (não há meta para comparar a renda) — isso
  // não deve ser confundido com "0% de progresso patrimonial". Exibir
  // "0.0%" nesse caso, ao lado de um marco de patrimônio já batido, é
  // contraditório (bug real reportado: R$300k acumulados + milestone de
  // R$100k batido, mas headline mostrando 0.0%). Ver useFIProgress.ts.
  const needsGoalSetup = !isSetup && totalCapitalBRL > 0;

  const ariaLabel = isReached
    ? "Linha do horizonte: meta de independência financeira atingida"
    : needsGoalSetup
      ? `Linha do horizonte: patrimônio de ${capitalLabel}, configure sua meta de gastos para ver o progresso de renda`
      : `Linha do horizonte em ${coveragePercent.toFixed(0)}% de progresso`;

  if (hasNoAssets) {
    return (
      <div
        className="w-full flex flex-col gap-2 rounded-xl p-6"
        style={{ backgroundColor: "var(--h-paper-raised)", border: "1px solid var(--h-line)" }}
      >
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--h-ink-soft)" }}
        >
          Horizonte FI
        </span>
        <span
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--h-font-display)", color: "var(--h-ink)" }}
        >
          Registre seu primeiro aporte para começar sua jornada
        </span>
        <span className="text-sm" style={{ color: "var(--h-ink-soft)" }}>
          Assim que você adicionar um ativo à carteira, sua linha do horizonte
          rumo à independência financeira aparece aqui.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--h-ink-soft)" }}
        >
          Horizonte FI
        </span>
        <span
          className="text-4xl font-semibold"
          style={{
            fontFamily: "var(--h-font-display)",
            color: isReached ? "var(--h-accent-strong)" : "var(--h-ink)",
          }}
        >
          {isReached
            ? "Meta atingida"
            : needsGoalSetup
              ? capitalLabel
              : `${coveragePercent.toFixed(1)}%`}
        </span>
        <span className="text-sm" style={{ color: "var(--h-ink-soft)" }}>
          {needsGoalSetup
            ? "acumulados · configure sua meta de gastos mensais para ver o progresso de renda"
            : `${capitalLabel} acumulados${!isReached && monthsLabel ? ` · faltam ${monthsLabel}` : ""}`}
        </span>
      </header>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="w-full h-24 rounded-xl"
        style={{ backgroundColor: "var(--h-paper-raised)" }}
      />

      {milestones.length > 0 && (
        <ul
          className="flex flex-wrap gap-2 pt-3 mt-1"
          style={{ borderTop: "1px solid var(--h-line)" }}
        >
          {milestones.map((milestone) => (
            <li
              key={milestone.label}
              className="text-xs px-3 py-1 rounded-full border"
              style={{
                borderColor: milestone.achieved ? "var(--h-accent)" : "var(--h-line)",
                color: milestone.achieved ? "var(--h-accent-strong)" : "var(--h-ink-faint)",
                backgroundColor: milestone.achieved
                  ? "color-mix(in srgb, var(--h-accent) 12%, transparent)"
                  : "transparent",
              }}
            >
              {milestone.achieved ? "✓ " : ""}
              {milestone.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
