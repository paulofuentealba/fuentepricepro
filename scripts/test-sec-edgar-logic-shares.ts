import fs from 'fs';

async function testSecEdgarShares() {
  const headers = { 'User-Agent': 'FuentePricePro contato@fuentepricepro.com' };
  const aaplCik = '0000320193';
  
  const factsRes = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${aaplCik}.json`, { headers });
  const factsData = await factsRes.json() as any;
  
  const sharesUnits1 = factsData.facts['us-gaap']['CommonStockSharesOutstanding']?.units?.shares || [];
  const sharesUnits2 = factsData.facts['dei']['EntityCommonStockSharesOutstanding']?.units?.shares || [];
  
  sharesUnits1.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());
  sharesUnits2.sort((a: any, b: any) => new Date(b.end).getTime() - new Date(a.end).getTime());

  console.log('Top CommonStockSharesOutstanding:');
  for (let i = 0; i < 5; i++) {
    const fact = sharesUnits1[i];
    if (!fact) break;
    console.log(`- end: ${fact.end}, val: ${fact.val}, frame: ${fact.frame}, form: ${fact.form}, fp: ${fact.fp}, fy: ${fact.fy}`);
  }
  
  console.log('Top EntityCommonStockSharesOutstanding:');
  for (let i = 0; i < 5; i++) {
    const fact = sharesUnits2[i];
    if (!fact) break;
    console.log(`- end: ${fact.end}, val: ${fact.val}, frame: ${fact.frame}, form: ${fact.form}, fp: ${fact.fp}, fy: ${fact.fy}`);
  }
}

testSecEdgarShares().catch(console.error);
