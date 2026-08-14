import "dotenv/config";
import { getAdminFirestore, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";
import { classifyBr } from "../src/lib/classify";

/**
 * One-off backfill for the classifyYahoo ordering bug fixed in Prompt 86:
 * Brazilian FIIs added to a watchlist BEFORE that fix were persisted with
 * `type: "REIT"` (US Real Estate Investment Trust) instead of `type: "FII"`.
 * Re-running the (now-fixed) classifier only affects NEW assets — this
 * script corrects the data already saved in Firestore.
 *
 * The only Firestore location that stores a per-asset `type: AssetType`
 * field in this codebase is the `assets` sub-collection under each user
 * document (`users/{uid}/assets/{docId}`) — confirmed via `itemToRow()` in
 * `src/lib/watchlist.ts`. There is no separate `portfolio/` collection in
 * this project. A `collectionGroup("assets")` query scans that
 * sub-collection across every user in a single pass.
 *
 * Usage:
 *   npx tsx scripts/backfill-fii-reit-classification.ts --dry-run   (default; lists only, writes nothing)
 *   npx tsx scripts/backfill-fii-reit-classification.ts --execute   (writes the corrected `type` field)
 */

interface Candidate {
  path: string;
  ticker: string;
  currency: string | null;
}

async function main() {
  const execute = process.argv.includes("--execute");
  const mode = execute ? "EXECUTE" : "DRY-RUN";
  console.log(`[Backfill FII/REIT] Mode: ${mode}`);

  if (!isFirebaseAdminConfigured()) {
    console.error("[Backfill FII/REIT] Error: Firebase Admin SDK is not configured. Missing credentials.");
    process.exit(1);
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("[Backfill FII/REIT] Error: Could not initialize Firestore Admin instance.");
    process.exit(1);
  }

  const snap = await db.collectionGroup("assets").where("type", "==", "REIT").get();
  console.log(`[Backfill FII/REIT] Total documents with type="REIT": ${snap.size}`);

  const candidates: Candidate[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const ticker: string | undefined = data.ticker;
    const currency: string | undefined = data.currency;

    if (!ticker) continue;

    // Brazilian assets are stored with currency "BRL" — the raw `ticker`
    // field never carries a ".SA" suffix (stripped by cleanTicker() on
    // every save/load), so currency is the reliable signal here.
    const looksBrazilian = currency === "BRL";
    if (!looksBrazilian) continue;

    if (classifyBr(ticker) === "FII") {
      candidates.push({ path: doc.ref.path, ticker, currency: currency ?? null });
    }
  }

  console.log(`[Backfill FII/REIT] Total false-REITs found (should be FII): ${candidates.length}`);
  if (candidates.length > 0) {
    console.log("[Backfill FII/REIT] Affected documents:");
    for (const c of candidates) {
      console.log(`  - ${c.path}  (ticker: ${c.ticker}, currency: ${c.currency})`);
    }
    const tickers = [...new Set(candidates.map((c) => c.ticker))].sort();
    console.log(`[Backfill FII/REIT] Distinct tickers affected: ${tickers.join(", ")}`);
  }

  if (!execute) {
    console.log("[Backfill FII/REIT] Dry-run complete. No writes performed. Re-run with --execute to apply.");
    return;
  }

  if (candidates.length === 0) {
    console.log("[Backfill FII/REIT] Nothing to write.");
    return;
  }

  const batchSize = 400; // stay under Firestore's 500-write batch limit
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = db.batch();
    const chunk = candidates.slice(i, i + batchSize);
    for (const c of chunk) {
      batch.update(db.doc(c.path), { type: "FII" });
    }
    await batch.commit();
    console.log(`[Backfill FII/REIT] Committed batch of ${chunk.length} updates.`);
  }

  console.log(`[Backfill FII/REIT] Done. ${candidates.length} document(s) updated to type="FII".`);
}

main().catch((error) => {
  console.error("[Backfill FII/REIT] Fatal error:", error);
  process.exit(1);
});
