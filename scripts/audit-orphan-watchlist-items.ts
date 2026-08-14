import "dotenv/config";
import { getAdminFirestore, isFirebaseAdminConfigured } from "../src/integrations/firebase/admin";

/**
 * Script de Auditoria Somente-Leitura (Prompt 99 — Tarefa 4):
 * Lista itens da sub-coleção `assets` em `users/{uid}/assets/{docId}` que
 * possuem `quantity === 0 && averagePrice === null`, causados por usuários
 * que abriram o modal "Novo Aporte", selecionaram um ticker e fecharam
 * a janela antes de salvar a transação.
 *
 * ESTRITAMENTE SOMENTE-LEITURA: Não deleta nem altera nenhum documento.
 *
 * Uso:
 *   npx tsx scripts/audit-orphan-watchlist-items.ts
 */

interface OrphanAsset {
  userUid: string;
  docId: string;
  ticker: string;
  name: string;
  type: string;
  quantity: number;
  averagePrice: number | null;
  addedAt: number | null;
  addedAtIso: string | null;
}

async function main() {
  console.log("[Auditoria Órfãos Watchlist — Prompt 99] Iniciando varredura somente-leitura...");

  if (!isFirebaseAdminConfigured()) {
    console.warn(
      "[Auditoria Órfãos Watchlist] Aviso: Credenciais do Firebase Admin SDK não encontradas no ambiente local.",
    );
    console.warn(
      "[Auditoria Órfãos Watchlist] O script requer FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL ou GOOGLE_APPLICATION_CREDENTIALS para rodar em produção.",
    );
    console.log("[Auditoria Órfãos Watchlist] Total de itens órfãos encontrados localmente: 0.");
    return;
  }

  const db = getAdminFirestore();
  if (!db) {
    console.error("[Auditoria Órfãos Watchlist] Erro: Não foi possível instanciar o Firestore Admin.");
    process.exit(1);
  }

  try {
    const snapshot = await db.collectionGroup("assets").get();
    console.log(`[Auditoria Órfãos Watchlist] Total de ativos inspecionados: ${snapshot.size}`);

    const orphans: OrphanAsset[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const quantity = typeof data.quantity === "number" ? data.quantity : 0;
      const averagePrice = typeof data.averagePrice === "number" ? data.averagePrice : null;

      if (quantity === 0 && (averagePrice === null || averagePrice === 0)) {
        const segments = doc.ref.path.split("/");
        const userUid = segments[1] || "unknown";
        const addedAt = typeof data.addedAt === "number" ? data.addedAt : null;
        orphans.push({
          userUid,
          docId: doc.id,
          ticker: data.ticker || doc.id,
          name: data.name || "",
          type: data.type || "UNKNOWN",
          quantity,
          averagePrice,
          addedAt,
          addedAtIso: addedAt ? new Date(addedAt).toISOString() : null,
        });
      }
    }

    console.log(`\n======================================================`);
    console.log(`RELATÓRIO DE ATIVOS ÓRFÃOS (QUANTITY = 0 & AVG_PRICE = NULL)`);
    console.log(`Total encontrados: ${orphans.length}`);
    console.log(`======================================================\n`);

    if (orphans.length > 0) {
      console.table(
        orphans.map((o) => ({
          "User UID": o.userUid,
          Ticker: o.ticker,
          Tipo: o.type,
          Qtd: o.quantity,
          "Preço Médio": o.averagePrice,
          "Criado em": o.addedAtIso || "N/A",
        })),
      );
    } else {
      console.log("Nenhum ativo órfão encontrado no banco.");
    }
  } catch (error) {
    console.error("[Auditoria Órfãos Watchlist] Erro durante a consulta ao Firestore:", error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[Auditoria Órfãos Watchlist] Erro fatal:", err);
  process.exit(1);
});
