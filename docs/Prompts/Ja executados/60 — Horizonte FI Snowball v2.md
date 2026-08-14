# 60 — Horizonte FI: `/app-v2/snowballeffectsimulator`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55.

## Referência de código (v1)

`src/routes/app/snowballeffectsimulator.tsx` renderiza `SnowballSimulator`
(`src/components/ceiling/SnowballSimulator.tsx`) diretamente (não lazy).
Componente de simulação/projeção — provavelmente tem inputs interativos
(sliders/campos) além de gráfico, checar antes de assumir.

## Objetivo

Criar `src/routes/app-v2/snowballeffectsimulator.tsx`, reaproveitando
`SnowballSimulator` sem alterar a lógica de simulação — só casca visual.

## O que fazer

1. Ler `src/components/ceiling/SnowballSimulator.tsx` por completo,
   mapeando quais controles interativos existem (inputs, sliders, botões).
2. Criar a rota v2. Se houver inputs de formulário, garantir que os
   estados de foco visível funcionam com os novos tokens (`--h-accent`
   no anel de foco, não a cor padrão do shadcn).
3. Atualizar `SidebarHorizonte.tsx` — item "Snowball Effect" →
   `/app-v2/snowballeffectsimulator`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**: interagir com pelo menos um
   controle (ex.: mudar um valor de aporte simulado) e confirmar que o
   gráfico/resultado atualiza corretamente com o novo visual, nos dois
   temas.

## Fora de escopo

- Não alterar a matemática da simulação de bola de neve.
