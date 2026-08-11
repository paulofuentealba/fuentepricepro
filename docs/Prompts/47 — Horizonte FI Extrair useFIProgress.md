# 47 — Horizonte FI: Extrair `useFIProgress()` (refactor puro, sem mudança de comportamento)

## Contexto

`FIProgressCard.tsx` (linhas ~25-56 e 74-146) calcula progresso de
independência financeira **inline**, dentro do componente — não existe hoje
um hook/função pura reutilizável. Isso é um bloqueio real: a v2 precisa do
mesmo número (`% de progresso`) no componente de assinatura "Horizonte FI",
mas não pode duplicar a fórmula em dois lugares (duplicação = a mesma classe
de bug já registrada na Seção 9 do SSOT — "não repetir os mesmos erros").

## Objetivo

Extrair a lógica de `FIProgressCard.tsx` para `src/lib/useFIProgress.ts`,
como hook puro, **sem alterar nenhum número exibido na v1 hoje**. Este é um
refactor comportamentalmente neutro — não é a hora de melhorar a fórmula.

## O que fazer

1. Ler `src/components/ceiling/FIProgressCard.tsx` por completo antes de
   tocar em qualquer linha — mapear exatamente `calculateMonthsToFI` e os
   `useMemo` de `totalCapitalBRL`/`monthlyIncomeBRL`.
2. Criar `src/lib/useFIProgress.ts` exportando:
   ```ts
   export function useFIProgress(): {
     coveragePercent: number;
     isReached: boolean;
     targetCapital: number;
     totalCapitalBRL: number;
     monthlyIncomeBRL: number;
     monthsToFI: number | null;
   }
   ```
   Internamente, consumir os mesmos inputs que o componente já usa hoje:
   `useValuedPortfolio()` (`valuedItems`), `useUserSettings()`
   (`monthlyLivingCostGoal`, `estimatedMonthlyContribution`, `targetYield`),
   `exchangeRateQueryOptions()`.
3. Atualizar `FIProgressCard.tsx` para consumir `useFIProgress()` em vez da
   lógica inline. **O JSX e o resultado visual da v1 não podem mudar.**
4. Escrever teste unitário em `src/lib/__tests__/useFIProgress.test.ts`
   cobrindo pelo menos: progresso parcial, meta atingida (`isReached: true`),
   e caso de contribuição mensal zero (não pode dividir por zero /
   `monthsToFI` deve ser `null` ou `Infinity` tratado explicitamente, nunca
   `NaN` silencioso).

## Critérios de aceite

- Rodar a v1 antes e depois do refactor lado a lado (mesmo usuário de teste)
  e confirmar que `coveragePercent`, `monthsToFI` e os valores em R$ exibidos
  no `FIProgressCard` são **idênticos**, casa decimal por casa decimal.
- `npm run test` passa, incluindo o novo teste.
- Nenhum outro componente além de `FIProgressCard.tsx` foi tocado.

## Por que este prompt vem antes do componente visual da v2

O componente "Horizonte FI" (prompt 50) depende deste hook. Sem essa extração,
a v2 teria que reimplementar a fórmula — risco de divergência silenciosa entre
v1 e v2 (o mesmo tipo de bug já resolvido uma vez no Fuente Consensus, ver
Seção 4 do SSOT, "6 pontos divergentes unificados").
