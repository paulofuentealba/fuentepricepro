/**
 * Safe Administrative Remediation Script:
 * Purges contaminated demo transactions and demo assets from a specified user account in Firestore.
 *
 * Usage:
 *   npx tsx scripts/admin/purge-demo-from-user.ts --uid <USER_UID> [--execute]
 *   npx tsx scripts/admin/purge-demo-from-user.ts --email <USER_EMAIL> [--execute]
 *
 * Without `--execute`, it runs in DRY-RUN mode (safe inspection only, no mutations).
 */

import { getAdminFirestore, getAdminAuth } from "../../src/integrations/firebase/admin";
import { recalculateHoldingFromTransactions, type Transaction } from "../../src/lib/transactionsLogic";
import { DEV_MOCK_DATA, DEV_MOCK_TRANSACTIONS } from "../../src/__fixtures__/devMockData";

const DEMO_TX_IDS = new Set(DEV_MOCK_TRANSACTIONS.map((t) => t.id));
const DEMO_TICKERS = new Set(DEV_MOCK_DATA.map((d) => d.ticker));
const DEMO_TX_PREFIXES = [
  "bbas3-", "vale3-", "itub4-", "egie3-", "kncr11-", "mxrf11-", "cpts11-",
  "hglg11-", "bdif11-", "ifra11-", "juro11-", "rura11-", "snag11-", "ivvb11-",
  "o-", "stag-", "msft-", "jnj-", "mpw-", "vym-", "test-ipo-", "aapl-",
  "ko-", "schd-", "qqq-"
];

