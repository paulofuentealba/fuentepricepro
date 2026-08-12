import { useCallback, useState } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { useAuth } from "./auth-provider";
import { recalculateHoldingFromTransactions, type Transaction } from "./transactions";

/**
 * Documento de backfill retroativo. Deliberadamente distinto de
 * `PortfolioSnapshot` (`portfolioSnapshot.ts`, não alterado por este
 * arquivo): `totalValueBRL` é `null` porque valor de mercado histórico por
 * ativo não é reconstruído (ver investigação no relatório do prompt 78 —
 * `docs/Prompts/RESULTADO - 78 — Trajetoria Historica Horizonte.md`).
 *
 * Só `totalInvestedBRL` (capital investido/custo) é preciso aqui — é
 * 100% reconstruível a partir de quantidade × preço pago em cada
 * transação, sem depender de preço de mercado em datas passadas.
 */
export interface BackfilledSnapshot {
  date: string; // YYYY-MM-DD
  totalValueBRL: null;
  totalInvestedBRL: number;
  createdAt: number;
  backfilled: true;
}

const MS_PER_DAY = 86_400_000;

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Converte preço na moeda do ativo para BRL. Usa a taxa de câmbio atual
 * (não uma taxa histórica na data da transação) — simplificação documentada:
 * taxas de câmbio históricas diárias por ativo estão fora do escopo deste
 * backfill (ver relatório do prompt 78).
 */
function toBRL(value: number, currency: "BRL" | "USD" | undefined, usdRate: number): number {
  if (currency === "USD") return value * usdRate;
  return value;
}

/**
 * Função pura: reconstrói os documentos de snapshot retroativos (só
 * `totalInvestedBRL`) para cada dia corrido entre a primeira transação e
 * "ontem" (o dia de hoje é responsabilidade de `usePortfolioSnapshot`),
 * pulando datas que já têm snapshot (`existingDates`).
 *
 * Sem side-effects — só calcula o que precisaria ser escrito. A escrita real
 * fica em `useHorizonteBackfill`.
 */
export function computeBackfillSnapshots(
  transactions: Transaction[],
  existingDates: Set<string>,
  options: {
    asOfDate?: Date;
    currencyByTicker?: Record<string, "BRL" | "USD">;
    usdRate?: number;
  } = {},
): BackfilledSnapshot[] {
  if (!transactions || transactions.length === 0) return [];

  const asOfDate = options.asOfDate ?? new Date();
  const currencyByTicker = options.currencyByTicker ?? {};
  const usdRate = options.usdRate ?? 5.5;

  const sorted = [...transactions].sort((a, b) => a.date - b.date);
  const firstTxDate = new Date(sorted[0].date);
  firstTxDate.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(asOfDate);
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setTime(yesterday.getTime() - MS_PER_DAY);

  if (yesterday.getTime() < firstTxDate.getTime()) return [];

  // Agrupa transações por ticker uma vez (evita refiltrar a lista inteira
  // por dia × ticker).
  const txByTicker = new Map<string, Transaction[]>();
  for (const tx of sorted) {
    const list = txByTicker.get(tx.ticker) ?? [];
    list.push(tx);
    txByTicker.set(tx.ticker, list);
  }

  const results: BackfilledSnapshot[] = [];
  const cursor = new Date(firstTxDate);

  while (cursor.getTime() <= yesterday.getTime()) {
    const dateStr = toDateStr(cursor);
    const cutoff = cursor.getTime() + MS_PER_DAY - 1; // fim do dia (inclusivo)

    if (!existingDates.has(dateStr)) {
      let totalInvestedBRL = 0;

      for (const [ticker, txs] of txByTicker) {
        const txsUpToDate = txs.filter((tx) => tx.date <= cutoff);
        if (txsUpToDate.length === 0) continue;

        const { quantity, averagePrice } = recalculateHoldingFromTransactions(txsUpToDate);
        if (quantity <= 0) continue;

        const costBRL = toBRL(quantity * averagePrice, currencyByTicker[ticker], usdRate);
        totalInvestedBRL += costBRL;
      }

      // Só registra o dia se havia alguma posição aberta (evita poluir a
      // coleção com dias em que a carteira estava zerada).
      if (totalInvestedBRL > 0) {
        results.push({
          date: dateStr,
          totalValueBRL: null,
          totalInvestedBRL: Math.round(totalInvestedBRL * 100) / 100,
          createdAt: Date.now(),
          backfilled: true,
        });
      }
    }

    cursor.setTime(cursor.getTime() + MS_PER_DAY);
  }

  return results;
}

const FIRESTORE_BATCH_LIMIT = 400; // margem de segurança abaixo do limite real de 500

/**
 * Hook de ação explícita (não roda no carregamento normal da tela) que
 * varre `Transaction[]` do usuário, calcula os dias retroativos ainda sem
 * snapshot e grava os documentos de backfill em lotes.
 *
 * Não escreve `totalValueBRL` (fica `null`) — decisão tomada após investigar
 * `fetchAssetPriceHistoryFn`/Yahoo Finance: cobertura incerta pra ativos BR
 * de baixa liquidez e custo de chamadas externas por ativo × usuário tornam
 * o backfill de valor de mercado real caro/arriscado. Ver relatório do
 * prompt 78 pra detalhes.
 */
export function useHorizonteBackfill() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{ written: number } | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const runBackfill = useCallback(
    async (
      transactions: Transaction[],
      currencyByTicker: Record<string, "BRL" | "USD">,
      usdRate: number,
    ): Promise<{ written: number }> => {
      if (!user?.uid) return { written: 0 };

      setIsRunning(true);
      setError(null);
      try {
        const ref = collection(db, "users", user.uid, "portfolioSnapshots");
        const existingSnap = await getDocs(ref);
        const existingDates = new Set(existingSnap.docs.map((d) => d.id));

        const toWrite = computeBackfillSnapshots(transactions, existingDates, {
          currencyByTicker,
          usdRate,
        });

        for (let i = 0; i < toWrite.length; i += FIRESTORE_BATCH_LIMIT) {
          const chunk = toWrite.slice(i, i + FIRESTORE_BATCH_LIMIT);
          const batch = writeBatch(db);
          for (const snapshotDoc of chunk) {
            const docRef = doc(db, "users", user.uid, "portfolioSnapshots", snapshotDoc.date);
            batch.set(docRef, snapshotDoc, { merge: true });
          }
          await batch.commit();
        }

        const result = { written: toWrite.length };
        setLastResult(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      } finally {
        setIsRunning(false);
      }
    },
    [user?.uid],
  );

  return { runBackfill, isRunning, lastResult, error };
}
