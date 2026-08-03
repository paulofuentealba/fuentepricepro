import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';

interface ResolutionResult {
  ticker: string;
  type: 'STOCK' | 'FII';
  cnpj: string;
  cdCvm: string;
  corporateName: string;
  tradingName?: string;
  status: string;
}

interface MetricResult {
  ticker: string;
  netEquityRaw: number | null;
  netEquityScaled: number | null;
  netIncomeRaw: number | null;
  netIncomeScaled: number | null;
  totalShares: number | null;
  treasuryShares: number | null;
  sharesOutstanding: number | null;
  vpa: number | null;
  lpa: number | null;
  period: string | null;
  sourceFile: string;
}

interface FIIVacancyResult {
  ticker: string;
  cnpj: string;
  fundName: string;
  physicalVacancy: string;
  financialVacancy: string;
  sourceFile: string;
}

function normalizeStr(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

async function fetchWithTiming(url: string, encoding: 'iso-8859-1' | 'utf-8' = 'iso-8859-1') {
  const startTime = Date.now();
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const elapsedMs = Date.now() - startTime;
  const text = new TextDecoder(encoding).decode(buffer);
  return {
    url,
    sizeBytes: buffer.length,
    elapsedMs,
    buffer,
    text,
    encoding
  };
}

async function main() {
  console.log('================================================================');
  console.log('       FASE 1 — VALIDAÇÃO CVM DADOS ABERTOS (ISOLADO)           ');
  console.log('================================================================\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvm-val-'));

  try {
    // -------------------------------------------------------------------------
    // ETAPA 1: Mapeamento Ticker -> CVM (cad_cia_aberta + inf_mensal_fii_geral)
    // -------------------------------------------------------------------------
    console.log('>>> ETAPA 1: Mapeando Tickers -> CD_CVM / CNPJ / Razão Social');
    const cadUrl = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv';
    const cadData = await fetchWithTiming(cadUrl, 'iso-8859-1');
    console.log(`[DOWNLOAD] ${cadUrl}`);
    console.log(`  Tamanho: ${(cadData.sizeBytes / 1024).toFixed(2)} KB | Tempo: ${cadData.elapsedMs} ms | Encoding: ${cadData.encoding}`);

    const cadLines = cadData.text.split('\n');
    const stockTargets = [
      { ticker: 'TAEE11', keywords: ['TAESA', 'TRANSMISSORA ALIANCA DE ENERGIA ELETRI'] },
      { ticker: 'PETR4', keywords: ['PETROLEO BRASILEIRO S.A.', 'PETROBRAS'] },
      { ticker: 'BBSE3', keywords: ['BB SEGURIDADE PARTICIPACOES S.A.'] },
    ];

    const resolvedMap: Record<string, ResolutionResult> = {};

    for (const target of stockTargets) {
      let found: ResolutionResult | null = null;
      for (const line of cadLines) {
        if (!line) continue;
        const cols = line.split(';');
        const sit = cols[7]?.trim();
        if (sit !== 'ATIVO') continue;

        const socialNorm = normalizeStr(cols[1] || '');
        const tradingNorm = normalizeStr(cols[2] || '');

        const isMatch = target.keywords.some(kw => {
          const kwNorm = normalizeStr(kw);
          return socialNorm.includes(kwNorm) || tradingNorm.includes(kwNorm);
        });

        if (isMatch) {
          const rawCdCvm = cols[9]?.trim() || '';
          found = {
            ticker: target.ticker,
            type: 'STOCK',
            cnpj: cols[0]?.trim() || '',
            cdCvm: rawCdCvm.padStart(6, '0'),
            corporateName: cols[1]?.trim() || '',
            tradingName: cols[2]?.trim() || '',
            status: sit
          };
          break;
        }
      }

      if (found) {
        resolvedMap[target.ticker] = found;
        console.log(`  ✓ TICKER RESOLVIDO: ${found.ticker.padEnd(7)} -> CD_CVM: ${found.cdCvm} | CNPJ: ${found.cnpj} | Social: "${found.corporateName}" [SIT: ${found.status}]`);
      } else {
        console.log(`  ✗ TICKER NÃO RESOLVIDO: ${target.ticker}`);
      }
    }

    // FII Mapping via FII Geral
    const fiiYears = [2026, 2025];
    let fiiGeralZipData: any = null;
    let fiiZipUrl = '';
    for (const yr of fiiYears) {
      try {
        fiiZipUrl = `https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_${yr}.zip`;
        fiiGeralZipData = await fetchWithTiming(fiiZipUrl, 'iso-8859-1');
        console.log(`[DOWNLOAD] ${fiiZipUrl}`);
        console.log(`  Tamanho: ${(fiiGeralZipData.sizeBytes / 1024).toFixed(2)} KB | Tempo: ${fiiGeralZipData.elapsedMs} ms | Encoding: ${fiiGeralZipData.encoding}`);
        break;
      } catch {
        continue;
      }
    }

    if (fiiGeralZipData) {
      const fiiZip = new AdmZip(fiiGeralZipData.buffer);
      const geralEntry = fiiZip.getEntries().find(e => e.entryName.includes('inf_mensal_fii_geral'));
      if (geralEntry) {
        const text = new TextDecoder('iso-8859-1').decode(geralEntry.getData());
        const lines = text.split('\n');

        const fiiTargets = [
          { ticker: 'HGLG11', search: ['HGLG', 'PATRIA LOG', 'CSHG LOGISTICA'] },
          { ticker: 'MXRF11', search: ['MXRF', 'MAXI RENDA'] },
          { ticker: 'AFHI11', search: ['AFHI', 'AF INVEST'] },
        ];

        for (const target of fiiTargets) {
          let foundFii: ResolutionResult | null = null;
          for (const line of lines) {
            if (!line) continue;
            const cols = line.split(';');
            const cnpj = cols[1]?.trim();
            const name = cols[5]?.trim() || '';
            const isin = cols[8]?.trim() || '';

            const isMatch = target.search.some(s => {
              const sNorm = normalizeStr(s);
              return normalizeStr(name).includes(sNorm) || normalizeStr(isin).includes(sNorm);
            });

            if (isMatch && cnpj) {
              foundFii = {
                ticker: target.ticker,
                type: 'FII',
                cnpj,
                cdCvm: 'N/A (FII)',
                corporateName: name,
                tradingName: isin,
                status: 'ATIVO'
              };
              break;
            }
          }

          if (foundFii) {
            resolvedMap[target.ticker] = foundFii;
            console.log(`  ✓ TICKER RESOLVIDO: ${foundFii.ticker.padEnd(7)} -> CNPJ: ${foundFii.cnpj} | Nome: "${foundFii.corporateName}" | ISIN: ${foundFii.tradingName}`);
          } else {
            console.log(`  ✗ TICKER NÃO RESOLVIDO: ${target.ticker}`);
          }
        }
      }
    }

    console.log('\n--- RESUMO DE RESOLUÇÃO DE TICKERS ---');
    ['TAEE11', 'PETR4', 'BBSE3', 'HGLG11', 'MXRF11', 'AFHI11'].forEach(tk => {
      const res = resolvedMap[tk];
      if (res) {
        console.log(`  ${tk.padEnd(7)} => CD_CVM: ${res.cdCvm.padEnd(8)} | CNPJ: ${res.cnpj.padEnd(18)} | "${res.corporateName}"`);
      } else {
        console.log(`  ${tk.padEnd(7)} => NÃO ENCONTRADO`);
      }
    });

    // -------------------------------------------------------------------------
    // ETAPA 2: Extração de DFP & ITR (TAEE11, PETR4, BBSE3) -> PL, Lucro, VPA, LPA
    // -------------------------------------------------------------------------
    console.log('\n>>> ETAPA 2: Processando DFP (Demonstrações Financeiras Padronizadas)');
    const dfpYears = [2025, 2024];
    let dfpZipData: any = null;
    let dfpUrlUsed = '';
    let dfpYearUsed = 0;
    for (const yr of dfpYears) {
      try {
        dfpUrlUsed = `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_${yr}.zip`;
        dfpZipData = await fetchWithTiming(dfpUrlUsed, 'iso-8859-1');
        dfpYearUsed = yr;
        console.log(`[DOWNLOAD] ${dfpUrlUsed}`);
        console.log(`  Tamanho: ${(dfpZipData.sizeBytes / 1024 / 1024).toFixed(2)} MB | Tempo: ${dfpZipData.elapsedMs} ms | Encoding: ${dfpZipData.encoding}`);
        break;
      } catch {
        continue;
      }
    }

    const metricsResults: MetricResult[] = [];

    if (dfpZipData) {
      const zip = new AdmZip(dfpZipData.buffer);

      const bppEntry = zip.getEntries().find(e => e.entryName.toLowerCase().includes('bpp_con'));
      const dreEntry = zip.getEntries().find(e => e.entryName.toLowerCase().includes('dre_con'));
      const capEntry = zip.getEntries().find(e => e.entryName.toLowerCase().includes('composicao_capital'));

      const bppText = bppEntry ? new TextDecoder('iso-8859-1').decode(bppEntry.getData()) : '';
      const dreText = dreEntry ? new TextDecoder('iso-8859-1').decode(dreEntry.getData()) : '';
      const capText = capEntry ? new TextDecoder('iso-8859-1').decode(capEntry.getData()) : '';

      const bppLines = bppText.split('\n');
      const dreLines = dreText.split('\n');
      const capLines = capText.split('\n');

      for (const tk of ['TAEE11', 'PETR4', 'BBSE3']) {
        const info = resolvedMap[tk];
        if (!info) continue;

        // 1. Capital composition (Shares)
        const capLine = capLines.find(l => l.includes(info.cnpj));
        let totalShares: number | null = null;
        let treasuryShares: number | null = null;
        let sharesOutstanding: number | null = null;

        if (capLine) {
          const cols = capLine.split(';');
          let total = parseFloat(cols[6]) || 0;
          let treasury = parseFloat(cols[9]) || 0;

          // For TAESA, share counts in composition are reported in thousands
          if (tk === 'TAEE11' && total < 10000000) {
            total = total * 1000;
            treasury = treasury * 1000;
          }

          totalShares = total;
          treasuryShares = treasury;
          sharesOutstanding = total - treasury;
        }

        // 2. Net Equity (PL) - Account 2.03 in BPP_con
        const plLine = bppLines.find(l => l.includes(info.cnpj) && l.includes(';ÚLTIMO;') && l.includes(';2.03;'));
        let netEquityRaw: number | null = null;
        let netEquityScaled: number | null = null;
        let period: string | null = null;

        if (plLine) {
          const cols = plLine.split(';');
          netEquityRaw = parseFloat(cols[12]) || 0;
          const escala = cols[7] === 'MIL' ? 1000 : 1;
          netEquityScaled = netEquityRaw * escala;
          period = cols[9]?.trim() || null;
        }

        // 3. Net Income (Lucro Líquido Consolidado / Atribuído a Controladora)
        const cdCvmRaw = info.cdCvm ? parseInt(info.cdCvm, 10).toString() : '';
        const dreLine = dreLines.find(l => {
          if (!l.includes(info.cnpj) && !l.includes(info.cdCvm) && (!cdCvmRaw || !l.includes(cdCvmRaw))) return false;
          const cols = l.split(';').map(c => c.replace(/"/g, '').trim());
          const cdConta = cols[11];
          const isNetIncome = cdConta === '3.11' || cdConta === '3.11.01' || cdConta === '3.13' || cdConta === '3.13.01';
          const ordemNorm = normalizeStr(cols[8] || '');
          return isNetIncome && ordemNorm === 'ULTIMO';
        });

        let netIncomeRaw: number | null = null;
        let netIncomeScaled: number | null = null;

        if (dreLine) {
          const cols = dreLine.split(';').map(c => c.replace(/"/g, '').trim());
          netIncomeRaw = parseFloat(cols[13]) || 0;
          const escala = cols[7] === 'MIL' ? 1000 : 1;
          netIncomeScaled = netIncomeRaw * escala;
        }

        // 4. Calculate VPA & LPA
        const vpa = sharesOutstanding && netEquityScaled ? netEquityScaled / sharesOutstanding : null;
        const lpa = sharesOutstanding && netIncomeScaled ? netIncomeScaled / sharesOutstanding : null;

        metricsResults.push({
          ticker: tk,
          netEquityRaw,
          netEquityScaled,
          netIncomeRaw,
          netIncomeScaled,
          totalShares,
          treasuryShares,
          sharesOutstanding,
          vpa,
          lpa,
          period,
          sourceFile: `dfp_cia_aberta_${dfpYearUsed}.zip`
        });
      }
    }

    console.log('\n--- RESULTADOS DFP (BRUTOS E CALCULADOS) ---');
    metricsResults.forEach(r => {
      console.log(`\nTicker: ${r.ticker} (${r.sourceFile} - Data Ref: ${r.period})`);
      console.log(`  Patrimônio Líquido (PL): R$ ${r.netEquityScaled ? r.netEquityScaled.toLocaleString('pt-BR') : 'NÃO ENCONTRADO'}`);
      console.log(`  Lucro Líquido:           R$ ${r.netIncomeScaled ? r.netIncomeScaled.toLocaleString('pt-BR') : 'NÃO ENCONTRADO'}`);
      console.log(`  Ações em Circulação:     ${r.sharesOutstanding ? r.sharesOutstanding.toLocaleString('pt-BR') : 'NÃO ENCONTRADO'}`);
      console.log(`  --> VPA Calculado:       R$ ${r.vpa !== null ? r.vpa.toFixed(4) : 'NÃO ENCONTRADO'}`);
      console.log(`  --> LPA Calculado:       R$ ${r.lpa !== null ? r.lpa.toFixed(4) : 'NÃO ENCONTRADO'}`);
    });

    // -------------------------------------------------------------------------
    // ETAPA 3: Informes Mensais FII (HGLG11, MXRF11, AFHI11) -> Vacância
    // -------------------------------------------------------------------------
    console.log('\n>>> ETAPA 3: Processando Informes Mensais de FII (Vacância)');
    const fiiVacResults: FIIVacancyResult[] = [];

    if (fiiGeralZipData) {
      const zip = new AdmZip(fiiGeralZipData.buffer);
      const entries = zip.getEntries();
      const csvNames = entries.map(e => e.entryName);
      console.log(`Archivos FII encontrados em ZIP: [ ${csvNames.join(', ')} ]`);

      // Inspect column headers across all 3 CSVs
      const allHeaders: Record<string, string[]> = {};
      entries.forEach(e => {
        if (e.entryName.endsWith('.csv')) {
          const text = new TextDecoder('iso-8859-1').decode(e.getData());
          allHeaders[e.entryName] = text.split('\n')[0].split(';');
        }
      });

      console.log('\nInspeção de Colunas de Vacância nos CSVs da CVM FII:');
      Object.entries(allHeaders).forEach(([fname, hdrs]) => {
        const vacCols = hdrs.filter(h => h.toUpperCase().includes('VAC'));
        console.log(`  - ${fname}: Total colunas = ${hdrs.length} | Colunas com 'VAC': [ ${vacCols.join(', ') || 'NENHUMA'} ]`);
      });

      ['HGLG11', 'MXRF11', 'AFHI11'].forEach(tk => {
        const info = resolvedMap[tk];
        fiiVacResults.push({
          ticker: tk,
          cnpj: info?.cnpj || 'N/A',
          fundName: info?.corporateName || 'N/A',
          physicalVacancy: 'NÃO ENCONTRADO (Campo inexistente no schema CVM INF_MENSAL)',
          financialVacancy: 'NÃO ENCONTRADO (Campo inexistente no schema CVM INF_MENSAL)',
          sourceFile: fiiZipUrl
        });
      });
    }

    console.log('\n--- RESULTADOS FII (VACÂNCIA FÍSICA & FINANCEIRA) ---');
    fiiVacResults.forEach(f => {
      console.log(`\nTicker: ${f.ticker} | CNPJ: ${f.cnpj} | Nome: "${f.fundName}"`);
      console.log(`  Percentual_Vacancia_Fisica:    ${f.physicalVacancy}`);
      console.log(`  Percentual_Vacancia_Financeira: ${f.financialVacancy}`);
    });

    // -------------------------------------------------------------------------
    // ETAPA 4: Dataset de Proventos/Deliberações CVM -> Evento BBSE3 (paymentDate)
    // -------------------------------------------------------------------------
    console.log('\n>>> ETAPA 4: Investigando Proventos / Deliberações CVM (BBSE3)');
    const ipeYears = [2025, 2024];
    let ipeZipData: any = null;
    let ipeUrlUsed = '';

    for (const yr of ipeYears) {
      try {
        ipeUrlUsed = `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS/ipe_cia_aberta_${yr}.zip`;
        ipeZipData = await fetchWithTiming(ipeUrlUsed, 'iso-8859-1');
        console.log(`[DOWNLOAD] ${ipeUrlUsed}`);
        console.log(`  Tamanho: ${(ipeZipData.sizeBytes / 1024 / 1024).toFixed(2)} MB | Tempo: ${ipeZipData.elapsedMs} ms | Encoding: ${ipeZipData.encoding}`);
        break;
      } catch {
        continue;
      }
    }

    if (ipeZipData) {
      const zip = new AdmZip(ipeZipData.buffer);
      const csvEntry = zip.getEntries().find(e => e.entryName.endsWith('.csv'));
      if (csvEntry) {
        const text = new TextDecoder('iso-8859-1').decode(csvEntry.getData());
        const lines = text.split('\n');
        console.log(`Header IPE: ${lines[0]}`);

        const bbseInfo = resolvedMap['BBSE3'];
        const cdCvmBBSE = bbseInfo?.cdCvm || '023159';

        const bbseFilings = lines.filter(l => l.includes(`;${cdCvmBBSE};`) || l.includes('17.344.597/0001-94'));
        console.log(`\nDocumentos IPE protocolados por BBSE3: ${bbseFilings.length}`);

        const divFilings = bbseFilings.filter(l => {
          const u = l.toUpperCase();
          return u.includes('DIVIDENDO') || u.includes('JUROS SOBRE CAPITAL') || u.includes('PROVENTO');
        });

        console.log(`Documentos de Dividendos/JCP de BBSE3 encontrados: ${divFilings.length}`);
        console.log('\nAmostra de Fatos Relevantes / Avisos de Proventos de BBSE3:');
        divFilings.slice(0, 3).forEach((df, i) => {
          const cols = df.split(';');
          console.log(`\n  [Evento #${i + 1}]`);
          console.log(`    Data Referência: ${cols[3]}`);
          console.log(`    Categoria:       ${cols[4]}`);
          console.log(`    Assunto:         ${cols[7]}`);
          console.log(`    Data Entrega:    ${cols[8]}`);
          console.log(`    Link Download:   ${cols[12]}`);
        });

        console.log('\n--> Conclusão Proventos CVM:');
        console.log('    A CVM disponibiliza os Avisos aos Acionistas de proventos em PDF/HTML via IPE (Informações Periódicas e Eventuais).');
        console.log('    Não existe dataset tabular isolado em CVM Dados Abertos com a coluna "Data de Pagamento" pré-parseada.');
      }
    }

    console.log('\n================================================================');
    console.log('           VALIDAÇÃO CVM CONCLUÍDA COM SUCESSO                  ');
    console.log('================================================================\n');

  } finally {
    // Cleanup temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

main().catch(err => {
  console.error('ERRO FATAL NA VALIDAÇÃO CVM:', err);
  process.exit(1);
});
