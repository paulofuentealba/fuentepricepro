import "dotenv/config";
import { getAdminFirestore } from "../src/integrations/firebase/admin";
import { recalculateInvestingSinceFromTransactions } from "../src/lib/transactionsLogic";

/**
 * Script de backfill / correção retroativa para o campo investing_since em users/{uid}/assets.
 *
 * USO:
 * - Dry-run (padrão, apenas simula e lista alterações):
 *   npx tsx scripts/fix_investing_since_backfill.ts <UID_OU_EMAIL>
 * - Execução real de persistência:
 *   npx tsx scripts/fix_investing_since_backfill.ts <UID_OU_EMAIL> --apply
 */
async function run() {
  const isApply = process.argv.includes("--apply");
  const target = process.argv.slice(2).find((arg) => !arg.startsWith("-")) || "7HJpDAnoXzaUvaSjPAyAKnhulNh2";

  const adminDb = getAdminFirestore();
  if (!adminDb) {
    console.error("Firestore Admin indisponível.");
    return;
  }

  console.log(`\n================ BACKFILL INVESTING_SINCE ================\nModo: ${isApply ? "🔴 GRAVAÇÃO EM PRODUÇÃO" : "🟡 DRY-RUN (SOMENTE LEITURA)"}`);
  console.log(`Target: ${target}\n`);

  const assetsSnap = await adminDb.collection(`users/${target}/assets`).get();
  console.log(`Total de documentos em users/${target}/assets: ${assetsSnap.size}`);

  let updatedCount = 0;

  for (const doc of assetsSnap.docs) {
    const data = doc.data();
    const ticker = data.ticker;
    if (!ticker) continue;

    const txSnap = await adminDb
      .collection(`users/${target}/transactions`)
      .where("ticker", "==", ticker)
      .get();

    const txs = txSnap.docs.map((d) => d.data() as any);
    const computedSince = recalculateInvestingSinceFromTransactions(txs);

    if (computedSince != null) {
      const storedSince = data.investing_since
        ? new Date(data.investing_since).getTime()
        : (data.investingSince ? new Date(data.investingSince).getTime() : null);

      if (!storedSince || computedSince < storedSince) {
        updatedCount++;
        const oldIso = storedSince ? new Date(storedSince).toISOString().slice(0, 10) : "N/A";
        const newIso = new Date(computedSince).toISOString().slice(0, 10);

        console.log(
          `[CORRIGIR] ${ticker.padEnd(8)} | Anterior: ${oldIso} -> Novo: ${newIso} (${isApply ? "Atualizado" : "Simulado"})`
        );

        if (isApply) {
          await doc.ref.update({
            investing_since: new Date(computedSince).toISOString(),
            investingSince: computedSince,
          });
        }
      }
    }
  }

  console.log(`\n---------------- RESUMO ----------------`);
  console.log(`Ativos a atualizar: ${updatedCount}`);
  if (!isApply) {
    console.log(`⚠️ Nenhuma alteração foi persistida no Firestore. Para aplicar, execute com --apply.`);
  } else {
    console.log(`✅ ${updatedCount} ativos atualizados com sucesso no Firestore.`);
  }
  console.log(`========================================\n`);
}

run().catch(console.error);
