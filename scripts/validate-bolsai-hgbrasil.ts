import "dotenv/config";

interface TestResult {
  ticker: string;
  source: "bolsai" | "hgbrasil";
  status: number;
  statusText: string;
  latencyMs: number;
  rateLimitHeaders: Record<string, string>;
  rawResponse: any;
  hasPaymentDate: boolean;
  paymentDateFillRate: string;
  notes: string;
}

const bolsaiKey = process.env.BOLSAI_API_TOKEN;
const hgKey = process.env.HGBRASIL_API_KEY;

const tickers = [
  // Ações BR
  "BBSE3",
  "PETR4",
  "TAEE11",
  // FIIs BR
  "HGLG11",
  "MXRF11",
  "AFHI11",
  // FIAGRO BR
  "VGIA11",
  "KNCA11",
];

async function runBolsaiTest(ticker: string): Promise<TestResult> {
  const url = `https://api.usebolsai.com/api/v1/dividends/${ticker}`;
  const start = Date.now();
  
  if (!bolsaiKey) {
    return {
      ticker,
      source: "bolsai",
      status: 0,
      statusText: "SKIPPED_NO_KEY",
      latencyMs: 0,
      rateLimitHeaders: {},
      rawResponse: { error: "BOLSAI_API_TOKEN is not defined in environment" },
      hasPaymentDate: false,
      paymentDateFillRate: "0%",
      notes: "Test skipped because BOLSAI_API_TOKEN env var is missing.",
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "X-API-Key": bolsaiKey,
        "User-Agent": "FuentePricePro-Validation/1.0",
      },
    });
    const latencyMs = Date.now() - start;
    const rateLimitHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      if (k.toLowerCase().includes("limit") || k.toLowerCase().includes("rate") || k.toLowerCase().includes("remaining")) {
        rateLimitHeaders[k] = v;
      }
    });

    const text = await res.text();
    let rawResponse: any;
    try {
      rawResponse = JSON.parse(text);
    } catch {
      rawResponse = text;
    }

    let hasPaymentDate = false;
    let paymentDateFillRate = "0%";
    let notes = "";

    if (res.status === 200 && Array.isArray(rawResponse)) {
      const withPaymentDate = rawResponse.filter(
        (item) => item.payment_date || item.paymentDate || item.data_pagamento
      );
      hasPaymentDate = withPaymentDate.length > 0;
      paymentDateFillRate = `${((withPaymentDate.length / Math.max(rawResponse.length, 1)) * 100).toFixed(1)}%`;
      notes = `Returned ${rawResponse.length} records.`;
    } else if (res.status === 403) {
      notes = `403 Forbidden: ${rawResponse.detail || rawResponse.error || "Pro tier required"}`;
    } else {
      notes = `HTTP ${res.status}: ${JSON.stringify(rawResponse).slice(0, 100)}`;
    }

    return {
      ticker,
      source: "bolsai",
      status: res.status,
      statusText: res.statusText,
      latencyMs,
      rateLimitHeaders,
      rawResponse,
      hasPaymentDate,
      paymentDateFillRate,
      notes,
    };
  } catch (err: any) {
    return {
      ticker,
      source: "bolsai",
      status: 500,
      statusText: "FETCH_ERROR",
      latencyMs: Date.now() - start,
      rateLimitHeaders: {},
      rawResponse: { error: err.message },
      hasPaymentDate: false,
      paymentDateFillRate: "0%",
      notes: `Network/Fetch error: ${err.message}`,
    };
  }
}

async function runHgBrasilTest(ticker: string): Promise<TestResult> {
  const url = `https://api.hgbrasil.com/v2/finance/dividends?tickers=B3:${ticker}&key=${hgKey || ""}`;
  const start = Date.now();

  if (!hgKey) {
    return {
      ticker,
      source: "hgbrasil",
      status: 0,
      statusText: "SKIPPED_NO_KEY",
      latencyMs: 0,
      rateLimitHeaders: {},
      rawResponse: { error: "HGBRASIL_API_KEY is not defined in environment" },
      hasPaymentDate: false,
      paymentDateFillRate: "0%",
      notes: "Test skipped because HGBRASIL_API_KEY env var is missing.",
    };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "FuentePricePro-Validation/1.0",
      },
    });
    const latencyMs = Date.now() - start;
    const rateLimitHeaders: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      if (k.toLowerCase().includes("limit") || k.toLowerCase().includes("rate") || k.toLowerCase().includes("remaining")) {
        rateLimitHeaders[k] = v;
      }
    });

    const text = await res.text();
    let rawResponse: any;
    try {
      rawResponse = JSON.parse(text);
    } catch {
      rawResponse = text;
    }

    let hasPaymentDate = false;
    let paymentDateFillRate = "0%";
    let notes = "";

    if (rawResponse.errors && rawResponse.errors.length > 0) {
      const errObj = rawResponse.errors[0];
      notes = `Error ${errObj.code}: ${errObj.message}`;
    } else if (rawResponse.results && Array.isArray(rawResponse.results) && rawResponse.results.length > 0) {
      const item = rawResponse.results[0];
      const divs = item.series || item.dividends || item.dividends_history || [];
      const withPaymentDate = divs.filter((d: any) => d.payment_date || d.paymentDate || d.date_payment);
      hasPaymentDate = withPaymentDate.length > 0;
      paymentDateFillRate = `${((withPaymentDate.length / Math.max(divs.length, 1)) * 100).toFixed(1)}%`;
      notes = `Returned ${divs.length} dividend records for ${ticker}.`;
    } else {
      notes = `Returned empty results list or structure: ${JSON.stringify(rawResponse).slice(0, 100)}`;
    }

    return {
      ticker,
      source: "hgbrasil",
      status: res.status,
      statusText: res.statusText,
      latencyMs,
      rateLimitHeaders,
      rawResponse,
      hasPaymentDate,
      paymentDateFillRate,
      notes,
    };
  } catch (err: any) {
    return {
      ticker,
      source: "hgbrasil",
      status: 500,
      statusText: "FETCH_ERROR",
      latencyMs: Date.now() - start,
      rateLimitHeaders: {},
      rawResponse: { error: err.message },
      hasPaymentDate: false,
      paymentDateFillRate: "0%",
      notes: `Network/Fetch error: ${err.message}`,
    };
  }
}

