# 61 — Horizonte FI: `/app-v2/cashflow`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55. Mesma particularidade de gate do prompt 59 (`smartallocation`):
esta rota também é feature-gateada.

## Referência de código (v1)

`src/routes/app/cashflow.tsx`: gate `useFeatureGate("cashflowUnlocked")` +
`BlurredPreviewOverlay` quando bloqueado. Dado via `useWatchlist()`
(`src/lib/watchlist.ts`), renderizado em lazy `CashFlowCalendar`
(`src/components/ceiling/CashFlowCalendar.tsx`) — que por sua vez consome
`useTransactions()` e `useValuedPortfolio()` internamente, e as funções puras
de `src/lib/cashflow.ts` (`buildMonthlyBuckets`, `computeCashFlowSummary`,
`computeInvestedVsReceived`) — já mapeadas como "boa reutilização" na
pesquisa de backend original desta iniciativa.

## Objetivo

Criar `src/routes/app-v2/cashflow.tsx`, preservando o gate e reaproveitando
`CashFlowCalendar` sem alterar sua lógica de dado.

## O que fazer

1. Ler `src/components/ceiling/CashFlowCalendar.tsx` por completo —
   componente de calendário, provavelmente com células de dia/mês que
   têm cor própria para "dia com provento". Confirmar como essa cor é
   aplicada hoje e garantir que continua distinta do `--h-accent` (mesma
   regra do dashboard: accent é só pra jornada de FI, calendário de
   provento usa a semântica de "renda recebida", que pode usar
   `--h-success` ou um tom próprio).
2. Criar a rota v2, preservando o gate `cashflowUnlocked`.
3. Atualizar `SidebarHorizonte.tsx` — item "Fluxo de caixa" →
   `/app-v2/cashflow`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**: calendário com pelo menos um mês
   que tenha proventos reais marcados, nos dois temas.

## Fora de escopo

- Não alterar `buildMonthlyBuckets`/`computeCashFlowSummary`/
  `computeInvestedVsReceived`.
