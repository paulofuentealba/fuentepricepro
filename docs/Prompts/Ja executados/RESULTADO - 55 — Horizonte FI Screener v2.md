# RESULTADO - 55 — Horizonte FI: `/app-v2/screener`

## O que foi implementado

- Nova rota `src/routes/app-v2/screener.tsx`, espelhando **exatamente** a
  mesma lógica de estado de `src/routes/app/screener.tsx`: `validateSearch`
  com `?ticker=`, `useMutation`/`useQueryClient` com `assetQueryOptions`
  (`src/lib/queryOptions.ts`), lazy `AssetForm`
  (`src/components/ceiling/AssetForm.tsx`, não alterado), `AssetCard`
  variant="search" (`src/components/shared/AssetCard.tsx`, não alterado),
  `ResultSkeleton`, `ErrorBoundary`, `useI18n`. Nenhum hook/componente de
  dado novo foi criado — só a casca visual da página mudou.
- Contêiner do formulário e o estado vazio ("Ready when you are"/
  `t.result.emptyTitle`/`emptyBody`) reestilizados com os tokens `--h-*`
  (`--h-paper-raised`, `--h-line`, `--h-radius-xl`, `--h-shadow-sm`,
  `--h-ink`, `--h-ink-soft`, `--h-font-display`, `--h-success`), no mesmo
  padrão já usado em `app-v2/index.tsx` (`SummaryCard`). `AssetCard` em si
  não foi tocado (fora de escopo, conforme o prompt) — continua com classes
  Tailwind normais, herdando os tokens só porque o shell `app-v2.tsx` já
  ativa `data-app-version="horizonte"`.
- `src/components/layout-v2/SidebarHorizonte.tsx`: item "Screener"
  (`t.tabs.calculator`, exibido como "Calculator" em EN) atualizado de
  `/app/screener` para `/app-v2/screener`.

## Arquivos criados

- `src/routes/app-v2/screener.tsx`

## Arquivos alterados

- `src/components/layout-v2/SidebarHorizonte.tsx` (uma linha: `path` do
  item `screener`)

## Verificação visual (real, via browser tool)

Subi `npm run dev` (`.claude/launch.json`, config `dev`, Vite escolheu a
porta `5174` porque `5173` já estava em uso) e naveguei para
`http://localhost:5174/app-v2/screener` com o Chrome MCP (`claude-in-chrome`
e `Claude_Browser`), sem login (modo convidado — não há credencial de teste
disponível neste ambiente e a rota não força autenticação, mesmo padrão já
usado no prompt 52).

- **Tema escuro (padrão do SO/browser)**: a sidebar "Horizonte FI" aparece
  com o item "Calculator" ativo (confirma o link atualizado); o card de
  busca ("TICKER") aparece com fundo `--h-paper-raised` escuro e borda
  `--h-line`. Busquei `PETR4` no campo — o autocomplete real (via API viva)
  mostrou 3 sugestões (`PETR4`, `PETR4F`, `PETR4Q`); ao clicar em `PETR4` o
  `AssetCard` renderizou à direita com dado real: preço atual R$ 41,36,
  dividendo médio 3Y R$ 6,01 (14,53%), EPS R$ 10,35, Ceiling Price
  R$ 93,21, Safety Margin 125,37% ("Undervalued"), indicadores de mercado
  (P/E 4.00, Payout 31,9%, DIV CAGR -12,57%) e gráfico de histórico de
  dividendos 2021-2025 — tudo com a paleta petróleo/verde dos tokens `--h-*`
  no card de resultado.
- **Tema claro**: forcei `document.documentElement.classList.remove('dark')`
  via JS para inspecionar o CSS de tema claro (não há toggle visível na UI
  desta tela para alternar manualmente). O contêiner da página (card de
  busca, card "Playground", cards Ceiling Price/Safety Margin, indicadores)
  trocou corretamente para fundo claro com texto escuro, bordas sutis
  visíveis — sem nenhum resquício de cor escura hardcoded. O header/topbar
  superior (`Header.tsx`, componente compartilhado fora de escopo deste
  prompt) permanece escuro nos dois temas — comportamento pré-existente,
  não introduzido por esta mudança.
- **Mobile 375px**: com o viewport emulado em 375x812 (`Claude_Browser`
  `resize_window` preset mobile — o resize de janela real do
  `claude-in-chrome` não reduziu o `window.innerWidth`, que ficou preso na
  resolução do monitor remoto; a emulação de viewport do `Claude_Browser`
  resolveu isso), confirmei via `getComputedStyle` que o grid
  `lg:grid-cols-[380px_1fr]` colapsa para uma única coluna
  (`gridTemplateColumns: "343.2px"`, um único valor, largura do contêiner
  343px após padding) — formulário e resultado empilham verticalmente, sem
  overflow horizontal. `get_page_text` confirmou que todo o conteúdo
  (ticker, tipo de ativo, preço atual, playground, ceiling price, safety
  margin, indicadores, histórico de dividendos, goal planner) está presente
  e legível nessa largura.
- **Erro de ticker inválido**: digitei `ZZZZZ9` no campo — o dropdown de
  autocomplete (comportamento nativo do `AssetForm`, não alterado) mostrou
  "No assets found", mesmo tratamento da v1 (o componente de busca não foi
  tocado, só o contêiner ao redor).

## Resultado real de testes e build

### `npm run test`

```
Test Files  34 passed | 1 skipped (35)
     Tests  222 passed | 4 skipped (226)
  Start at  15:33:33
  Duration  3.64s
```

### `npm run build`

Build concluído com sucesso (Vite + Nitro/TanStack Start), incluindo o novo
chunk de rota `screener-*.js` compilado tanto no bundle de cliente quanto no
de servidor:

```
✓ built in 858ms
```

## Desvios do plano original

- Nenhum desvio funcional. A única adaptação foi de ferramenta: o resize de
  janela real (`claude-in-chrome resize_window`) não reduziu o viewport no
  ambiente remoto usado, então a verificação em 375px foi feita com a
  emulação de viewport do `Claude_Browser` (`resize_window` com
  `preset: "mobile"`), que aplica o resize via CDP e de fato mudou
  `window.innerWidth`/`innerHeight` para 375x812.
- Verificação visual feita sem login (modo convidado), como no prompt 52 —
  não há credencial de teste disponível neste ambiente e as regras de
  segurança do agente proíbem inserir credenciais em qualquer formulário.
  A rota `/app-v2/screener` não exige autenticação (mesmo padrão da v1:
  `useAuth()` sem `beforeLoad`/redirect), então isso não impediu a
  verificação real do card de resultado com dado ao vivo.

## Commit

```
Horizonte FI 55 - Screener v2
```
