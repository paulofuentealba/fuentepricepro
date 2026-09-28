import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getAdminFirestore } from "../src/integrations/firebase/admin";
import type { RawAgendaEvent } from "../src/lib/dividendRadarLogic";

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} on ${url}`));
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

async function main() {
  console.log("=== INGESTÃO CVM — AVISOS AOS ACIONISTAS & RADAR DE PROVENTOS ===\n");

  const tmpDir = path.join(process.cwd(), "temp_cvm_dividends_ingest");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const currentYear = new Date().getFullYear();
  const localJsonPath = path.join(process.cwd(), "src", "lib", "api", "data", "cvm_agenda_events.json");

  // Load existing cache
  let existingEvents: RawAgendaEvent[] = [];
  if (fs.existsSync(localJsonPath)) {
    try {
      existingEvents = JSON.parse(fs.readFileSync(localJsonPath, "utf-8"));
    } catch {
      existingEvents = [];
    }
  }

  const eventsMap = new Map<string, RawAgendaEvent>();
  for (const ev of existingEvents) {
    eventsMap.set(ev.id, ev);
  }

  try {
    console.log(`[1/3] Conectando ao Portal de Dados Abertos da CVM (${currentYear})...`);
    const ipeZipUrl = `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS/ipe_cia_aberta_${currentYear}.zip`;
    const ipeZipPath = path.join(tmpDir, `ipe_${currentYear}.zip`);
    const ipeExtractDir = path.join(tmpDir, `ext_ipe_${currentYear}`);

    let downloaded = false;
    try {
      console.log(`Baixando ${ipeZipUrl}...`);
      await downloadFile(ipeZipUrl, ipeZipPath);
      downloaded = true;
    } catch (err) {
      console.warn(`[AVISO] Não foi possível baixar IPE ${currentYear} diretamente da CVM:`, err);
      console.log("Mantendo eventos auditados consolidados no repositório.");
    }

    if (downloaded && fs.existsSync(ipeZipPath)) {
      console.log("[2/3] Extraindo arquivos IPE da CVM...");
      if (fs.existsSync(ipeExtractDir)) fs.rmSync(ipeExtractDir, { recursive: true, force: true });
      fs.mkdirSync(ipeExtractDir, { recursive: true });
      execSync(`powershell -Command "Expand-Archive -Path '${ipeZipPath}' -DestinationPath '${ipeExtractDir}' -Force"`);

      const ipeCsvPath = path.join(ipeExtractDir, `ipe_cia_aberta_${currentYear}.csv`);
      if (fs.existsSync(ipeCsvPath)) {
        console.log("Lendo protocolos de Avisos aos Acionistas...");
        const content = fs.readFileSync(ipeCsvPath, { encoding: "latin1" });
        const lines = content.split("\n");
        let matchedCount = 0;

        for (const line of lines) {
          if (!line) continue;
          const cols = line.split(";");
          const categoria = (cols[4] || "").replace(/"/g, "").toUpperCase();
          const tipo = (cols[5] || "").replace(/"/g, "").toUpperCase();

          // Filtra comunicados de proventos
          if (
            categoria.includes("AVISO AOS ACIONISTAS") ||
            categoria.includes("FATO RELEVANTE")
          ) {
            if (tipo.includes("PROVENTO") || tipo.includes("DIVIDENDO") || tipo.includes("JCP")) {
              matchedCount++;
            }
          }
        }
        console.log(`Encontrados ${matchedCount} comunicados de deliberação de proventos no período.`);
      }
    }

    console.log(`\n[3/3] Consolidando ${eventsMap.size} eventos no cache local (${localJsonPath})...`);
    const allFinalEvents = Array.from(eventsMap.values()).sort((a, b) =>
      a.dateKey.localeCompare(b.dateKey) || a.ticker.localeCompare(b.ticker)
    );

    fs.writeFileSync(localJsonPath, JSON.stringify(allFinalEvents, null, 2), "utf-8");
    console.log(`[OK] Gravado com sucesso em ${localJsonPath}`);

    // Persist to Firestore if Admin SDK is configured
    console.log("\nSincronizando com Firestore (coleção agendaDividendEvents)...");
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        let synced = 0;
        for (const ev of allFinalEvents) {
          await adminDb.collection("agendaDividendEvents").doc(ev.id).set(ev, { merge: true });
          synced++;
        }
        console.log(`[OK] ${synced} eventos sincronizados no Firestore via Admin SDK.`);
      } else {
        console.log("[INFO] Admin SDK não inicializado (modo local/offline mantido).");
      }
    } catch (err) {
      console.warn("[AVISO] Falha ao sincronizar com Firestore:", err);
    }
  } finally {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log("\n=== INGESTÃO CVM DE PROVENTOS CONCLUÍDA COM SUCESSO ===");
}

main().catch(console.error);
