import "dotenv/config";
import https from "https";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getAdminFirestore } from "../src/integrations/firebase/admin";

// Helper for downloading files
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} on ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function normalizeStr(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

interface EnrichedData {
  vpa: number | null;
  lpa: number | null;
  vacancy: number | null;
  updatedAt: string;
}

async function main() {
  console.log('=== CVM INGESTION JOB ===\n');

  const tmpDir = path.join(process.cwd(), 'temp_cvm_ingest');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const results: Record<string, EnrichedData> = {};

  try {
    // -------------------------------------------------------------
    // PARTE A: AÇÕES BR (DFP + FRE)
    // -------------------------------------------------------------
    console.log('[1/4] Baixando cadastro de companhias abertas (cad_cia_aberta.csv)...');
    const cadPath = path.join(tmpDir, 'cad_cia_aberta.csv');
    await downloadFile('https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv', cadPath);
    
    const cadContent = fs.readFileSync(cadPath, { encoding: 'latin1' });
    const cadLines = cadContent.split('\n');

    // Known ticker mappings for BR stocks
    const stockMap: Record<string, { cnpj: string; cdCvm: string; name: string }> = {
      'TAEE11': { cnpj: '07.859.971/0001-30', cdCvm: '020257', name: 'TAESA' },
      'PETR4': { cnpj: '33.000.167/0001-01', cdCvm: '009512', name: 'PETROBRAS' },
      'BBSE3': { cnpj: '17.344.597/0001-94', cdCvm: '023159', name: 'BB SEGURIDADE' },
      'VALE3': { cnpj: '33.592.510/0001-54', cdCvm: '004170', name: 'VALE' },
      'BBAS3': { cnpj: '00.000.000/0001-91', cdCvm: '001023', name: 'BANCO DO BRASIL' },
      'ITUB4': { cnpj: '60.872.504/0001-23', cdCvm: '019348', name: 'ITAU UNIBANCO' },
      'BBDC4': { cnpj: '60.746.948/0001-12', cdCvm: '000906', name: 'BRADESCO' },
      'WEGE3': { cnpj: '84.429.695/0001-11', cdCvm: '005410', name: 'WEG' },
    };

    console.log('[2/4] Processando DFP (BPP, DRE e FRE Capital Social)...');
    let dfpYear = 2025;
    let dfpZipPath = path.join(tmpDir, `dfp_${dfpYear}.zip`);
    let dfpExtractDir = path.join(tmpDir, `ext_dfp_${dfpYear}`);
    
    try {
      await downloadFile(`https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_${dfpYear}.zip`, dfpZipPath);
    } catch {
      dfpYear = 2024;
      dfpZipPath = path.join(tmpDir, `dfp_${dfpYear}.zip`);
      dfpExtractDir = path.join(tmpDir, `ext_dfp_${dfpYear}`);
      console.log(`Fallback para DFP ${dfpYear}...`);
      await downloadFile(`https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_${dfpYear}.zip`, dfpZipPath);
    }

    if (fs.existsSync(dfpExtractDir)) fs.rmSync(dfpExtractDir, { recursive: true, force: true });
    fs.mkdirSync(dfpExtractDir, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${dfpZipPath}' -DestinationPath '${dfpExtractDir}' -Force"`);

    // FRE for Shares
    let freZipPath = path.join(tmpDir, `fre_${dfpYear}.zip`);
    let freExtractDir = path.join(tmpDir, `ext_fre_${dfpYear}`);
    await downloadFile(`https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FRE/DADOS/fre_cia_aberta_${dfpYear}.zip`, freZipPath);
    if (fs.existsSync(freExtractDir)) fs.rmSync(freExtractDir, { recursive: true, force: true });
    fs.mkdirSync(freExtractDir, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${freZipPath}' -DestinationPath '${freExtractDir}' -Force"`);

    // Read BPP for Equity (CD_CONTA === '2.03')
    const bppPath = path.join(dfpExtractDir, `dfp_cia_aberta_BPP_con_${dfpYear}.csv`);
    const bppLines = fs.readFileSync(bppPath, { encoding: 'latin1' }).split('\n');

    // Read DRE for Net Income (CD_CONTA === '3.11' or '3.09')
    const drePath = path.join(dfpExtractDir, `dfp_cia_aberta_DRE_con_${dfpYear}.csv`);
    const dreLines = fs.readFileSync(drePath, { encoding: 'latin1' }).split('\n');

    // Read FRE Capital Social for total shares
    const capPath = path.join(freExtractDir, `fre_cia_aberta_capital_social_${dfpYear}.csv`);
    const capLines = fs.readFileSync(capPath, { encoding: 'latin1' }).split('\n');

    for (const [ticker, meta] of Object.entries(stockMap)) {
      // Find Equity
      let equity: number | null = null;
      for (const line of bppLines) {
        if (!line) continue;
        const cols = line.split(';');
        const cdCvm = cols[4]?.replace(/"/g, '').trim();
        const cdConta = cols[10]?.replace(/"/g, '').trim();
        const ord = cols[8]?.replace(/"/g, '').trim();
        if (cdCvm === meta.cdCvm && cdConta === '2.03' && ord === 'ÚLTIMO') {
          const rawVal = parseFloat(cols[12]?.replace(/"/g, '').replace(',', '.') || '0');
          const escala = cols[7]?.replace(/"/g, '').trim();
          equity = escala === 'MIL' ? rawVal * 1000 : rawVal;
          break;
        }
      }

      // Find Net Income (Deterministic Priority: 3.11 first, fallback to 3.09)
      let netIncome: number | null = null;
      for (const targetAccount of ['3.11', '3.09']) {
        for (const line of dreLines) {
          if (!line) continue;
          const cols = line.split(';');
          const cdCvm = cols[4]?.replace(/"/g, '').trim();
          const cdConta = cols[11]?.replace(/"/g, '').trim();
          const ord = cols[8]?.replace(/"/g, '').trim();
          if (cdCvm === meta.cdCvm && cdConta === targetAccount && ord === 'ÚLTIMO') {
            const rawVal = parseFloat(cols[13]?.replace(/"/g, '').replace(',', '.') || '0');
            const escala = cols[7]?.replace(/"/g, '').trim();
            netIncome = escala === 'MIL' ? rawVal * 1000 : rawVal;
            break;
          }
        }
        if (netIncome !== null) break;
      }

      // Find Total Shares
      let totalShares: number | null = null;
      for (const line of capLines) {
        if (!line) continue;
        const cols = line.split(';');
        const cnpj = cols[0]?.replace(/"/g, '').trim();
        if (cnpj === meta.cnpj) {
          const rawShares = parseFloat(cols[12]?.replace(/"/g, '').replace(',', '.') || '0');
          if (rawShares > 0) {
            totalShares = rawShares;
            break;
          }
        }
      }

      const vpa = (equity && totalShares) ? equity / totalShares : null;
      const lpa = (netIncome && totalShares) ? netIncome / totalShares : null;

      results[ticker] = {
        vpa,
        lpa,
        vacancy: null,
        updatedAt: new Date().toISOString(),
      };

      console.log(`[STOCKS] ${ticker} (${meta.name}): VPA=${vpa?.toFixed(4) ?? 'N/A'}, LPA=${lpa?.toFixed(4) ?? 'N/A'}`);
    }

    // -------------------------------------------------------------
    // PARTE B: FII VACÂNCIA (Informe Trimestral)
    // -------------------------------------------------------------
    console.log('\n[3/4] Processando Informe Trimestral FII (vacância por imóvel)...');
    let fiiYear = 2026;
    let fiiZipPath = path.join(tmpDir, `fii_tri_${fiiYear}.zip`);
    let fiiExtractDir = path.join(tmpDir, `ext_fii_${fiiYear}`);

    try {
      await downloadFile(`https://dados.cvm.gov.br/dados/FII/DOC/INF_TRIMESTRAL/DADOS/inf_trimestral_fii_${fiiYear}.zip`, fiiZipPath);
    } catch {
      fiiYear = 2025;
      fiiZipPath = path.join(tmpDir, `fii_tri_${fiiYear}.zip`);
      fiiExtractDir = path.join(tmpDir, `ext_fii_${fiiYear}`);
      console.log(`Fallback para Informe Trimestral FII ${fiiYear}...`);
      await downloadFile(`https://dados.cvm.gov.br/dados/FII/DOC/INF_TRIMESTRAL/DADOS/inf_trimestral_fii_${fiiYear}.zip`, fiiZipPath);
    }

    if (fs.existsSync(fiiExtractDir)) fs.rmSync(fiiExtractDir, { recursive: true, force: true });
    fs.mkdirSync(fiiExtractDir, { recursive: true });
    execSync(`powershell -Command "Expand-Archive -Path '${fiiZipPath}' -DestinationPath '${fiiExtractDir}' -Force"`);

    const fiiMap: Record<string, string> = {
      '11.728.688/0001-47': 'HGLG11',
      '97.521.225/0001-25': 'MXRF11',
      '36.642.293/0001-58': 'AFHI11',
      '12.005.956/0001-65': 'KNRI11',
      '09.341.226/0001-29': 'XPLG11',
      '16.793.076/0001-81': 'VISC11',
    };

    const imovelPath = path.join(fiiExtractDir, `inf_trimestral_fii_imovel_${fiiYear}.csv`);
    if (fs.existsSync(imovelPath)) {
      const imovelLines = fs.readFileSync(imovelPath, { encoding: 'latin1' }).split('\n');

      const fundAgg: Record<string, { totalArea: number; weightedVac: number }> = {};

      for (const line of imovelLines) {
        if (!line) continue;
        const cols = line.split(';');
        const cnpj = cols[0]?.replace(/"/g, '').trim();
        const ticker = fiiMap[cnpj];
        if (ticker) {
          const area = parseFloat(cols[6]?.replace(/"/g, '').replace(',', '.') || '0');
          const vacFrac = parseFloat(cols[9]?.replace(/"/g, '').replace(',', '.') || '0');
          
          if (!fundAgg[ticker]) fundAgg[ticker] = { totalArea: 0, weightedVac: 0 };
          if (area > 0) {
            fundAgg[ticker].totalArea += area;
            // vacFrac is decimal fraction, e.g. 0.1492 for 14.92%. Store percentage in %
            fundAgg[ticker].weightedVac += area * (vacFrac * 100);
          }
        }
      }

      for (const [cnpj, ticker] of Object.entries(fiiMap)) {
        const data = fundAgg[ticker];
        const vacancy = (data && data.totalArea > 0) ? (data.weightedVac / data.totalArea) : null;
        
        results[ticker] = {
          vpa: null,
          lpa: null,
          vacancy,
          updatedAt: new Date().toISOString(),
        };

        console.log(`[FII] ${ticker}: Vacância Ponderada = ${vacancy !== null ? vacancy.toFixed(2) + '%' : 'N/A (Papel/Sem imóvel)'}`);
      }
    }

    // -------------------------------------------------------------
    // PARTE 4: PERSISTÊNCIA (Local JSON + Firestore se configurado)
    // -------------------------------------------------------------
    console.log('\n[4/4] Gravando resultados no cache local (cvm_enriched.json)...');
    const localJsonPath = path.join(process.cwd(), 'src', 'lib', 'api', 'data', 'cvm_enriched.json');
    
    // Read existing local cache and merge
    let existingCache: Record<string, EnrichedData> = {};
    if (fs.existsSync(localJsonPath)) {
      try {
        existingCache = JSON.parse(fs.readFileSync(localJsonPath, 'utf-8'));
      } catch {}
    }

    const mergedCache = { ...existingCache, ...results };
    fs.writeFileSync(localJsonPath, JSON.stringify(mergedCache, null, 2), 'utf-8');
    console.log(`[OK] Gravado com sucesso em ${localJsonPath}`);

    // Persist to Firestore via Admin SDK
    console.log('\nGravando no Firestore (coleção enrichedFundamentals via Admin SDK)...');
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        for (const [ticker, data] of Object.entries(mergedCache)) {
          await adminDb.collection("enrichedFundamentals").doc(ticker).set(data, { merge: true });
        }
        console.log('[OK] Documentos atualizados no Firestore via Admin SDK com sucesso.');
      } else {
        console.warn('[AVISO] Admin SDK do Firestore não foi inicializado.');
      }
    } catch (err) {
      console.warn('[AVISO] Falha ao conectar/gravar no Firestore durante script de ingestão:', err);
    }

  } finally {
    // Cleanup temporary files
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log('\n=== INGESTÃO CVM CONCLUÍDA COM SUCESSO ===');
}

main().catch(console.error);