async function main() {
  console.log("==========================================================================");
  console.log("       VALIDADE COMBINADA: BOLSAI vs HG BRASIL (PROVENTOS & PAYMENTDATE)  ");
  console.log("==========================================================================");
  console.log(`BOLSAI_API_TOKEN loaded: ${!!bolsaiKey} (${bolsaiKey ? "Key present" : "Missing"})`);
  console.log(`HGBRASIL_API_KEY loaded:  ${!!hgKey} (${hgKey ? "Key present" : "Missing"})`);
  console.log(`Tickers under test: ${tickers.join(", ")}`);
  console.log("--------------------------------------------------------------------------\n");

  const bolsaiResults: TestResult[] = [];
  const hgResults: TestResult[] = [];

  console.log(">>> PARTE A: Executando testes na API Bolsai (api.usebolsai.com) <<<\n");
  for (const ticker of tickers) {
    process.stdout.write(`Testing Bolsai [${ticker}]... `);
    const r = await runBolsaiTest(ticker);
    bolsaiResults.push(r);
    console.log(`HTTP ${r.status} (${r.latencyMs}ms) - ${r.notes}`);
  }

  console.log("\n>>> PARTE B: Executando testes na API HG Brasil (api.hgbrasil.com) <<<\n");
  for (const ticker of tickers) {
    process.stdout.write(`Testing HG Brasil [${ticker}]... `);
    const r = await runHgBrasilTest(ticker);
    hgResults.push(r);
    console.log(`HTTP ${r.status} (${r.latencyMs}ms) - ${r.notes}`);
  }

  console.log("\n==========================================================================");
  console.log("                     EXEMPLOS DE RESPOSTAS BRUTAS (JSON)                  ");
  console.log("==========================================================================");

  console.log("\n--- Bolsai Sample (BBSE3) Raw Response ---");
  console.log(JSON.stringify(bolsaiResults[0]?.rawResponse, null, 2));

  console.log("\n--- Bolsai Sample (HGLG11) Raw Response ---");
  console.log(JSON.stringify(bolsaiResults[3]?.rawResponse, null, 2));

  console.log("\n--- HG Brasil Sample (BBSE3) Raw Response ---");
  console.log(JSON.stringify(hgResults[0]?.rawResponse, null, 2));

  console.log("\n--- HG Brasil Sample (VGIA11 - FIAGRO) Raw Response ---");
  console.log(JSON.stringify(hgResults[6]?.rawResponse, null, 2));

  console.log("\n==========================================================================");
  console.log("                   PARTE C: TABELA COMPARATIVA DE RESULTADOS              ");
  console.log("==========================================================================");

  console.table(
    tickers.map((ticker, idx) => {
      const b = bolsaiResults[idx];
      const h = hgResults[idx];
      return {
        Ticker: ticker,
        "Bolsai Status": b.status,
        "Bolsai PaymentDate Fill": b.paymentDateFillRate,
        "Bolsai Latency": `${b.latencyMs}ms`,
        "HG Status": h.status,
        "HG PaymentDate Fill": h.paymentDateFillRate,
        "HG Latency": `${h.latencyMs}ms`,
      };
    })
  );

  console.log("\n>>> METRICS & SUMMARY:");
  const avgBolsaiLat = (bolsaiResults.reduce((acc, r) => acc + r.latencyMs, 0) / tickers.length).toFixed(0);
  const avgHgLat = (hgResults.reduce((acc, r) => acc + r.latencyMs, 0) / tickers.length).toFixed(0);

  console.log(`- Latência Média Bolsai: ${avgBolsaiLat}ms`);
  console.log(`- Latência Média HG Brasil: ${avgHgLat}ms`);
  console.log(`- Rate Limit Headers Bolsai: ${JSON.stringify(bolsaiResults[0]?.rateLimitHeaders)}`);
  console.log(`- Rate Limit Headers HG Brasil: ${JSON.stringify(hgResults[0]?.rateLimitHeaders)}`);
}

main().catch(console.error);
