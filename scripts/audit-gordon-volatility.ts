import "dotenv/config";
import { getAdminFirestore, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";
import { calculateDividendGrowthVolatility } from "../src/lib/calculations";

/**
 * Script de Análise Somente-Leitura (Prompt 150 — Item 4):
 * Compara GORDON_MAX_GROWTH_VOLATILITY em dois limiares candidatos — 35%
 * (atual) vs 25% (mais rigoroso, padrão de analista institucional) —
 * contra o dividendHistory real de todos os ativos disponíveis na coleção
 * `assets`, para gerar dado empírico em vez de decidir no escuro.
 *
 * ESTRITAMENTE SOMENTE-LEITURA: não escreve nem apaga nenhum documento, e
 * não altera GORDON_MAX_GROWTH_VOLATILITY em calculations.ts.
 *
 * Isolamento dev/prod (Regra 3, AGENTS.md): reutiliza getAdminFirestore()
 * de src/integrations/firebase/admin.ts, que força o Admin SDK para o
 * emulador local (localhost:8080) sempre que NODE_ENV !== "production" —
 * este script NUNCA se conecta ao Firestore de produção quando rodado em
 * ambiente de desenvolvimento.
 *
 * Uso:
 *   npx tsx scripts/audit-gordon-volatility.ts
 */

const THRESHOLD_CURRENT = 0.35;
const THRESHOLD_CANDIDATE = 0.25;

type DividendYearPoint = { year: number; amount: number };

interface AssetVolatilityRow {
  ticker: string;
  type: string;
  historyYears: number;
  volatility: number;
  statusAt35: "alta" | "baixa";
  statusAt25: "alta" | "baixa";
}

function classify(volatility: number, threshold: number): "alta" | "baixa" {
  return volatility > threshold ? "baixa" : "alta";
}

async function main() {
  console.log("[Auditoria Gordon Volatility — Prompt 150] Iniciando análise somente-leitura...");

  if (!isFirebaseAdminConfigured()) {
    console.warn(
      "[Auditoria Gordon Volatility] Credenciais do Firebase Admin SDK não encontradas no ambiente local.",
    );
    console.log("[Auditoria Gordon Volatility] Nenhum dado real disponível para análise.");
    return;
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("[Auditoria Gordon Volatility] Erro: não foi possível instanciar o Firestore Admin.");
    process.exit(1);
  }

  const snapshot = await db.collection("assets").get();
  console.log(`[Auditoria Gordon Volatility] Total de ativos na coleção 'assets': ${snapshot.size}`);

  const rows: AssetVolatilityRow[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const dividendHistory = Array.isArray(data.dividendHistory)
      ? (data.dividendHistory as DividendYearPoint[])
      : [];

    if (dividendHistory.length < 3) continue;

    const volatility = calculateDividendGrowthVolatility(dividendHistory);
    if (volatility == null) continue;

    rows.push({
      ticker: data.ticker || doc.id,
      type: data.type || "UNKNOWN",
      historyYears: dividendHistory.length,
      volatility,
      statusAt35: classify(volatility, THRESHOLD_CURRENT),
      statusAt25: classify(volatility, THRESHOLD_CANDIDATE),
    });
  }

  console.log(`\n======================================================`);
  console.log(`GORDON_MAX_GROWTH_VOLATILITY — 35% (atual) vs 25% (candidato)`);
  console.log(`Ativos com dividendHistory.length >= 3: ${rows.length}`);
  console.log(`======================================================\n`);

  if (rows.length === 0) {
    console.log("Nenhum ativo com histórico de dividendos suficiente (>= 3 anos) foi encontrado nesta base.");
    console.log("Sem dado real para gerar a tabela empírica solicitada — ver relatório de conclusão.");
    return;
  }

  console.table(
    rows.map((r) => ({
      Ticker: r.ticker,
      Tipo: r.type,
      "Anos histórico": r.historyYears,
      "Volatilidade": `${(r.volatility * 100).toFixed(1)}%`,
      "Status @35%": r.statusAt35,
      "Status @25%": r.statusAt25,
    })),
  );

  const highBoth = rows.filter((r) => r.statusAt35 === "alta" && r.statusAt25 === "alta").length;
  const divergent = rows.filter((r) => r.statusAt35 === "alta" && r.statusAt25 === "baixa").length;
  const lowBoth = rows.filter((r) => r.statusAt35 === "baixa" && r.statusAt25 === "baixa").length;

  console.log(`\n--- Contagem agregada ---`);
  console.log(`Confiança alta nos dois limiares: ${highBoth}`);
  console.log(`Confiança alta em 35% mas baixa em 25% (zona de divergência): ${divergent}`);
  console.log(`Confiança baixa nos dois: ${lowBoth}`);
  console.log(`Total de ativos que mudariam de alta -> baixa se o limiar caísse de 35% para 25%: ${divergent}`);
}

main().catch((err) => {
  console.error("[Auditoria Gordon Volatility] Erro fatal:", err);
  process.exit(1);
});
