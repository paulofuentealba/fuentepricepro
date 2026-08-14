# RESULTADO — 54 — Horizonte FI: QA final e paridade v1

## O que foi feito

Auditoria completa dos 7 itens do checklist do prompt 54, sobre o trabalho já
implementado e commitado nos prompts 46-52 (commits `32174e3`…`6a7783a`). Este
prompt não introduziu feature nova — só auditou, com evidência real (git diff,
Network tab via browser automatizado, JS de contraste WCAG rodado no DOM real,
leitura de código), e atualizou `docs/SSOT.md` (Seção 3 Épico 5, Seção 6 item 12).

Nenhum código de produção foi alterado como parte desta etapa (correção dos 2
achados de acessibilidade fica para um prompt de correção separado, fora do
escopo declarado do prompt 54).

## Ambiente de teste

- `npm run dev` (Vite, porta real `5174` — a `5173` já estava ocupada no ambiente).
- Sessão sem usuário logado (guest) — hero e tabela em estado vazio ("Registre seu
  primeiro aporte..."). Isso limitou a verificação visual do redraw do `<canvas>`
  em troca de tema (não há `<canvas>` montado no estado vazio) — ver item 5.
- Browser automatizado (Chrome via MCP) sem compositing de pane disponível
  (`screenshot`/`read_page` retornaram erro "Browser pane não exibido") — evidência
  coletada via `get_page_text`, `read_network_requests` e `javascript_tool`
  (execução de JS no DOM real), não via captura visual.

## Resultado por item (Passou / Falhou / Não aplicável)

**1. Zero regressão em v1 (escopo de arquivos) — Passou**

`git diff --stat 32174e3~1..6a7783a` mostra que o range de commits só tocou:
`src/routes/app-v2*`, `src/components/horizonte/`, `src/components/layout-v2/`,
`src/lib/useFIProgress.ts`, `src/lib/selectors/`, `src/styles/horizonte-tokens.css`,
testes correspondentes, `public/fonts/*.woff2`, `docs/Prompts/*.md`, e
`src/components/ceiling/FIProgressCard.tsx` — este último é o refactor **previsto
explicitamente no prompt 47** (extrair `useFIProgress()` sem alterar comportamento),
não uma mudança fora de escopo. `routeTree.gen.ts` também mudou (gerado
automaticamente pelo TanStack Router ao registrar as novas rotas `/app-v2/*`).

Nenhum arquivo de `src/routes/app/`, `src/components/ceiling/` (exceto o citado),
ou qualquer outro caminho de produção v1 aparece no diff.

**2. Paridade numérica — Passou**

`src/lib/useFIProgress.ts` foi comparado linha a linha com a implementação
original inline de `FIProgressCard.tsx` (antes do prompt 47): mesma fórmula de
`calculateMonthsToFI`, mesmo cálculo de `totalCapitalBRL`/`monthlyIncomeBRL` via
`useValuedPortfolio().valuedItems`, mesma conversão de moeda. `PortfolioTableV2`
usa o mesmo `useValuedPortfolio()` e o mesmo `getAssetPnL()` (prompt 48, com
`assetPnL.test.ts`) que a v1 — nenhum novo cálculo de P&L/preço médio/yield foi
criado. Coberto por `useFIProgress.test.ts` (133 linhas) e `assetPnL.test.ts`
(76 linhas), ambos passando (ver seção de testes abaixo).

**3. Acessibilidade — Falhou**

Dois achados confirmados com evidência real, coletada rodando JS no DOM da
página `/app-v2` renderizada (não estimado):

- **Contraste AA insuficiente**: token `--h-ink-faint` sobre `--h-paper` mede
  **2.88:1** no tema claro e **3.75:1** no tema escuro (calculado com a fórmula
  de luminância relativa do WCAG 2.1, rodada via `javascript_tool` sobre os
  valores computados de `getComputedStyle()`). O mínimo AA para texto pequeno é
  4.5:1. Esse token é usado em `HorizonteHero.tsx` (rótulo de marco não atingido)
  e é candidato a estar em outros textos secundários dos componentes v2. Os
  demais pares testados passam AA: `--h-ink`/`--h-paper` (15.4:1 claro, 15.6:1
  escuro), `--h-ink-soft`/`--h-paper` (6.97:1 claro, 8.08:1 escuro),
  `--h-accent-fg`/`--h-accent` (6.19:1 claro, 7.35:1 escuro).
- **Cabeçalhos ordenáveis não navegáveis por teclado**: `SortableHeader` em
  `src/components/horizonte/PortfolioTableV2.tsx` (linhas 166-193) renderiza um
  `<th onClick={...}>` sem `tabIndex`, `onKeyDown`/`onKeyPress`, ou `role="button"`
  — um `<th>` nativo não é focável nem operável via Enter/Espaço. Usuários de
  teclado não conseguem ordenar a tabela por coluna, apenas usuários de mouse.

`prefers-reduced-motion` **está corretamente respeitado**: `HorizonteHero.tsx`
(linhas 112-119) checa `window.matchMedia("(prefers-reduced-motion: reduce)").matches`
antes de iniciar a animação de `requestAnimationFrame` e, se verdadeiro, desenha
o estado final direto — confirmado por leitura de código (não testável
visualmente no ambiente sem `<canvas>` montado).

**4. Responsividade (375px) — Passou**

Por leitura de código: grid de cards do dashboard usa
`grid-cols-1 sm:grid-cols-3` (`src/routes/app-v2/index.tsx`, linha 160) — empilha
abaixo do breakpoint `sm` (640px), cobrindo 375px. `PortfolioTableV2` envolve a
`<table>` em `<div className="w-full overflow-x-auto ...">` dedicado (linha 135-142)
— o scroll horizontal é do container da tabela, não da página.

**5. Tema claro/escuro sem reload — Passou, com ressalva**

Confirmado via `resize_window` com `colorScheme: "dark"` seguido de
`getComputedStyle()` no DOM real: `--h-paper` mudou de `#f7f4ec` (claro) para
`#15120c` (escuro) sem reload de página, refletindo a regra
`@media (prefers-color-scheme: dark)` de `horizonte-tokens.css`.

**Ressalva**: a aplicação (v1 e v2) **não tem nenhum toggle manual de tema** —
busca em todo `src/` por `data-theme`/`setTheme`/`ThemeToggle` só encontrou os
seletores CSS `[data-theme="dark"]`/`[data-theme="light"]` no próprio
`horizonte-tokens.css`; nenhum componente os aciona. Ou seja, hoje só é possível
testar a troca de tema via preferência do SO, não via um botão dentro do app —
isso não é uma regressão desta série, é uma limitação pré-existente de todo o
produto. O redesenho do `<canvas>` do hero em troca de tema **não pôde ser
confirmado visualmente**: a sessão de teste não tinha usuário logado com carteira,
então `HorizonteHero` renderiza o estado vazio (sem `<canvas>` montado). Por
leitura de código, `HorizonteHero.tsx` (linhas 149-160) registra um listener em
`matchMedia("(prefers-color-scheme: dark)")` que força um redraw do canvas — a
lógica existe, mas não foi exercida ao vivo.

**6. Fontes locais, zero requisição externa — Passou**

`read_network_requests` em `/app-v2` (dev, `localhost:5174`) mostra:
`GET /fonts/fraunces-variable-normal.woff2 → 200`,
`GET /fonts/inter-variable-normal.woff2 → 200`, ambas de `localhost:5174`.
Nenhuma requisição a `fonts.googleapis.com`, `fonts.gstatic.com`, ou qualquer CDN
externo apareceu na lista completa de requisições da página.

**7. `/app` não carrega tokens/fontes da v2 — Passou**

Em dev, a lista completa de requisições de rede ao carregar `/app` **não contém**
nenhuma referência a `horizonte-tokens.css` nem a `*variable*.woff2`. Ao navegar
para `/app-v2` na mesma sessão, essas requisições aparecem. Em build de produção
(`npm run build`), `horizonte-tokens.css` sai como chunk CSS isolado
(`assets/index-D2P33_qO.css`, 3.8kB — vs. `assets/styles-kT0q8ZeM.css`, 161kB, o
bundle global). Verificado via `grep` nos chunks JS gerados: o chunk
`myportfolio-*.js` da v1 (que referencia `FIProgressCard`) não referencia o CSS
isolado; o chunk `myportfolio-*.js` da v2 (que referencia `PortfolioTableV2`)
referencia.

## Achado adicional fora do checklist (não bloqueante)

`package.json`/`package-lock.json` no working tree têm duas `devDependencies`
(`@fontsource-variable/fraunces`, `@fontsource-variable/inter`) que nunca foram
commitadas em nenhum dos commits do range 46-52. Confirmado via
`grep -r "fontsource" src/` — zero ocorrências: as fontes são carregadas por
`@font-face` local em `horizonte-tokens.css`, não pelo pacote npm. Parecem
resíduo de uma prototipagem inicial (talvez cogitando usar o pacote antes de
optar por `.woff2` locais). Não afeta nenhum dos 7 itens do checklist, mas deve
ser limpo (`npm uninstall` das duas) ou justificado numa próxima etapa — não
fiz essa limpeza aqui por estar fora do escopo declarado deste prompt (QA/auditoria,
não maintenance).

## Testes e build (resultado real, não assumido)

### `npm run test -- --run`

```
 Test Files  34 passed | 1 skipped (35)
      Tests  221 passed | 4 skipped (225)
   Start at  15:05:03
   Duration  3.37s
```

### `npm run build`

Build de produção concluído com sucesso (`✓ built in 775ms` no build do servidor,
mais o build do cliente antes dele). Chunks relevantes confirmados no output:
`app-v2-*.js`, `myportfolio-*.js` (x2, v1 e v2), `PortfolioTableV2-*.js`,
`useFIProgress-*.js`, `FIProgressCard-*.js` — todos separados, confirmando
code-splitting por rota.

## Desvios do plano original

- Não corrigi os 2 achados de acessibilidade (item 3) — o prompt 54 pede
  auditoria e relato com evidência ("Este prompt não escreve feature nova —
  audita"), não correção. Recomendo abrir um prompt de correção dedicado antes
  de promover `/app-v2` para qualquer exposição real a usuários.
- Não consegui capturar screenshots do browser automatizado (pane não exibido no
  ambiente desta sessão) — usei `get_page_text`, `read_network_requests` e
  execução de JS no DOM (`javascript_tool`) como evidência equivalente, sempre
  contra a página real renderizada, nunca estimado.
- Não consegui confirmar visualmente o redraw do `<canvas>` do hero em troca de
  tema (item 5) por falta de um usuário de teste com carteira populada no
  ambiente — documentado como limitação, não reportado como "passou" sem prova.
- Porta real do dev server foi `5174` (não `3000`/`5173`, ambas ocupadas/config
  padrão do Vite) — sem impacto no resultado, só registrado para reprodutibilidade.

## Arquivos alterados nesta etapa

- `docs/SSOT.md` (Seção 3 Épico 5, Seção 6 item 12)
- `docs/Prompts/RESULTADO - 54 — Horizonte FI QA Final e Paridade v1.md` (este arquivo)
- `.claude/launch.json` (criado para permitir preview do dev server via browser
  automatizado — configuração de tooling, não código de produção)
