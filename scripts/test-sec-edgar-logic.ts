import fs from 'fs';

async function testSecEdgar() {
  const headers = { 'User-Agent': 'FuentePricePro contato@fuentepricepro.com' };
  
  console.log('Fetching tickers...');
  const tickersRes = await fetch('https://www.sec.gov/files/company_tickers.json', { headers });
  const tickersData = await tickersRes.json() as Record<string, any>;
  
  let aaplCik = '';
  for (const key in tickersData) {
    if (tickersData[key].ticker === 'AAPL') {
      aaplCik = String(tickersData[key].cik_str).padStart(10, '0');
      break;
    }
  }
  
  console.log(`AAPL CIK: ${aaplCik}`);
  
  console.log('Fetching facts...');
  const factsRes = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${aaplCik}.json`, { headers });
  const factsData = await factsRes.json() as any;
  
  const equityUnits = factsData.facts['us-gaap']['StockholdersEquity']?.units?.USD || [];
  
  // Sort by 'end' date descending
  equityUnits.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
  
  console.log('Top 10 StockholdersEquity facts (sorted by end date descending):');
  for (let i = 0; i < 10; i++) {
    const fact = equityUnits[i];
    if (!fact) break;
    console.log(`- end: ${fact.end}, val: ${fact.val}, frame: ${fact.frame}, form: ${fact.form}, fp: ${fact.fp}, fy: ${fact.fy}`);
  }

  // Filter for the most recent without a 'frame' that is not a Q or Y? Or maybe filter by form?
  // Usually, we want the most recent 'end' date that isn't a recast or adjustment. 
  // Let's print out the exact values around $106.49B and $107.52B.
  console.log('\nLooking for values near 106.49B or 107.52B:');
  for (const fact of equityUnits) {
    if (fact.val >= 106e9 && fact.val <= 108e9) {
      console.log(`- end: ${fact.end}, val: ${fact.val}, frame: ${fact.frame}, form: ${fact.form}`);
    }
  }
}

testSecEdgar().catch(console.error);
