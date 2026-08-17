import "dotenv/config";
import { getAdminFirestore } from "../src/integrations/firebase/admin";
import { fetchDadosDeMercado } from "../src/lib/api/dadosDeMercadoScraper.server";

const BATCH_SIZE = 5;
const DELAY_MS = 2000;

async function runScraperJob() {
  const adminDb = getAdminFirestore();
  if (!adminDb) {
    console.error("Firestore indisponível.");
    process.exit(1);
  }

  console.log("[Scraper] Iniciando job de Dados de Mercado...");

  // Coleta todos os ativos que os usuários possuem (ou apenas BR)
  const usersSnap = await adminDb.collection("users").get();
  const tickerSet = new Set<string>();

  for (const userDoc of usersSnap.docs) {
    const assetsSnap = await adminDb.collection(`users/${userDoc.id}/assets`).get();
    for (const assetDoc of assetsSnap.docs) {
      // assetDoc.id é algo como "STOCK_BR_PETR4"
      const parts = assetDoc.id.split("_");
      const ticker = parts[parts.length - 1];
      // Scraping só faz sentido para ativos listados na B3
      if (/^[A-Z]{4}\d{1,2}$/.test(ticker)) {
        tickerSet.add(ticker);
      }
    }
  }

  const tickers = Array.from(tickerSet);
  console.log(`[Scraper] Encontrados ${tickers.length} tickers brasileiros únicos.`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
    const batch = tickers.slice(i, i + BATCH_SIZE);
    console.log(`[Scraper] Processando lote ${i / BATCH_SIZE + 1}:`, batch);

    const promises = batch.map(async (ticker) => {
      try {
        const res = await fetchDadosDeMercado(ticker);
        if (res) success++;
        else failed++;
      } catch (err) {
        console.error(`[Scraper] Falha ao processar ${ticker}:`, err);
        failed++;
      }
    });

    await Promise.all(promises);

    if (i + BATCH_SIZE < tickers.length) {
      await new Promise(r => setTimeout(r, DELAY_MS)); // Rate limiting
    }
  }

  console.log(`\n[Scraper] Concluído! Sucesso: ${success}, Falhas: ${failed}`);
  process.exit(0);
}

runScraperJob().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
