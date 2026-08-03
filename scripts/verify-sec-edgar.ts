import { fetchSecEdgarFacts } from '../src/lib/api/secEdgar.server';

const SEC_USER_AGENT = 'FuentePricePro contato@fuentepricepro.com';

async function getLatestFilingDetails(ticker: string) {
  try {
    const resMap = await fetch('https://www.sec.gov/files/company_tickers.json', {
      headers: { 'User-Agent': SEC_USER_AGENT },
    });
    const tickersData = await resMap.json() as Record<string, { cik_str: number, ticker: string }>;
    let cik = '';
    for (const k in tickersData) {
      if (tickersData[k].ticker === ticker.toUpperCase()) {
        cik = String(tickersData[k].cik_str).padStart(10, '0');
        break;
      }
    }
    if (!cik) return null;

    const factsRes = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, {
      headers: { 'User-Agent': SEC_USER_AGENT },
    });
    const factsData = await factsRes.json() as any;
    const usGaap = factsData?.facts?.['us-gaap'];
    const dei = factsData?.facts?.dei;

    const equityUnits = usGaap?.['StockholdersEquity']?.units?.USD || [];
    equityUnits.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const latestEquity = equityUnits[0];

    let sharesUnits = dei?.['EntityCommonStockSharesOutstanding']?.units?.shares || [];
    if (sharesUnits.length === 0) {
      sharesUnits = usGaap?.['CommonStockSharesOutstanding']?.units?.shares || [];
    }
    sharesUnits.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
    const latestShares = sharesUnits[0];

    return {
      equityDate: latestEquity?.end,
      equityVal: latestEquity?.val,
      equityForm: latestEquity?.form,
      sharesDate: latestShares?.end,
      sharesVal: latestShares?.val,
      sharesForm: latestShares?.form,
    };
  } catch (e) {
    return null;
  }
}

async function verify() {
  const tickers = ['AAPL', 'O', 'JNJ', 'KO'];

  console.log('=== VERIFICAÇÃO DINÂMICA SEC EDGAR ===\n');

  for (const ticker of tickers) {
    console.log(`--- Ticker: ${ticker} ---`);
    const details = await getLatestFilingDetails(ticker);
    const secResult = await fetchSecEdgarFacts(ticker);

    if (details) {
      console.log(`Fato Equity mais recente na SEC: Data End=${details.equityDate}, Valor=$${(details.equityVal / 1e9).toFixed(3)}B (Form ${details.equityForm})`);
      console.log(`Fato Shares mais recente na SEC: Data End=${details.sharesDate}, Valor=${(details.sharesVal / 1e6).toFixed(2)}M (Form ${details.sharesForm})`);
      console.log(`BVPS Calculado Dinamicamente: $${secResult.bvps?.toFixed(4)}`);
    } else {
      console.log(`Não foi possível obter detalhes para ${ticker}`);
    }
    console.log('');
  }

  console.log('--- Testando Ativo Inexistente ---');
  const fakeRes = await fetchSecEdgarFacts('INVALIDTICKER999');
  console.log(`TICKERFAKE123 BVPS: ${fakeRes.bvps}`);
}

verify();
