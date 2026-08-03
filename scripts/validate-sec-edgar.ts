interface SecTickerItem {
  cik_str: number;
  ticker: string;
  title: string;
}

interface SecFactUnit {
  end: string;
  val: number;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

interface SecFactConcept {
  label: string;
  description: string;
  units: Record<string, SecFactUnit[]>;
}

interface SecCompanyFacts {
  cik: number;
  entityName: string;
  facts: {
    'us-gaap'?: Record<string, SecFactConcept>;
    dei?: Record<string, SecFactConcept>;
  };
}

interface SecResult {
  ticker: string;
  title: string;
  cik10: string;
  bvps: number | null;
  eps: number | null;
  equityVal: number | null;
  sharesVal: number | null;
  reportForm: string | null;
  reportDate: string | null;
  downloadMs: number;
  fileSizeBytes: number;
  error?: string;
}

const USER_AGENT = 'FuentePricePro contato@fuentepricepro.com';

async function fetchJsonWithTiming<T>(url: string): Promise<{ data: T; sizeBytes: number; elapsedMs: number }> {
  const start = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const elapsedMs = Date.now() - start;
  const json = JSON.parse(buffer.toString('utf-8')) as T;
  return { data: json, sizeBytes: buffer.length, elapsedMs };
}

function getLatestUnitVal(concept?: SecFactConcept, allowedUnitKeys = ['USD', 'shares', 'USD/shares']): { unit: SecFactUnit; unitKey: string } | null {
  if (!concept || !concept.units) return null;

  for (const unitKey of allowedUnitKeys) {
    const list = concept.units[unitKey];
    if (list && list.length > 0) {
      // Filter 10-K and 10-Q filings
      const filtered = list.filter(u => u.form === '10-K' || u.form === '10-Q');
      if (filtered.length === 0) continue;
      // Sort ascending by end date
      filtered.sort((a, b) => (a.end > b.end ? 1 : -1));
      return { unit: filtered[filtered.length - 1], unitKey };
    }
  }
  return null;
}

async function main() {
  console.log('================================================================');
  console.log('         FASE 1 — VALIDAÇÃO SEC EDGAR (US/REITs ISOLADO)        ');
  console.log('================================================================\n');

  const targetTickers = ['AAPL', 'O', 'JNJ', 'KO'];

  // 1. Fetch SEC company_tickers.json
  console.log('>>> ETAPA 1: Baixando Ticker Index da SEC (company_tickers.json)...');
  const indexUrl = 'https://www.sec.gov/files/company_tickers.json';
  const indexResult = await fetchJsonWithTiming<Record<string, SecTickerItem>>(indexUrl);
  console.log(`[DOWNLOAD] ${indexUrl}`);
  console.log(`  Tamanho: ${(indexResult.sizeBytes / 1024).toFixed(2)} KB | Tempo: ${indexResult.elapsedMs} ms`);

  const cikMap: Record<string, { cik10: string; title: string }> = {};
  Object.values(indexResult.data).forEach(item => {
    const tk = item.ticker.toUpperCase();
    if (targetTickers.includes(tk)) {
      cikMap[tk] = {
        cik10: String(item.cik_str).padStart(10, '0'),
        title: item.title
      };
    }
  });

  console.log('\n--- TICKERS RESOLVIDOS EM SEC EDGAR ---');
  targetTickers.forEach(tk => {
    const info = cikMap[tk];
    if (info) {
      console.log(`  ✓ ${tk.padEnd(6)} -> CIK: ${info.cik10} | Razão Social: "${info.title}"`);
    } else {
      console.log(`  ✗ ${tk.padEnd(6)} -> CIK NÃO ENCONTRADO`);
    }
  });

  // 2. Fetch Facts per CIK and extract BVPS & EPS
  console.log('\n>>> ETAPA 2: Consultando XBRL Company Facts por CIK');
  const results: SecResult[] = [];

  for (const tk of targetTickers) {
    const info = cikMap[tk];
    if (!info) {
      results.push({
        ticker: tk,
        title: 'N/A',
        cik10: 'N/A',
        bvps: null,
        eps: null,
        equityVal: null,
        sharesVal: null,
        reportForm: null,
        reportDate: null,
        downloadMs: 0,
        fileSizeBytes: 0,
        error: 'CIK não encontrado no índice da SEC'
      });
      continue;
    }

    const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${info.cik10}.json`;
    try {
      const factsFetch = await fetchJsonWithTiming<SecCompanyFacts>(factsUrl);
      const gaap = factsFetch.data.facts?.['us-gaap'];

      if (!gaap) {
        results.push({
          ticker: tk,
          title: info.title,
          cik10: info.cik10,
          bvps: null,
          eps: null,
          equityVal: null,
          sharesVal: null,
          reportForm: null,
          reportDate: null,
          downloadMs: factsFetch.elapsedMs,
          fileSizeBytes: factsFetch.sizeBytes,
          error: 'Dicionário us-gaap não encontrado na resposta'
        });
        continue;
      }

      // Stockholders Equity Concept
      const eqConceptNames = ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest', 'PartnersCapital'];
      let eqData: { unit: SecFactUnit; unitKey: string } | null = null;
      for (const name of eqConceptNames) {
        if (gaap[name]) {
          eqData = getLatestUnitVal(gaap[name], ['USD']);
          if (eqData) break;
        }
      }

      // Shares Outstanding Concept
      const shareConceptNames = ['CommonStockSharesOutstanding', 'CommonStockSharesIssued', 'WeightedAverageNumberOfSharesOutstandingBasic'];
      let shareData: { unit: SecFactUnit; unitKey: string } | null = null;
      for (const name of shareConceptNames) {
        if (gaap[name]) {
          shareData = getLatestUnitVal(gaap[name], ['shares']);
          if (shareData) break;
        }
      }

      // Basic EPS Concept
      const epsConceptNames = ['EarningsPerShareBasic', 'EarningsPerShareDiluted'];
      let epsData: { unit: SecFactUnit; unitKey: string } | null = null;
      for (const name of epsConceptNames) {
        if (gaap[name]) {
          epsData = getLatestUnitVal(gaap[name], ['USD/shares', 'USD']);
          if (epsData) break;
        }
      }

      const equityVal = eqData ? eqData.unit.val : null;
      const sharesVal = shareData ? shareData.unit.val : null;
      const bvps = equityVal !== null && sharesVal !== null && sharesVal > 0 ? equityVal / sharesVal : null;
      const eps = epsData ? epsData.unit.val : null;

      const reportForm = eqData?.unit.form || shareData?.unit.form || epsData?.unit.form || null;
      const reportDate = eqData?.unit.end || shareData?.unit.end || epsData?.unit.end || null;

      results.push({
        ticker: tk,
        title: info.title,
        cik10: info.cik10,
        bvps,
        eps,
        equityVal,
        sharesVal,
        reportForm,
        reportDate,
        downloadMs: factsFetch.elapsedMs,
        fileSizeBytes: factsFetch.sizeBytes
      });

    } catch (err: any) {
      results.push({
        ticker: tk,
        title: info.title,
        cik10: info.cik10,
        bvps: null,
        eps: null,
        equityVal: null,
        sharesVal: null,
        reportForm: null,
        reportDate: null,
        downloadMs: 0,
        fileSizeBytes: 0,
        error: err.message
      });
    }
  }

  console.log('\n================================================================');
  console.log('             RESULTADOS FINAIS SEC EDGAR                        ');
  console.log('================================================================');

  results.forEach(r => {
    console.log(`\nTicker: ${r.ticker.padEnd(5)} | CIK: ${r.cik10} | "${r.title}"`);
    console.log(`  Download API: ${(r.fileSizeBytes / 1024 / 1024).toFixed(2)} MB em ${r.downloadMs} ms`);
    if (r.error) {
      console.log(`  ✗ ERRO: ${r.error}`);
    } else {
      console.log(`  Relatório de Origem:   Formulário ${r.reportForm} (Data Ref: ${r.reportDate})`);
      console.log(`  Patrimônio Líquido:    $${r.equityVal ? r.equityVal.toLocaleString('en-US') : 'NÃO ENCONTRADO'}`);
      console.log(`  Ações em Circulação:   ${r.sharesVal ? r.sharesVal.toLocaleString('en-US') : 'NÃO ENCONTRADO'}`);
      console.log(`  --> BVPS Calculado:    $${r.bvps !== null ? r.bvps.toFixed(4) : 'NÃO ENCONTRADO'}`);
      console.log(`  --> EPS Encontrado:    $${r.eps !== null ? r.eps.toFixed(4) : 'NÃO ENCONTRADO'}`);
    }
  });

  console.log('\n================================================================');
  console.log('           VALIDAÇÃO SEC EDGAR CONCLUÍDA COM SUCESSO            ');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('ERRO FATAL NA VALIDAÇÃO SEC EDGAR:', err);
  process.exit(1);
});
