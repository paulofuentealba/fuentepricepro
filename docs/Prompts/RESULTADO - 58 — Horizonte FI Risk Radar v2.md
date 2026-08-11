# RESULTADO — 58 — Horizonte FI Risk Radar v2

## O que foi implementado

1. Criado `src/routes/app-v2/riskradar.tsx`: rota v2 que reaproveita
   `RiskRadar` (`src/components/ceiling/RiskRadar.tsx`) sem nenhuma alteração
   de lógica de rating/score de risco — só casca visual, seguindo o mesmo
   padrão de `src/routes/app-v2/globalradar.tsx` (skeleton hero+grid de 2
   cards, wrapper `animate-in fade-in-0 slide-in-from-bottom-1`,
   `[font-variant-numeric:tabular-nums]`, `data-testid="riskradar-v2-root"`).
2. `RiskRadar` não usa gráficos (`--chart-1..5`), apenas barras de progresso
   (`bg-primary`/`bg-comparison`) e tabelas com badges via classes semânticas
   do Tailwind, que herdam os tokens `--h-*` automaticamente via
   `data-app-version="horizonte"` no elemento raiz do layout v2 (prompt
   46/49). Não foi necessário criar/reaproveitar tokens `--h-chart-*` em
   `horizonte-tokens.css` — nada disso é usado por este componente.
3. Atualizado `src/components/layout-v2/SidebarHorizonte.tsx`: item "Risk
   Radar" agora aponta para `/app-v2/riskradar` (antes `/app/riskradar`).

## Verificação visual (real, via browser)

Subi `npm run dev` (porta 5175 nova instância; usei uma instância já rodando
na porta 5174 para o teste no browser) e naveguei para
`http://localhost:5174/app-v2/riskradar` via ferramenta de browser
(`mcp__Claude_Browser__*`).

- **Conta sem portfolio (estado real do ambiente de teste, não logado)**: a
  rota renderizou o empty state do `RiskRadar` corretamente — heading "No
  assets in portfolio", texto "Add assets to your watchlist to view the risk
  and concentration matrix." e botão/link "Go to Portfolio" → `/app`. Isso
  confirma que a rota v2 está de fato montando o componente `RiskRadar` (não
  um placeholder), com o wrapper v2 (`data-testid="riskradar-v2-root"`)
  ativo.
- **Sidebar**: `read_page` (accessibility tree) confirmou o link "Risk Radar"
  com `href="/app-v2/riskradar"` na `SidebarHorizonte`, e `location.pathname`
  via `javascript_tool` confirmou `/app-v2/riskradar` como URL ativa após
  navegação.
- **Tema escuro (padrão)**: `data-app-version="horizonte"` presente no
  elemento raiz do layout, com `background-color: rgb(21, 18, 12)` (`--h-paper`
  escuro aplicado).
- **Tema claro**: com `colorScheme: "light"` no browser, o mesmo elemento
  raiz mudou para `background-color: rgb(247, 244, 236)` (`--h-paper` claro),
  confirmando que os tokens `--h-*` reagem corretamente ao tema sem qualquer
  ajuste extra necessário no componente reaproveitado.
- **Mobile 375px**: viewport redimensionado para 375x812. `document.
  documentElement.scrollWidth` (375) igual a `window.innerWidth` (375) —
  nenhum overflow horizontal no empty state. A sidebar desktop
  (`hidden md:flex`) fica oculta como esperado no padrão já usado pelas
  outras rotas v2 (comportamento herdado, não alterado nesta leva).
- Limitação: o screenshot visual pixel-a-pixel (`computer{action:
  "screenshot"}`) falhou neste ambiente ("Browser pane is not displayed, so
  the page is not compositing frames") — infraestrutura do ambiente, não do
  app. A verificação foi feita via accessibility tree (`read_page`),
  `get_page_text` e inspeção de estilos computados via `javascript_tool`
  (background colors, viewport, overflow), que confirmam o mesmo conteúdo e
  layout que um screenshot mostraria. Não foi possível verificar visualmente
  o estado com portfolio populado (grid de cards de risco/tabelas) porque a
  conta de teste do ambiente não tinha ativos — o componente `RiskRadar` em
  si não foi alterado nesta leva (só a casca da rota), e seu estado populado
  já é validado pela rota v1 existente (`/app/riskradar`), inalterada.

## Testes e build

- `npm run test`: **34 arquivos passaram, 1 pulado (35 total); 222 testes
  passaram, 4 pulados (226 total)**. Nenhuma falha.
- `npm run build`: **build concluído com sucesso** (`✓ built in 1.16s` no
  passo final do server bundle), gerando chunks
  `dist/server/assets/riskradar-XwIT1VuK.js` e
  `dist/server/assets/RiskRadar-hTpZx9ud.js` para a nova rota.

## Desvios do plano

Nenhum desvio relevante. Passo 2 do prompt (reaproveitar tokens
`--h-chart-*` do prompt 57, se existirem) não se aplicou porque `RiskRadar`
não usa gráficos — mesma situação documentada no prompt 57/`globalradar.tsx`
para `DividendRadar`.

## Fora de escopo (respeitado)

Nenhuma alteração na lógica de rating/score de risco (`usePortfolioRisk` e
o corpo de `RiskRadar.tsx` não foram tocados).
