# Diagnóstico: `as_of` / Timing de Dado e Parâmetros no SSOT de Valuation

> [!IMPORTANT]
> **ESTÁGIO DE DIAGNÓSTICO**: Nenhum código de produção foi modificado. Este documento sintetiza as evidências empíricas e o mapeamento completo dos pontos de leitura de valuation da aplicação.

---

## 1. Síntese do Resultado do Diagnóstico

A hipótese de **divergência por timing de dados e desalinhamento de cache** foi **CONFIRMADA COMO CAUSA PARCIAL**, atuando em conjunto com **DISCREPÂNCIAS DE PARÂMETROS DE ENTRADA** entre as telas.

---

## 2. Evidências Empíricas Mapeadas

### A. Desalinhamento de `staleTime` e `queryKey` (Causa de Timing / Cache)
O TanStack Query gerencia o cache de dados fundamentalistas e cotações em 3 janelas de atualização completamente distintas:

1. **`quoteQueryOptions`** (`queryKey: ["quote", ticker]`): `staleTime: 30s`
   - Usado pelo hook `useValuedPortfolio` (Watchlist, My Portfolio, Risk Radar).
   - Atualiza o `livePrice` a cada 30 segundos durante a sessão.
2. **`assetQueryOptions`** (`queryKey: ["asset", ticker]`): `staleTime: 5 min`
   - Usado pelo `AssetCard` (Screener, Busca e Modal de Detalhes).
   - Mantém o `currentPrice` fixo no cache por até 5 minutos.
3. **`dividend-radar`** (`queryKey: ["dividend-radar", market]`): `staleTime: 15 min`
   - Usado pelo `DividendRadar` (Global Radar).
   - Mantém o snapshot da resposta do radar no cache por 15 minutos.

> **Efeito Visual Prático**: Se o preço de um ativo (ex: VALE3 ou PETR4) flutua de R$ 60,00 para R$ 62,00 durante o pregão, a Watchlist recalcula o valuation imediatamente (em 30s), enquanto o Screener mantém R$ 60,00 por até 5 min e o Global Radar por até 15 min, gerando valores divergentes para a mesma ação na mesma sessão.

---

### B. Discrepâncias de Parâmetros de Entrada (Causas de Estrutura de Código)

Mesmo quando os dados são lidos no exato mesmo segundo ($t = 0$), os valores do `Fuente Consensus` divergiam entre telas devido a três diferenças na preparação dos argumentos para a função SSOT `getAssetValuation`:

1. **Inconsistência no Fallback de `eps` (Lucro por Ação)**:
   - `AssetCard.tsx` e `useValuedPortfolio.ts`: Utilizam `asset.epsCurrent ?? asset.metrics?.eps ?? null`.
   - `DividendRadar.tsx` e `AssetComparator.tsx`: Utilizam apenas `asset.metrics?.eps ?? null` (ignorando `epsCurrent`).
   - *Impacto*: Se um ativo possui apenas `epsCurrent`, a Fórmula de Graham é calculada no Screener/Watchlist, mas é ignorada e retorna `null` no Global Radar e Comparator.

2. **Prioridade de Cálculo do `bvps` (Valor Patrimonial por Ação)**:
   - `AssetCard.tsx`: Prioriza `asset.metrics?.bvps` direto da API e só recua para `currentPrice / pbRatio` se este for nulo.
   - `useValuedPortfolio.ts`: Calcula diretamente `currentPrice / pbRatio`.
   - *Impacto*: Pequenas diferenças de arredondamento no P/VP alteram o resultado do Preço Teto de Graham em alguns centavos.

3. **Escopo do `targetYield` (Yield Desejado)**:
   - `Watchlist`: Utiliza o yield customizado salvo para cada ativo (`item.targetYield ?? globalYield`).
   - `Screener`: Utiliza o slider local (`localTargetYield`).
   - `Global Radar`: Utiliza exclusivamente a configuração global (`globalYield`).

---

## 3. Mapeamento de Componentes Afetados (Caso a Correção Seja Solicitada)

Caso Paulo decida aprovar a padronização e propagação de `as_of` / SSOT de entrada, os 5 arquivos mapeados para ajuste são:

1. [`src/lib/queryOptions.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/queryOptions.ts) (alinhamento de políticas de cache e `staleTime`).
2. [`src/lib/useValuedPortfolio.ts`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/useValuedPortfolio.ts) (padronização de fallback `epsCurrent` e prioridade `bvps`).
3. [`src/components/shared/AssetCard.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/shared/AssetCard.tsx).
4. [`src/components/ceiling/DividendRadar.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/DividendRadar.tsx).
5. [`src/components/ceiling/AssetComparator.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/AssetComparator.tsx).

---

## 4. Próximos Passos
> [!NOTE]
> Diagnóstico concluído e registrado em `docs/PROMPTS_LOG.md`. **Nenhuma alteração de código foi realizada**. Aguardando decisão do usuário sobre como e quando aplicar as correções.
