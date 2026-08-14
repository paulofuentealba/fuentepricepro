# 57 — Horizonte FI: `/app-v2/globalradar`

## Contexto

Parte da leva 55-64. Ver regra de **verificação visual obrigatória** no
prompt 55 — aplica-se aqui.

## Referência de código (v1)

`src/routes/app/globalradar.tsx` → lazy `DividendRadar`
(`src/components/ceiling/DividendRadar.tsx`). Dashboard chart-heavy.

## Objetivo

Criar `src/routes/app-v2/globalradar.tsx`, reaproveitando `DividendRadar`
sem alterar sua lógica de dado — só o contêiner/casca visual.

## O que fazer

1. Ler `src/components/ceiling/DividendRadar.tsx` por completo. Mapear
   quais gráficos/cores são usados (provavelmente via `chart.tsx`,
   `src/components/ui/chart.tsx`) — confirmar se as cores de gráfico
   (`--chart-1` a `--chart-5` do sistema atual) precisam de um equivalente
   `--h-chart-*` nos tokens v2, ou se herdam bem o suficiente. Se for
   necessário, adicionar esses tokens em `src/styles/horizonte-tokens.css`
   nesta etapa (extensão pontual do arquivo, mesma estrutura de precedência
   já usada).
2. Criar a rota v2, manter `Suspense`/skeleton como na v1.
3. Atualizar `SidebarHorizonte.tsx` — item "Global Radar" → `/app-v2/globalradar`.
4. `npm run test`, `npm run build`.
5. **Verificação visual obrigatória**: nos dois temas, confirmar que os
   gráficos são legíveis e as cores fazem sentido dentro da paleta petróleo
   (não precisam ser petróleo — cores de gráfico de dado continuam
   categóricas — mas não podem conflitar visualmente com o accent da marca).

## Fora de escopo

- Não alterar a lógica de radar/scoring de dividendos.
