import { fetchAssetFn, fetchQuoteFn } from "./src/lib/apiService.functions";

async function run() {
  try {
    const ticker = "BBAS3";
    
    // 1. Radar emulation: Brapi directly
    const asset = await fetchAssetFn({ data: { ticker } });
    const radarCurrentPrice = asset.currentPrice;
    const radarPbRatio = asset.metrics?.pbRatio || 1;
    const radarEps = asset.metrics?.eps || 0;
    const radarCagr = asset.metrics?.dividendCagr5y || 0;
    const radarBvps = radarCurrentPrice / radarPbRatio;
    
    // 2. Portfolio emulation: fetchQuoteFn for price + fetchAssetFn for meta
    const quote = await fetchQuoteFn({ data: { ticker } });
    const portfolioCurrentPrice = quote?.price || 0;
    const portfolioBvps = portfolioCurrentPrice / radarPbRatio;

    console.log("=== BBAS3 COMPARISON ===");
    console.log("RADAR (all from Brapi):");
    console.log(`- Price: ${radarCurrentPrice}`);
    console.log(`- P/B Ratio: ${radarPbRatio}`);
    console.log(`- EPS: ${radarEps}`);
    console.log(`- BVPS (Price / P/B): ${radarBvps}`);
    console.log(`- Div CAGR 5y: ${radarCagr}`);
    console.log("------------------------");
    console.log("PORTFOLIO (Price from Yahoo, Meta from Brapi):");
    console.log(`- Price (Yahoo): ${portfolioCurrentPrice}`);
    console.log(`- P/B Ratio (Brapi): ${radarPbRatio}`);
    console.log(`- EPS (Brapi): ${radarEps}`);
    console.log(`- BVPS (YahooPrice / Brapi P/B): ${portfolioBvps}`);
    console.log(`- Div CAGR 5y: ${radarCagr}`);
  } catch (e) {
    console.error(e);
  }
}

run();
