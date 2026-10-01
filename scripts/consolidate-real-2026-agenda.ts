import "dotenv/config";
import fs from "fs";
import path from "path";
import { RADAR_CATALOG, type RawAgendaEvent } from "../src/lib/dividendRadarLogic";
import { fetchDadosDeMercado } from "../src/lib/api/dadosDeMercadoScraper.server";
import { fetchFromYahoo } from "../src/lib/api/yahoo.server";
import { getAdminFirestore } from "../src/integrations/firebase/admin";

interface ExistingEvent {
  id: string;
  market: "BR" | "US";
  dateKey: string;
  month: number;
  ticker: string;
  name: string;
  type: string;
  currency: string;
  eventType: "com" | "pay";
  taxType: string;
  declaredAmount: number;
  reciprocalDate: string;
  isToday?: boolean;
}

function formatDateBr(isoOrDate: string): string {
  if (!isoOrDate) return "";
  const parts = isoOrDate.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoOrDate;
}

async function main() {
  console.log("=== CONSOLIDANDO AGENDA REAL DE PROVENTOS 2026 (SEM INVENTAR DADOS) ===");

  const localJsonPath = path.join(process.cwd(), "src", "lib", "api", "data", "cvm_agenda_events.json");

  // 1. Carrega eventos existentes já auditados (ex: Outubro e Setembro)
  let existing: ExistingEvent[] = [];
  if (fs.existsSync(localJsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(localJsonPath, "utf-8"));
    } catch {
      existing = [];
    }
  }

  const eventsMap = new Map<string, ExistingEvent>();
  for (const ev of existing) {
    eventsMap.set(ev.id, ev);
  }
  console.log(`Carregados ${eventsMap.size} eventos existentes do cache local.`);

  // 2. Itera sobre todos os ativos monitorados no Radar
  for (const asset of RADAR_CATALOG) {
    const ticker = asset.ticker.toUpperCase();
    console.log(`Processando ${ticker} (${asset.type}, ${asset.currency})...`);

    if (asset.currency === "BRL") {
      try {
        const dm = await fetchDadosDeMercado(ticker);
        if (dm && dm.dividendEvents) {
          for (const ev of dm.dividendEvents) {
            if (!ev.exDate) continue;
            const exDateKey = ev.exDate.split("T")[0];
            if (!exDateKey.startsWith("2026-")) continue;

            const monthCom = parseInt(exDateKey.substring(5, 7), 10);
            const payDateKey = ev.paymentDate ? ev.paymentDate.split("T")[0] : "";
            const taxType = asset.type === "FII" ? "rendimento_fii" : ev.isJCP ? "jcp" : "dividendo";

            // Evento DATA_COM
            const idCom = `br-${ticker.toLowerCase()}-${exDateKey.replace(/-/g, "")}-com`;
            if (!eventsMap.has(idCom)) {
              eventsMap.set(idCom, {
                id: idCom,
                market: "BR",
                dateKey: exDateKey,
                month: monthCom,
                ticker,
                name: asset.name,
                type: asset.type,
                currency: "BRL",
                eventType: "com",
                taxType,
                declaredAmount: ev.amountPerShare,
                reciprocalDate: formatDateBr(payDateKey),
              });
            }

            // Evento PAGAMENTO (se for em 2026)
            if (payDateKey && payDateKey.startsWith("2026-")) {
              const monthPay = parseInt(payDateKey.substring(5, 7), 10);
              const idPay = `br-${ticker.toLowerCase()}-${payDateKey.replace(/-/g, "")}-pay`;
              if (!eventsMap.has(idPay)) {
                eventsMap.set(idPay, {
                  id: idPay,
                  market: "BR",
                  dateKey: payDateKey,
                  month: monthPay,
                  ticker,
                  name: asset.name,
                  type: asset.type,
                  currency: "BRL",
                  eventType: "pay",
                  taxType,
                  declaredAmount: ev.amountPerShare,
                  reciprocalDate: formatDateBr(exDateKey),
                });
              }
            }
          }
        }
      } catch (err: any) {
        console.warn(`[AVISO] Falha ao ler proventos para ${ticker}:`, err.message);
      }
    } else {
      // US Assets
      try {
        const yh = await fetchFromYahoo(ticker);
        if (yh && yh.dividendEvents) {
          for (const ev of yh.dividendEvents) {
            if (!ev.exDate) continue;
            const exDateKey = ev.exDate.split("T")[0];
            if (!exDateKey.startsWith("2026-")) continue;

            const monthCom = parseInt(exDateKey.substring(5, 7), 10);
            const idCom = `us-${ticker.toLowerCase()}-${exDateKey.replace(/-/g, "")}-com`;
            if (!eventsMap.has(idCom)) {
              eventsMap.set(idCom, {
                id: idCom,
                market: "US",
                dateKey: exDateKey,
                month: monthCom,
                ticker,
                name: asset.name,
                type: asset.type,
                currency: "USD",
                eventType: "com",
                taxType: "us_cash",
                declaredAmount: ev.amountPerShare,
                reciprocalDate: "",
              });
            }
          }
        }
      } catch (err: any) {
        console.warn(`[AVISO] Falha ao ler proventos US para ${ticker}:`, err.message);
      }
    }
  }

  // 3. Ordenação determinística
  const allEvents = Array.from(eventsMap.values()).sort(
    (a, b) => a.dateKey.localeCompare(b.dateKey) || a.ticker.localeCompare(b.ticker) || a.eventType.localeCompare(b.eventType)
  );

  console.log(`\nTotal consolidado: ${allEvents.length} eventos reais de 2026.`);

  // Contagem por mês
  const counts: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) counts[m] = 0;
  for (const ev of allEvents) {
    counts[ev.month] = (counts[ev.month] || 0) + 1;
  }
  console.log("Distribuição real por mês:", counts);

  // 4. Salva no arquivo local
  fs.writeFileSync(localJsonPath, JSON.stringify(allEvents, null, 2), "utf-8");
  console.log(`[OK] Gravado com sucesso em ${localJsonPath}`);

  // 5. Salva no Firestore se admin SDK disponível
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      console.log("Sincronizando com Firestore (agendaDividendEvents)...");
      const batchSize = 400;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const chunk = allEvents.slice(i, i + batchSize);
        const batch = adminDb.batch();
        for (const ev of chunk) {
          batch.set(adminDb.collection("agendaDividendEvents").doc(ev.id), ev, { merge: true });
        }
        await batch.commit();
      }
      console.log(`[OK] Sincronizados no Firestore via Batch.`);
    }
  } catch (err: any) {
    console.warn("[AVISO] Firestore offline ou erro de sincronização:", err.message);
  }

  console.log("=== CONSOLIDAÇÃO CONCLUÍDA ===");
}

main().catch(console.error);
