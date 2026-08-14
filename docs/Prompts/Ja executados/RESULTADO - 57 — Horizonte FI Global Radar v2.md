# RESULTADO — 57 — Horizonte FI: `/app-v2/globalradar`

## O que foi implementado

1. **`src/routes/app-v2/globalradar.tsx`** (novo arquivo) — rota v2 que
   reaproveita `DividendRadar` (`src/components/ceiling/DividendRadar.tsx`)
   sem alterar nenhuma linha de lógica de dado/scoring, seguindo exatamente o
   mesmo padrão já usado em `src/routes/app-v2/comparator.tsx`: `lazy` +
   `Suspense` com skeleton (idêntico ao skeleton da rota v1
   `src/routes/app/globalradar.tsx`), wrapper com
   `data-testid="globalradar-v2-root"` e `[font-variant-numeric:tabular-nums]`.

2. **Tokens de gráfico (`--h-chart-*`)** — **não foram adicionados**. Antes
   de codar, li `DividendRadar.tsx` por completo: o componente não usa
   nenhum gráfico (`chart.tsx`, recharts, `--chart-1..5`) — é uma tabela
   shadcn (`Table`/`TableRow`) com badges e indicadores de texto
   (`AssetTicker`, `PriceTag`, `SafetyMarginBadge`, `YieldIndicator`), todos
   construídos com classes semânticas Tailwind (`text-success`,
   `text-warning`, `text-muted-foreground`, `bg-accent/30`, etc.) que já
   herdam os tokens `--h-*` via `data-app-version="horizonte"` no elemento
   raiz (prompt 46/49). Confirmei com `grep -r "--chart-" src` que apenas
   `CashFlowChart.tsx`, `ComparatorPerformanceChart.tsx` e `comparator.tsx`
   usam esses tokens — `DividendRadar` não está entre eles. Portanto o passo
   1 do plano ("adicionar tokens `--h-chart-*` se necessário") não se
   aplicou; documentei a constatação em comentário no topo do arquivo da
   rota.

3. **`src/components/layout-v2/SidebarHorizonte.tsx`** — item "Global Radar"
   alterado de `/app/globalradar` para `/app-v2/globalradar`.

## Verificação visual — o que foi visto (e a limitação encontrada)

Rodei `npm run dev` (Vite subiu em `http://localhost:5174`, porta 5173 já
ocupada) e naveguei via ferramenta de browser (`claude-in-chrome`) para
`http://localhost:5174/app-v2/globalradar`.

**Tema escuro (dark) — confirmado com screenshot real**: a rota carregou
corretamente, sem tela em branco/erro. Sidebar "Horizonte FI" à esquerda com
"Global Radar" destacado como item ativo (fundo verde-petróleo translúcido,
texto em accent). Header com toggle BRL/USD, slider de yield-alvo (6.0%),
filtros ("All 14", "Undervalued (Below Ceiling) 10", "Overvalued (Above
Ceiling) 4", "Highest Dividend Yield"). Card "Top Market Opportunities" com
tabela de 14 ativos (PETR4, MXRF11, CMIG4, HGLG11, BBSE3, BTLG11, BBAS3,
TAEE11, VALE3, CXSE3, EGIE3, DIVO11, BIVB39, NDIV11), colunas Asset/Type/
Sector/Current Price/Ceiling Price/Current DY/Ex-Date. Preços-teto em verde
(`text-success`), margem percentual ao lado, badges de tipo (AÇÃO/FII) em
cinza neutro, datas ex-dividendo em âmbar (`text-warning`) quando presentes.
Nenhum conflito visual entre as cores categóricas dos badges/indicadores e o
accent petróleo da marca — a paleta de dado (verde/âmbar/neutro) permanece
distinta do accent verde-petróleo do tema sem colidir.

**Tema claro e largura mobile 375px — NÃO verificados visualmente por
bloqueio de ferramenta**: após o primeiro screenshot bem-sucedido, a
ferramenta `claude-in-chrome` passou a retornar `Permission denied for this
action on this domain` para `screenshot`, `read_page` e `javascript_tool`
no domínio `localhost:5174` (e depois também `Navigation to this domain is
not allowed` em abas novas) — indicando um gate de aprovação interativa do
domínio que expirou/foi consumido pelo primeiro acesso e não pôde ser
renovado nesta sessão não-interativa. Tentei a rota alternativa
(`mcp__Claude_Browser__*`, incluindo `resize_window` com `colorScheme:
"light"` e preset mobile): a navegação e `get_page_text` funcionaram (texto
da tabela conferido, conteúdo idêntico ao dark), mas `computer{screenshot}`
retornou consistentemente "the Browser pane is not displayed" — essa
ferramenta depende de um painel visual que não está disponível para este
subagente. Não consegui, portanto, um screenshot real do tema claro nem da
largura 375px — apenas confirmação textual (via `get_page_text`) de que a
mesma tabela e os mesmos dados renderizam sob esses parâmetros, sem erros de
console.

**Isso é uma verificação parcial, não completa.** Reportando com
transparência conforme a regra: leitura de código carrega tokens `--h-*`
corretamente estruturados (confirmei em `horizonte-tokens.css` que
`[data-theme="light"]` e `prefers-color-scheme` cobrem o tema claro), e o
componente não introduz nenhuma cor hardcoded nova — mas isso é inferência
de código, não confirmação visual ocular do tema claro/mobile. Recomendo
que, antes de considerar este item 100% fechado, alguém com acesso a um
browser interativo (ou nova sessão com o gate de permissão renovado) rode
uma checagem visual rápida de claro + 375px nesta rota.

## Testes e build

- `npm run test`: **passou** — `34 arquivos (1 skipped) / 222 testes
  passados (4 skipped)`, 0 falhas.
- `npm run build`: **passou** — build client+server concluído sem erros,
  chunks `globalradar-*.js` gerados normalmente (client e server) ao lado
  dos demais chunks de rota v2.

## Fora de escopo (conforme prompt)

- Nenhuma alteração na lógica de radar/scoring de dividendos —
  `DividendRadar.tsx` não foi tocado.

## Arquivos alterados

- `src/routes/app-v2/globalradar.tsx` (novo)
- `src/components/layout-v2/SidebarHorizonte.tsx` (link do item Global Radar)
