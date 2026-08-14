# 59 — Horizonte FI: `/app-v2/smartallocation`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55. Esta rota tem uma particularidade: é **gateada por feature flag**
(`useFeatureGate("smartAllocationUnlocked")`) — a versão v2 precisa
respeitar o mesmo gate, não pode acidentalmente destravar a feature.

## Referência de código (v1)

`src/routes/app/smartallocation.tsx`: `useFeatureGate("smartAllocationUnlocked")`
+ `BlurredPreviewOverlay` (`src/components/ceiling/BlurredPreviewOverlay.tsx`)
quando bloqueado, envolvendo lazy `SmartAllocation`
(`src/components/ceiling/SmartAllocation.tsx`).

## Objetivo

Criar `src/routes/app-v2/smartallocation.tsx`, preservando o gate e o
`BlurredPreviewOverlay` — só restilizar o overlay com os tokens `--h-*` (o
overlay comunica um paywall/preview, precisa continuar claro sobre o que é
free vs. o que é pago, sem regressão de clareza).

## O que fazer

1. Ler `src/routes/app/smartallocation.tsx` e
   `src/components/ceiling/BlurredPreviewOverlay.tsx` por completo.
2. Criar a rota v2 preservando exatamente a mesma lógica de gate —
   testar manualmente com o gate ligado e desligado (o projeto tem os
   gates hoje abertos por padrão em produção via `config/featureGates`,
   ver SSOT Seção 5 — mas o código de gate deve continuar funcional para
   quando for reativado).
3. Atualizar `SidebarHorizonte.tsx` — item "Smart Allocation" →
   `/app-v2/smartallocation`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**, incluindo o estado bloqueado
   (overlay) e o estado desbloqueado, nos dois temas.

## Fora de escopo

- Não alterar a lógica de `computeSuggestedAllocation`/`computeSmartAllocation`
  nem o comportamento do feature gate em si.
