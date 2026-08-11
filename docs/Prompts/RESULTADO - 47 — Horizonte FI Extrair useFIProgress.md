# RESULTADO — 47 — Horizonte FI: Extrair `useFIProgress()`

## Status

Concluído. Refactor comportamentalmente neutro validado por testes e build.

## Contexto da execução

A extração do hook (`src/lib/useFIProgress.ts`) e a atualização de
`FIProgressCard.tsx` para consumi-lo já haviam sido feitas em uma sessão
anterior, mas ainda não estavam commitadas nem cobertas por teste unitário.
Esta execução:

1. Leu por completo `FIProgressCard.tsx` (estado atual) e conferiu, via
   `git diff`, que a lógica movida para o hook é idêntica byte-a-byte à
   lógica antes inline (mesma fórmula de `calculateMonthsToFI`, mesmo
   `useMemo` de `totalCapitalBRL`/`monthlyIncomeBRL`, mesmas conversões de
   moeda).
2. Escreveu o teste unitário faltante,
   `src/lib/__tests__/useFIProgress.test.ts`.
3. Rodou a suíte de testes completa e o build de produção.
4. Gerou este documento e fez o commit.

## Arquivos criados/alterados nesta execução

- Criado: `src/lib/__tests__/useFIProgress.test.ts` — 8 testes cobrindo:
  - `calculateMonthsToFI`: capital já no alvo (retorna 0), progresso parcial
    com yield positivo, contribuição zero + yield zero (retorna `Infinity`,
    nunca `NaN`), contribuição zero + yield positivo (`Infinity`), fórmula
    linear quando yield é zero e há contribuição.
  - `useFIProgress` (via `renderHook` com mocks de `useUserSettings`,
    `useValuedPortfolio`, `useQuery`, `exchangeRateQueryOptions`):
    progresso parcial (`coveragePercent` e `monthlyIncomeBRL` calculados
    corretamente, `isReached: false`), meta atingida (`isReached: true`,
    `coveragePercent: 100`, `monthsToFI: 0`), e contribuição mensal estimada
    zero (nenhum `NaN`, `monthsToFI` explicitamente `null`).

Já existentes de sessão anterior (não recriados, apenas verificados nesta
execução):

- `src/lib/useFIProgress.ts` — hook puro exportando `useFIProgress()` e a
  função auxiliar `calculateMonthsToFI`, com a mesma assinatura de retorno
  pedida no prompt (`coveragePercent`, `isReached`, `targetCapital`,
  `totalCapitalBRL`, `monthlyIncomeBRL`, `monthsToFI`).
- `src/components/ceiling/FIProgressCard.tsx` — passou a consumir
  `useFIProgress()` em vez de calcular tudo inline. JSX inalterado; apenas a
  origem dos valores (`coveragePercent`, `isReached`, `monthsToFI`,
  `monthlyIncomeBRL`) mudou de `useMemo`/cálculo local para o hook.

Nenhum outro componente foi tocado, conforme exigido nos critérios de
aceite.

## Validação de neutralidade comportamental

Comparação linha a linha do `git diff` de `FIProgressCard.tsx` confirma que:

- A fórmula de `calculateMonthsToFI` foi movida sem nenhuma alteração de
  lógica (mesmos `if`s, mesma ordem de checagem de casos-limite, mesmo
  cálculo de juros compostos via `Math.log`).
- O cálculo de `totalCapitalBRL`/`monthlyIncomeBRL` (soma por item,
  conversão de moeda via `convertToBRL`, divisão por 12) é idêntico dentro
  do hook.
- `coveragePercent`, `isReached` e `targetCapital` usam exatamente as mesmas
  expressões (`Math.min(100, Math.max(0, ratio * 100))`,
  `isSetup && ratio >= 1`, `monthlyCostGoal / (settings.targetYield / 100 /
  12)`).
- A única diferença observável é que `monthsToFI` agora é `number | null`
  (antes era `number`, podendo ser `Infinity`/`NaN` implícito nos casos de
  borda). O componente já tratava isso com `monthsToFI ?? Infinity` antes de
  chamar `formatDuration`, preservando o texto exibido em todos os casos
  (`formatDuration` já tratava `!isFinite(months)` como "mais de 100 anos").
  Não há mudança de número exibido na v1.

## Resultado real dos testes

`npm run test` (suíte completa, incluindo o novo teste):

```
 Test Files  33 passed | 1 skipped (34)
      Tests  216 passed | 4 skipped (220)
   Start at  14:51:03
   Duration  3.28s
```

Teste isolado `useFIProgress.test.ts`:

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

## Resultado real do build

`npm run build`:

```
✓ built in 949ms
```

Build de produção (SSR) concluído sem erros. Bundle `useFIProgress-*.js`
(3.58 kB) e `FIProgressCard-*.js` (10.37 kB) gerados normalmente.

## Desvios do plano original

Nenhum desvio de escopo. O único ajuste em relação ao prompt foi técnico e
local ao arquivo de teste: foi necessário anotar
`// @vitest-environment jsdom` no topo de `useFIProgress.test.ts`, pois o
`vitest.config.ts` do projeto usa `environment: "node"` por padrão e
`renderHook` (de `@testing-library/react`) requer `document`. Isso não afeta
nenhum outro arquivo nem o comportamento de produção.

## Commit desta execução

```
<preenchido após o commit — ver mensagem abaixo>
```

Mensagem de commit: `Horizonte FI 47 — Extrair useFIProgress (refactor puro + teste unitário)`
