# PROMPT 106 — Corrigir Currency Exposure no Risk Radar (SSOT de Moeda)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## Contexto — Causa Raiz Já Confirmada

`src/lib/usePortfolioRisk.ts:68`:

```ts
const itemCurrency = ["Stock", "REIT"].includes(item.type) ? "USD" : "BRL";
```

Bug duplo:
1. **Erro de string**: `item.type` nunca é literalmente `"Stock"` — o valor
   real do enum `AssetType` é `"STOCK_US"`. Essa comparação nunca bate,
   então todo ativo `STOCK_US` cai no `else` → classificado como `"BRL"`
   incorretamente. Só `"REIT"` funciona (por coincidência, esse valor
   bate).
2. **Reimplementação desnecessária (Regra 1/4)**: `WatchlistItem` já
   tem um campo `currency: Currency` (`"BRL" | "USD"`) — usado
   corretamente em `SmartAllocation.tsx:104,143,219,229`,
   `Watchlist.tsx:72`, `allocation.ts:175,181,183,199`,
   `ComparatorPerformanceChart.tsx:83`. O Risk Radar é o único lugar do
   projeto que tenta inferir moeda a partir de `type` em vez de ler o
   campo que já existe.

## Tarefa

1. Em `src/lib/usePortfolioRisk.ts:68`, substituir a inferência
   quebrada por leitura direta do campo já existente:
   ```ts
   const itemCurrency = item.currency;
   ```
   Confirmar antes que `item` (o parâmetro do loop, vindo de `items`)
   é de fato tipado como `WatchlistItem` (ou super/subtipo com o campo
   `currency`) — se por algum motivo o tipo usado nesse hook não expõe
   `currency`, investigar por que e corrigir a tipagem, não contornar
   com type assertion (`as any`).
2. Buscar em `usePortfolioRisk.ts` (e em qualquer outro lugar do Risk
   Radar) por outras ocorrências do mesmo padrão de inferência de
   moeda via `type` (`["Stock", "REIT"].includes(...)` ou variações) —
   corrigir todas, não só a linha 68, se houver mais de uma.
3. Verificar se esse mesmo padrão de bug (comparação com `"Stock"`
   literal em vez de `"STOCK_US"`) existe em outro lugar do projeto
   fora do Risk Radar — grep por `"Stock"` (string literal exata, com
   maiúscula inicial, sem `_US`/`_BR`) em `src/`. Se encontrar outras
   ocorrências, reportar mas não corrigir nesta rodada a menos que seja
   trivialmente o mesmo bug — escopo é o Risk Radar.

## Gate de Saída

- `npx tsc --noEmit`, `npx vitest run` (criar teste de regressão
  específico: carteira com 1 ativo `STOCK_US` e 1 `FII`, confirmar que
  `risk.currencies` reporta a proporção correta entre USD e BRL, não
  100% BRL), `npm run build`.
- Teste manual: abrir `/app/riskradar` com uma carteira real contendo
  ao menos 1 ativo dolarizado (ex: `SCM`, US Stock, conforme a captura
  de Paulo) — confirmar que "Currency Exposure" mostra USD > 0%, não
  mais 100% BRL.

## Proibido

- Não usar `as any` ou type assertion para contornar incompatibilidade
  de tipo — se `item.currency` não estiver disponível no tipo usado
  pelo hook, corrigir a tipagem de verdade.
- Não expandir o escopo para reformular outras métricas do Risk Radar
  (tipo/setor) nesta rodada — só a exposição por moeda.
