import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { PlusCircle } from "lucide-react";
import { useFIProgress } from "@/lib/useFIProgress";
import { useValuedPortfolio } from "@/lib/useValuedPortfolio";
import { useTransactions } from "@/lib/transactions";
import { useHorizonteTrajectory } from "@/lib/horizonteTrajectory";
import { getMonthlyNetContribution } from "@/lib/selectors/monthlyContribution";
import { formatCurrency, formatMonthsAsYearsMonths } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useQuery } from "@tanstack/react-query";
import { exchangeRateQueryOptions } from "@/lib/queryOptions";
import { convertCurrency } from "@/lib/currency";
import { useI18n } from "@/lib/i18n-provider";

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

function drawHorizon(canvas: HTMLCanvasElement, levelPercent: number, alwaysShowFloor: boolean) {
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

  const accent = readColor("--primary", "#2c6b63");
  const accentStrong = readColor("--primary", "#1f4e47");
  const line = readColor("--border", "#e0d9cc");

  const clampedLevel = Math.min(100, Math.max(0, levelPercent));
  // Piso visual mínimo: mesmo em progresso perto de 0%, a faixa preenchida
  // precisa ocupar uma fração perceptível do canvas — do contrário o card
  // vira um retângulo quase vazio, sem função visual clara. Isso é só
  // cosmético (não altera o valor numérico exibido no header).
  const MIN_VISUAL_LEVEL_PERCENT = 8;
  const displayLevel = clampedLevel > 0 || alwaysShowFloor
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

  // Preenchimento "chão" com gradiente do accent até transparente.
  // Nota: não usar `${accent}00` (hack de alpha via sufixo hex) — o token
  // --primary pode estar em um formato de cor moderno (definido em
  // styles.css) cuja forma "<cor>00" não é válida como string CSS, o que
  // faz addColorStop lançar exceção e o preenchimento inteiro falhar
  // silenciosamente (bug real encontrado durante a correção do canvas em
  // branco: o piso visual por si só não bastava, porque este addColorStop
  // já quebrava o fill em qualquer nível). "transparent" funciona
  // independente do formato de cor usado no token.
  const gradient = ctx.createLinearGradient(0, height, 0, levelY);
  gradient.addColorStop(0, accentStrong);
  gradient.addColorStop(1, "transparent");

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

/**
 * Sparkline discreta da trajetória histórica (item 5.6 / prompt 78). Usa
 * `totalValueBRL` quando disponível (dias em que o snapshot diário real já
 * rodou) e cai pra `totalInvestedBRL` nos dias de backfill retroativo (sem
 * valor de mercado histórico real) — só pra manter a linha contínua
 * visualmente, nunca inventa/interpola um valor de mercado.
 */
function HorizonteTrajectorySparkline({
  points,
}: {
  points: { date: string; totalValueBRL: number | null; totalInvestedBRL: number }[];
}) {
  const width = 240;
  const height = 32;
  const values = points.map((p) => p.totalValueBRL ?? p.totalInvestedBRL);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-full max-w-[240px] text-primary"
      role="img"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HorizonteHero() {
  const { coveragePercent, isReached, totalCapitalBRL, monthsToFI, isSetup, monthlyIncomeBRL } =
    useFIProgress();
  const { locale, t } = useI18n();
  const { items, isAppLoading, valuedItems } = useValuedPortfolio();
  const { transactions = [] } = useTransactions();
  const { points: trajectoryPoints, hasEnoughDataForSparkline } = useHorizonteTrajectory();
  const { data: fx } = useQuery(exchangeRateQueryOptions());
  const hasNoAssets = !isAppLoading && items.length === 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [, forceRedraw] = useState(0);
  const navigate = useNavigate();

  // Quando a meta de gastos mensais não está configurada, coveragePercent
  // é forçado a 0 por definição (não há meta para comparar a renda) — isso
  // não deve ser confundido com "0% de progresso patrimonial". Exibir
  // "0.0%" nesse caso, ao lado de um marco de patrimônio já batido, é
  // contraditório (bug real reportado: R$300k acumulados + milestone de
  // R$100k batido, mas headline mostrando 0.0%). Ver useFIProgress.ts.
  //
  // Pelo mesmo motivo, o canvas do horizonte precisa de um piso visual
  // (MIN_VISUAL_LEVEL_PERCENT) mesmo com coveragePercent === 0 nesse caso
  // específico — do contrário o card fica com o canvas em branco (bug
  // reportado: conta com patrimônio > 0 mas sem meta configurada).
  const needsGoalSetup = !isSetup && totalCapitalBRL > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      drawHorizon(canvas, coveragePercent, needsGoalSetup);
      return;
    }

    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / EASE_OUT_DURATION_MS);
      const eased = easeOutCubic(progress);
      const currentLevel = coveragePercent * eased;

      drawHorizon(canvas, currentLevel, needsGoalSetup);

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
  }, [coveragePercent, needsGoalSetup]);

  // Redesenha ao trocar tema claro/escuro (tokens de cor mudam via CSS,
  // mas o canvas precisa ser repintado manualmente).
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      forceRedraw((n) => n + 1);
      const canvas = canvasRef.current;
      if (canvas) drawHorizon(canvas, coveragePercent, needsGoalSetup);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [coveragePercent, needsGoalSetup]);

  // Redesenha em resize (canvas responsivo)
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) drawHorizon(canvas, coveragePercent, needsGoalSetup);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [coveragePercent, needsGoalSetup]);

  const monthsLabel = formatMonthsAsYearsMonths(monthsToFI ?? 0, {
    year: t.common.year,
    years: t.common.years,
    month: t.common.month,
    months: t.common.months,
    separator: t.common.durationSeparator,
    lessThanOneMonth: t.common.lessThanOneMonth,
  });
  const capitalLabel = formatCurrency(totalCapitalBRL, "BRL", locale);
  const passiveIncomeLabel = formatCurrency(monthlyIncomeBRL, "BRL", locale);

  // Aporte deste mês — mesmo cálculo usado anteriormente em app/index.tsx,
  // movido para dentro do hero (item 3 da spec de correção). Mesmo padrão de
  // conversão de moeda de useFIProgress.ts (USD -> BRL via
  // exchangeRateQueryOptions; demais moedas passam direto).
  const usdRate = fx?.USDBRL ?? 5.5;
  const currencyByTicker = useMemo(() => {
    const map: Record<string, "BRL" | "USD"> = {};
    for (const item of valuedItems) map[item.ticker] = item.currency;
    return map;
  }, [valuedItems]);
  const convertToBRL = (value: number, curr: "USD" | "BRL") =>
    convertCurrency(value, curr, "BRL", usdRate);
  const monthlyContribution = useMemo(
    () => getMonthlyNetContribution(transactions, Date.now(), convertToBRL, currencyByTicker),
    [transactions, usdRate, currencyByTicker],
  );
  const monthlyContributionLabel = formatCurrency(monthlyContribution, "BRL", locale);

  const milestones: { label: string; achieved: boolean }[] = [];
  if (totalCapitalBRL > 0) {
    milestones.push({
      label: t.home.milestoneFirst100k,
      achieved: totalCapitalBRL >= 100_000,
    });
  }
  if (coveragePercent > 0) {
    milestones.push({
      label: t.home.milestoneHalfCoverage,
      achieved: coveragePercent >= 50,
    });
  }

  const ariaLabel = isReached
    ? t.home.ariaGoalReached
    : needsGoalSetup
      ? t.home.ariaConfigureGoal.replace("{{capital}}", capitalLabel)
      : t.home.ariaProgress.replace("{{percent}}", coveragePercent.toFixed(0));

  const content = hasNoAssets ? (
    <div className="w-full flex flex-col gap-2 rounded-xl bg-card border border-border p-6">
      <span className="text-xs font-display font-medium uppercase tracking-widest text-muted-foreground">
        {t.tabs.financialIndependence}
      </span>
      <span className="text-2xl font-semibold font-serif text-foreground">
        {t.home.emptyTitle}
      </span>
      <span className="text-sm text-muted-foreground">
        {t.home.heroEmptySubtitle}
      </span>
      <div>
        <Button
          size="sm"
          className="mt-2 gap-1.5"
          onClick={() => navigate({ to: "/app/add-asset" })}
        >
          <PlusCircle className="h-4 w-4" />
          {t.home.registerContribution}
        </Button>
      </div>
    </div>
  ) : (
    <div className="w-full flex flex-col gap-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {t.tabs.financialIndependence}
          </span>
          <span
            className={`text-4xl font-semibold font-serif ${isReached ? "text-primary" : "text-foreground"}`}
          >
            {isReached
              ? t.home.goalReached
              : needsGoalSetup
                ? capitalLabel
                : `${coveragePercent.toFixed(1)}%`}
          </span>
          {needsGoalSetup ? (
            <Link
              to="/app/myportfolio"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"
              aria-label={t.home.ariaConfigureGoal.replace("{{capital}}", capitalLabel)}
            >
              {t.home.accumulatedConfigure}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">
              {`${capitalLabel} ${t.home.accumulated}${
                !isReached && monthsLabel ? ` · ${t.home.remaining.replace("{{months}}", monthsLabel)}` : ""
              }`}
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end shrink-0">
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="flex items-center gap-1 text-xs font-display text-muted-foreground">
              {t.home.contributionThisMonth}
              <InfoTooltip content={t.home.contributionThisMonthTooltip} />
            </span>
            <span className="text-sm font-mono font-medium text-foreground">{monthlyContributionLabel}</span>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <span className="text-xs font-display text-muted-foreground">{t.home.passiveIncomeNow}</span>
            <span className="text-sm font-mono font-medium text-foreground">
              {passiveIncomeLabel}
              <span className="text-xs font-display text-muted-foreground">{t.home.perMonth}</span>
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => navigate({ to: "/app/add-asset" })}
          >
            <PlusCircle className="h-4 w-4" />
            {t.home.registerContribution}
          </Button>
        </div>
      </header>

      <canvas
        ref={canvasRef}
        role="img"
        aria-label={ariaLabel}
        className="w-full h-24 rounded-xl bg-card"
      />

      {hasEnoughDataForSparkline && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-display text-muted-foreground">{t.home.trajectorySparklineLabel}</span>
          <HorizonteTrajectorySparkline points={trajectoryPoints} />
        </div>
      )}

      {milestones.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-3 mt-1 border-t border-border">
          {milestones.map((milestone) => (
            <li
              key={milestone.label}
              className={`text-xs font-display px-3 py-1 rounded-full border ${
                milestone.achieved
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground"
              }`}
            >
              {milestone.achieved ? "✓ " : ""}
              {milestone.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return <>{content}</>;
}
