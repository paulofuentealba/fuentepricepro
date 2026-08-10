### Item 2: Investigação e Correção do Global Radar Exibindo "0/0/0" ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz & Diagnóstico**:
  1. **Descarte Precoce na API Server (`fetchRadarFn`)**: Em `src/lib/apiService.functions.ts` (linha 340), o loop de busca de ativos continha a instrução `if (asset && asset.metrics.dividendCagr5y)`. Ativos sem CAGR de 5 anos positivo (como FIIs, REITs, ETFs e empresas com distribuição estável/recente) retornavam `null` para `dividendCagr5y`, sendo indevidamente descartados da resposta da API.
  2. **Pré-Filtro Hardcoded no Componente Visual (`DividendRadar.tsx`)**: Em `src/components/ceiling/DividendRadar.tsx` (linha 107), o array de ativos retornado pela API sofria um filtro inline `.filter((asset) => asset.ceiling > asset.currentPrice)` antes de ser entregue ao `useAssetFilterSort`. Isso removia antecipadamente todos os ativos sobreavaliados (*Overvalued*). Quando o yield alvo ou preços de mercado colocavam os ativos em patamar sobreavaliado, a lista resultante tornava-se vazia (`[]`), forçando a contagem `"All 0 / Undervalued 0 / Overvalued 0"` e tabela vazia.
- **Correção Implementada**:
  - **`src/lib/apiService.functions.ts`**: Alterada a verificação para `if (asset)`, garantindo que todos os ativos válidos consultados no radar (Ações, FIIs, REITs e ETFs) sejam preservados.
  - **`src/components/ceiling/DividendRadar.tsx`**: Removido o pré-filtro hardcoded `ceiling > currentPrice`. O controle de filtro (*All / Undervalued / Overvalued*) passa a ser operado integralmente pelo `useAssetFilterSort` e pela barra `WatchlistFilterBar`.
  - **`src/lib/__tests__/radar.test.ts`**: Adicionado teste unitário cobrindo a contagem e classificação dos ativos no radar.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **144 passed** | 4 skipped (25 arquivos de teste aprovados).
  3. **`npm run build`**: Client (4097 módulos em 1.90s) e SSR (251 módulos em 977ms) compilados limpos sem erros.

---