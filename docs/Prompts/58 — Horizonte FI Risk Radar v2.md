# 58 — Horizonte FI: `/app-v2/riskradar`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55.

## Referência de código (v1)

`src/routes/app/riskradar.tsx` → lazy `RiskRadar`
(`src/components/ceiling/RiskRadar.tsx`). Skeleton mostra hero + grid de 2
cards — reaproveitar essa estrutura de hero+cards é natural aqui, ela já é
familiar do Dashboard v2 (prompt 51).

## Objetivo

Criar `src/routes/app-v2/riskradar.tsx`, reaproveitando `RiskRadar` sem
alterar cálculo de risco — só casca visual.

## O que fazer

1. Ler `src/components/ceiling/RiskRadar.tsx` por completo.
2. Se os tokens de gráfico (`--h-chart-*`) já tiverem sido criados no
   prompt 57, reaproveitar aqui — não recriar.
3. Criar a rota v2, mantendo a estrutura hero+cards do skeleton original.
4. Atualizar `SidebarHorizonte.tsx` — item "Risk Radar" → `/app-v2/riskradar`.
5. `npm run test`, `npm run build`.
6. **Verificação visual obrigatória** nos dois temas.

## Fora de escopo

- Não alterar a lógica de rating/score de risco.
