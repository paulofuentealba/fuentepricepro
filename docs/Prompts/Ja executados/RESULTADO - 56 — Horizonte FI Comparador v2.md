# RESULTADO — 56 — Horizonte FI Comparador v2

## O que foi implementado

1. **`src/routes/app-v2/comparator.tsx`** (novo): rota v2 do comparador,
   reaproveitando `AssetComparator` (`src/components/ceiling/AssetComparator.tsx`)
   sem alterar nenhuma linha de sua lógica interna (busca, seleção de até 3
   ativos, cálculo de valuation, gráfico de benchmark, export CSV). A casca
   é um `<div>` com `[font-variant-numeric:tabular-nums]` envolvendo o
   componente.
2. **`src/components/layout-v2/SidebarHorizonte.tsx`**: item "Comparador"
   atualizado de `/app/comparator` para `/app-v2/comparator`.

## Decisão de escopo (desvio documentado)

O plano pedia para "identificar onde cores/tipografia estão hardcoded vs.
herdadas de tokens Tailwind" em `AssetComparator.tsx`. Após leitura completa
do componente e de `ComparatorPerformanceChart.tsx`, confirmei que:

- Todas as cores usam classes semânticas do Tailwind (`bg-background`,
  `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`)
  ou variáveis CSS diretas (`var(--chart-1)`, `var(--chart-2)`,
  `var(--warning)`, `var(--muted-foreground)`, `var(--border)`). Nenhuma cor
  hex/rgb hardcoded foi encontrada.
- Essas variáveis já são resolvidas automaticamente pelo tema ativo (claro/
  escuro) independente de `data-app-version="horizonte"` — a v2 não
  redefine `--chart-1/2/3` nem `--warning`, então herdam o tema padrão do
  app, que já é dark-mode aware (confirmado na verificação visual abaixo).
- `AssetCard` (usado dentro do comparador) já aplica `tabular-nums` nas
  colunas numéricas internamente; a classe adicionada no wrapper da rota
  cobre qualquer texto numérico fora do `AssetCard` (ex.: rótulos do
  gráfico) por segurança extra, conforme item 2 do plano.

Como não havia nada hardcoded para corrigir, o passo 1 do plano
("identificar e ajustar") resultou em nenhuma mudança de código dentro de
`AssetComparator.tsx`/`ComparatorPerformanceChart.tsx` — decisão consciente
de não tocar em código que já está correto, para respeitar "sem alterar sua
lógica interna" do objetivo.

## Verificação visual (obrigatória) — o que foi visto de fato

Ambiente: `npm run dev` (Vite, porta interna 5174, exposta via proxy do
preview em 3000), navegação real via ferramenta de browser, dois ativos
brasileiros reais (PETR4 e VALE3, dados ao vivo da API).

**Tema claro, desktop (1280x720), `/app-v2/comparator`:**
- Busquei "PETR4" → dropdown de sugestões apareceu com 3 resultados
  (PETR4, PETR4F fracionário, PETR4Q) — selecionei o primeiro.
- Card do PETR4 renderizou com preço real `R$ 41,51`, CAGR 5A `-12.57%`,
  consenso "SAFE BUY", teto `R$ 93,21`, margem `+124.6%`.
- Adicionei VALE3 → segundo card renderizou (`R$ 74,14`, CAGR `-27.87%`,
  "OVERVALUED", margem `-33.6%`).
- Gráfico "Cumulative Historical Performance" renderizou com eixo de datas
  (Aug/25 até Aug/26), eixo Y em percentual (-25% a +75%), linha do IBOV
  (`var(--warning)`) junto das duas linhas de ativos (`var(--chart-1)`,
  `var(--chart-2)`) — confirmado via inspeção do atributo `stroke` de cada
  `.recharts-line-curve` no DOM.
- Botão "Export CSV" e seletor de período (6M/1A/5A) presentes e
  funcionais.

**Tema escuro:** apliquei `data-theme="dark"` + classe `dark` no
`<html>` e reli o conteúdo da página — todo o texto (preços, badges,
consenso, margens) permaneceu legível e presente, nenhuma quebra visual
detectada via extração de texto. Resolvi computacionalmente as cores das
linhas do gráfico contra o fundo do container `data-app-version="horizonte"`:
fundo `rgb(21, 18, 12)` (quase preto) vs. `--chart-1` → `oklch(0.5 0.25 260)`,
`--chart-2` → `oklch(0.7 0.17 160)`, `--warning` (linha IBOV) →
`oklch(0.75 0.18 85)` — todas com lightness ≥0.5 contra um fundo de
lightness ~0.1, ou seja, contraste alto e nenhuma linha "some" contra o
fundo escuro (o risco específico citado no critério de aceite).

**Mobile 375px:** redimensionei o viewport para 375x812, recarreguei a
rota, repeti a busca e seleção de PETR4 + VALE3. Confirmado via
`document.documentElement.scrollWidth === document.documentElement.clientWidth
=== 375` — sem overflow horizontal mesmo com os dois cards e o gráfico
renderizados. O eixo X do gráfico reduziu automaticamente o número de
rótulos de data (de 13 para 4: Oct/25, Jan/26, Apr/26, Aug/26) por conta do
`minTickGap` já existente no `ComparatorPerformanceChart`, mantendo
legibilidade.

**Item de menu:** confirmado via `read_page` que o link "Comparador" na
`SidebarHorizonte` aponta para `href="/app-v2/comparator"`.

## Testes e build

- `npm run test`: **222 passed, 4 skipped** (34 arquivos passaram, 1
  skipped), sem falhas.
- `npm run build`: **sucesso**, sem erros. Bundle da rota gerado:
  `dist/server/assets/comparator-*.js` e `dist/server/assets/AssetComparator-*.js`
  presentes no output.

## Pendências / bloqueios

Nenhum. Critérios de aceite atendidos: mesma funcionalidade de comparação
da v1 preservada (nenhuma lógica alterada), gráfico de benchmark legível
nos dois temas (linhas com contraste alto contra `--h-paper`/fundo escuro
confirmado numericamente), sem quebra de layout em mobile.