function isDemoTx(id: string, notes?: string | null): boolean {
  if (DEMO_TX_IDS.has(id)) return true;
  if (DEMO_TX_PREFIXES.some((prefix) => id.startsWith(prefix))) return true;
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const uidIdx = args.indexOf("--uid");
  const emailIdx = args.indexOf("--email");
  const isExecute = args.includes("--execute");

  let targetUid = uidIdx >= 0 ? args[uidIdx + 1] : null;
  const targetEmail = emailIdx >= 0 ? args[emailIdx + 1] : null;

  if (!targetUid && !targetEmail) {
    console.error("Erro: forneça --uid <UID> ou --email <EMAIL>");
    console.error("Exemplo: npx tsx scripts/admin/purge-demo-from-user.ts --email paulo@exemplo.com");
    process.exit(1);
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("Erro: Firebase Admin Firestore não pôde ser inicializado.");
    process.exit(1);
  }

  if (!targetUid && targetEmail) {
    const auth = getAdminAuth();
    if (!auth) {
      console.error("Erro: Firebase Admin Auth não pôde ser inicializado.");
      process.exit(1);
    }
    try {
      const userRecord = await auth.getUserByEmail(targetEmail);
      targetUid = userRecord.uid;
      console.log(`[Remediation] E-mail ${targetEmail} resolvido para UID: ${targetUid}`);
    } catch (err) {
      console.error(`Erro buscando usuário por e-mail ${targetEmail}:`, err);
      process.exit(1);
    }
  }

  console.log(`\n======================================================`);
  console.log(`PURGE DEMO DATA FROM USER: ${targetUid}`);
  console.log(`MODO: ${isExecute ? "EXECUÇÃO REAL (MUTATING)" : "DRY-RUN (SIMULAÇÃO SEGURA - NENHUM DADO SERÁ DELETADO)"}`);
  console.log(`======================================================\n`);

  // 1. Fetch all transactions
  const txRef = db.collection("users").doc(targetUid!).collection("transactions");
  const txSnap = await txRef.get();

  const demoTxsToDelete: { id: string; ticker: string }[] = [];
  const realTxsRemaining: Transaction[] = [];

  for (const docSnap of txSnap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const ticker = String(data.ticker || "").toUpperCase();

    if (isDemoTx(id, data.notes)) {
      demoTxsToDelete.push({ id, ticker });
    } else {
      realTxsRemaining.push({
        id,
        ticker,
        type: data.type || "buy",
        date: typeof data.date === "number" ? data.date : Date.now(),
        quantity: Number(data.quantity) || 0,
        pricePerShare: Number(data.pricePerShare) || 0,
        fees: typeof data.fees === "number" ? data.fees : null,
        factor: typeof data.factor === "number" ? data.factor : null,
      });
    }
  }

  console.log(`[Transações Encontradas] Total: ${txSnap.size}`);
  console.log(`  - Transações Demo a remover: ${demoTxsToDelete.length}`);
  console.log(`  - Transações Reais a preservar: ${realTxsRemaining.length}`);

  if (demoTxsToDelete.length > 0) {
    console.log(`\nPrimeiras transações demo identificadas:`);
    demoTxsToDelete.slice(0, 10).forEach((t) => console.log(`  - ID: ${t.id} (${t.ticker})`));
    if (demoTxsToDelete.length > 10) {
      console.log(`  ... e mais ${demoTxsToDelete.length - 10} transações.`);
    }
  }

  // 2. Fetch all assets
  const assetsRef = db.collection("users").doc(targetUid!).collection("assets");
  const assetsSnap = await assetsRef.get();

  const realTxsByTicker: Record<string, Transaction[]> = {};
  for (const tx of realTxsRemaining) {
    const t = tx.ticker.toUpperCase();
    if (!realTxsByTicker[t]) realTxsByTicker[t] = [];
    realTxsByTicker[t].push(tx);
  }

  const assetsToDelete: string[] = [];
  const assetsToRecalculate: { docId: string; ticker: string; oldQty: number; newQty: number; newAvgPrice: number }[] = [];

  for (const docSnap of assetsSnap.docs) {
    const data = docSnap.data();
    const ticker = String(data.ticker || "").toUpperCase();
    const docId = docSnap.id;
    const hasRealTxs = realTxsByTicker[ticker] && realTxsByTicker[ticker].length > 0;

    if (!hasRealTxs) {
      // Asset has NO real transactions left. If it matches a demo ticker, it's pure demo injection.
      if (DEMO_TICKERS.has(ticker) || ticker === "TEST_IPO_RECENTE") {
        assetsToDelete.push(docId);
      }
    } else {
      // Asset has genuine real transactions! Recalculate true holding without demo distortion
      const realHoldings = recalculateHoldingFromTransactions(realTxsByTicker[ticker]);
      if (data.quantity !== realHoldings.quantity || data.average_price !== realHoldings.averagePrice) {
        assetsToRecalculate.push({
          docId,
          ticker,
          oldQty: Number(data.quantity) || 0,
          newQty: realHoldings.quantity,
          newAvgPrice: realHoldings.averagePrice,
        });
      }
    }
  }

  console.log(`\n[Ativos Encontrados] Total: ${assetsSnap.size}`);
  console.log(`  - Ativos Demo puros a deletar: ${assetsToDelete.length}`);
  console.log(`  - Ativos Reais a recalcular (restaurando dados reais): ${assetsToRecalculate.length}`);

  if (assetsToDelete.length > 0) {
    console.log(`\nAtivos demo a serem deletados:`, assetsToDelete.join(", "));
  }

  if (assetsToRecalculate.length > 0) {
    console.log(`\nAtivos a recalcular:`);
    assetsToRecalculate.forEach((a) => {
      console.log(`  - ${a.ticker}: Qtd alterada de ${a.oldQty} para ${a.newQty} (PM real: R$ ${a.newAvgPrice})`);
    });
  }

  if (!isExecute) {
    console.log(`\n[DRY-RUN CONCLUÍDO] Nenhuma alteração foi realizada.`);
    console.log(`Para aplicar essas correções no Firestore, execute o comando com a flag --execute:`);
    console.log(`  npx tsx scripts/admin/purge-demo-from-user.ts ${targetUid ? `--uid ${targetUid}` : `--email ${targetEmail}`} --execute\n`);
    return;
  }

  // EXECUTE ACTIONS
  console.log(`\n[Executando exclusões e recálculos no Firestore...]`);

  // Delete demo transactions
  const chunkSize = 400;
  for (let i = 0; i < demoTxsToDelete.length; i += chunkSize) {
    const chunk = demoTxsToDelete.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((t) => {
      batch.delete(txRef.doc(t.id));
    });
    await batch.commit();
    console.log(`  ✓ Deletadas ${chunk.length} transações demo.`);
  }

  // Delete pure demo assets
  for (let i = 0; i < assetsToDelete.length; i += chunkSize) {
    const chunk = assetsToDelete.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((docId) => {
      batch.delete(assetsRef.doc(docId));
    });
    await batch.commit();
    console.log(`  ✓ Deletados ${chunk.length} ativos demo.`);
  }

  // Recalculate restored assets
  if (assetsToRecalculate.length > 0) {
    const batch = db.batch();
    assetsToRecalculate.forEach((a) => {
      const docRef = assetsRef.doc(a.docId);
      batch.update(docRef, {
        quantity: a.newQty,
        average_price: a.newAvgPrice,
      });
    });
    await batch.commit();
    console.log(`  ✓ Recalculados ${assetsToRecalculate.length} ativos para suas posições reais.`);
  }

  console.log(`\n🎉 SUCESSO! A conta ${targetUid} foi completamente limpa e restaurada.\n`);
}

main().catch((err) => {
  console.error("Erro fatal na execução do script de remediação:", err);
  process.exit(1);
});
