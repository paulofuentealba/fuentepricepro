import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useAuth } from "./auth-provider";
import type { PortfolioSnapshot } from "./portfolioSnapshot";

/**
 * Ponto de trajetória histórica derivado de um documento de
 * `users/{uid}/portfolioSnapshots/{YYYY-MM-DD}`.
 *
 * `totalValueBRL` é `null` quando o documento foi criado por backfill
 * retroativo (ver `portfolioSnapshotBackfill.ts`) e não tem valor de mercado
 * real disponível pra aquela data — nunca é interpolado/inventado.
 */
export interface HorizonteTrajectoryPoint {
  date: string; // YYYY-MM-DD
  totalValueBRL: number | null;
  totalInvestedBRL: number;
  coveragePercent: number | null;
}

/** Mínimo de pontos com dado real antes de valer a pena desenhar a sparkline. */
export const MIN_TRAJECTORY_POINTS_FOR_SPARKLINE = 7;

/**
 * Constrói a série ordenada por data a partir dos documentos brutos do
 * Firestore. Função pura, sem side-effects — testável isoladamente.
 *
 * `monthlyLivingCostGoal` é opcional: quando fornecido (> 0), calcula
 * `coveragePercent` para cada ponto histórico (renda mensal não é
 * reconstruível do snapshot diário, então isso fica fora do escopo por ora —
 * `coveragePercent` é sempre `null` neste primeiro corte, reservado pra
 * evolução futura).
 */
export function buildTrajectorySeries(
  docs: Array<
    Partial<Omit<PortfolioSnapshot, "totalValueBRL">> & {
      date: string;
      totalValueBRL?: number | null;
    }
  >,
): HorizonteTrajectoryPoint[] {
  return [...docs]
    .filter((d) => typeof d.date === "string" && d.date.length > 0)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((d) => ({
      date: d.date,
      totalValueBRL: typeof d.totalValueBRL === "number" ? d.totalValueBRL : null,
      totalInvestedBRL: typeof d.totalInvestedBRL === "number" ? d.totalInvestedBRL : 0,
      coveragePercent: null,
    }));
}

export interface HorizonteTrajectoryResult {
  points: HorizonteTrajectoryPoint[];
  isLoading: boolean;
  /** `true` quando há pontos suficientes pra desenhar uma sparkline útil. */
  hasEnoughDataForSparkline: boolean;
}

/**
 * Lê a série completa de `users/{uid}/portfolioSnapshots/*` (ordenada por
 * data) e retorna a trajetória pronta pra plotar.
 *
 * Não escreve nada — reaproveita a coleção que `usePortfolioSnapshot` já
 * popula diariamente, mais os documentos retroativos criados pelo backfill
 * (`useHorizonteBackfill`, ação explícita e separada).
 */
export function useHorizonteTrajectory(): HorizonteTrajectoryResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["horizonteTrajectory", user?.uid ?? "local"],
    queryFn: async () => {
      if (!user?.uid) return [] as HorizonteTrajectoryPoint[];
      const ref = collection(db, "users", user.uid, "portfolioSnapshots");
      const q = query(ref, orderBy("date", "asc"));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ date: d.id, ...d.data() }) as any);
      return buildTrajectorySeries(docs);
    },
    enabled: Boolean(user?.uid),
    staleTime: 5 * 60_000,
  });

  const points = useMemo(() => data ?? [], [data]);

  return {
    points,
    isLoading,
    hasEnoughDataForSparkline: points.length >= MIN_TRAJECTORY_POINTS_FOR_SPARKLINE,
  };
}
