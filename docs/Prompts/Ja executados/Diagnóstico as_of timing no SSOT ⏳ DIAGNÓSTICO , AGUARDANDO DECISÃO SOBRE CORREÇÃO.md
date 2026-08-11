### Diagnóstico: as_of / timing no SSOT ⏳ DIAGNÓSTICO CONCLUÍDO, AGUARDANDO DECISÃO SOBRE CORREÇÃO

- **Status**: Diagnóstico concluído. Nenhum código de produção foi alterado nesta etapa.
- **Resultado da Investigação**:
  1. **Confirmação Parcial da Hipótese de Timing/Cache**:
     - Foram identificadas **3 janelas de `staleTime` desalinhadas** no TanStack Query entre telas:
       - `quoteQueryOptions` (`["quote", ticker]`): `staleTime: 30s` (usado por `useValuedPortfolio` / Watchlist).
       - `assetQueryOptions` (`["asset", ticker]`): `staleTime: 5min` (usado por Screener / AssetCard).
       - `dividend-radar` (`["dividend-radar", market]`): `staleTime: 15min` (usado por DividendRadar / Global Radar).
     - Quando o preço de um ativo muda no mercado durante a sessão, a Watchlist atualiza a cada 30s, o Screener segura o valor por 5min e o Global Radar por 15min, gerando divergência visual entre telas.
  2. **Causas Adicionais Identificadas (Discrepância de Parâmetros de Entrada)**:
     - **Fallback de EPS Inconsistente**: `AssetCard` e `useValuedPortfolio` usam `asset.epsCurrent ?? asset.metrics?.eps`, enquanto `DividendRadar` e `AssetComparator` usam apenas `asset.metrics?.eps` (ignorando `epsCurrent`). Se um ativo possui apenas `epsCurrent`, o Graham Ceiling roda no Screener/Watchlist mas é omitido no Radar/Comparator.
     - **Prioridade de BVPS Diferente**: `AssetCard` prioriza `asset.metrics?.bvps` antes de recuar para `currentPrice / pbRatio`, enquanto `useValuedPortfolio` calcula diretamente `currentPrice / pbRatio`.
     - **Target Yield Específico por Tela**: `Watchlist` aceita `item.targetYield` customizado por ativo, `Screener` usa `localTargetYield` de slider e `Global Radar` usa a configuração global `globalYield`.
- **Mapeamento de Componentes/Hooks Afetados (caso seja decidida a padronização de `as_of`)**:
  - `src/lib/queryOptions.ts` (alinhamento de `staleTime` / `queryKey`)
  - `src/lib/useValuedPortfolio.ts`
  - `src/components/shared/AssetCard.tsx`
  - `src/components/ceiling/DividendRadar.tsx`
  - `src/components/ceiling/AssetComparator.tsx`

---