# RESULTADO - 52 — Horizonte FI: Tabela de carteira v2

## O que foi implementado

- Nova rota `src/routes/app-v2/myportfolio.tsx`, espelhando o padrão de
  `src/routes/app/myportfolio.tsx` (lazy import + `Suspense` + skeleton),
  renderizando o novo componente `PortfolioTableV2`.
- Novo componente `src/components/horizonte/PortfolioTableV2.tsx`:
  - Fonte de dado: `valuedItems` de `useValuedPortfolio()` diretamente
    (mesmo hook da v1, nenhum novo fetch criado), filtrando
    `isClosedPosition` (mesmo padrão usado em `Watchlist.tsx`).
  - Colunas: Ativo (ticker + nome), Classe (chip usando
    `getColorForAsset()` de `chartColors.ts`, que já lê as variáveis
    `--asset-*` de `styles.css` — paleta reaproveitada, não reinventada),
    Posição (quantidade), Preço médio, Variação (`quotes[ticker].changePct`,
    mesmo campo já usado em `app-v2/index.tsx`), P&L (via `getAssetPnL()`
    do prompt 48, absoluto + percentual), Dividend Yield
    (`annualDividend / currentPrice`).
  - `fontVariantNumeric: "tabular-nums"` aplicado via `style` inline em
    todas as células numéricas (posição, preço médio, variação, P&L, DY).
  - Ordenação por coluna: cliques no cabeçalho alternam
    asc/desc, client-side sobre o array já carregado. Verifiquei o hook
    `useAssetFilterSort` (usado em `Watchlist.tsx`) antes de escrever
    lógica nova — ele resolve um dropdown de tipo/ordenação predefinida,
    não sort por clique de coluna, então não era reaproveitável para este
    requisito específico; o estado de sort por coluna foi implementado
    localmente no componente.
  - Busca por ticker/nome: campo de texto simples filtrando
    `ticker`/`name` (case-insensitive) sobre o array carregado — nenhum
    hook de busca livre por texto existente foi encontrado na base para
    reaproveitar.
  - Estado vazio: mesma linguagem do hero do dashboard v2 (prompt 50/51,
    `HorizonteHero.tsx`) — "Registre seu primeiro aporte para começar sua
    jornada" — mantendo consistência de voz quando
    `valuedItems.length === 0` (considerando apenas posições ativas).
  - Sem `backdrop-blur`/glow: o card/tabela usa apenas
    `var(--h-paper-raised)` + borda `var(--h-line)` + `var(--h-shadow-sm)`
    (tokens já existentes de `horizonte-tokens.css`), sem nenhum efeito de
    blur ou glow — reservado só ao hero conforme a regra de design.
  - Responsivo: `overflow-x-auto` no wrapper da tabela, com
    `min-w-[720px]` na `<table>` para preservar a densidade de colunas em
    telas estreitas sem quebrar o layout da página.

## Arquivos criados

- `src/routes/app-v2/myportfolio.tsx`
- `src/components/horizonte/PortfolioTableV2.tsx`

## Arquivos alterados

Nenhum arquivo existente foi modificado — apenas os dois arquivos novos
acima (a rota `/app-v2/myportfolio` é descoberta automaticamente pelo
TanStack Router file-based routing; o `routeTree.gen.ts` foi regenerado
pelo próprio processo de build).

## Resultado real de testes e build

### `npm run build`

Build concluído com sucesso (Vite + Nitro/TanStack Start), incluindo o novo
chunk `PortfolioTableV2-CpJHEWde.js` (10.67 kB / gzip 3.11 kB) e a rota
`app-v2/myportfolio` compilada nos bundles de servidor/cliente. Saída
final:

```
✓ built in 877ms
```

### `npm run test -- --run`

```
 Test Files  34 passed | 1 skipped (35)
      Tests  221 passed | 4 skipped (225)
   Start at  15:03:28
   Duration  3.38s (transform 1.04s, setup 0ms, import 7.94s, tests 2.75s, environment 2.47s)
```

Nenhum teste novo foi adicionado nesta etapa (o componente não introduz
lógica de cálculo nova além do já coberto por `getAssetPnL()`, que já tem
cobertura própria em `src/lib/selectors/__tests__/assetPnL.test.ts` do
prompt 48). A suíte completa existente permanece 100% verde após as
mudanças.

## Desvios do plano original

- **Sort por coluna implementado localmente, não via `useAssetFilterSort`**:
  o hook existente resolve um caso de uso diferente (dropdown de
  tipo/ordenação predefinida via `SortOption`), incompatível com "clicar
  no cabeçalho da coluna para ordenar" pedido no critério 5. Optei por não
  forçar reaproveitamento onde a forma de interação é distinta, para não
  distorcer o hook existente ou o comportamento da v1. Nenhum hook novo
  foi extraído para `src/lib/` — a lógica ficou local ao componente por
  ser específica desta tela.
- **Rótulo da "Classe"**: o chip usa o valor bruto de `item.type` (ex.:
  `"FII"`, `"STOCK_BR"`) como texto, pois não foi encontrado nenhum mapa
  de rótulos traduzidos para tipo de ativo reaproveitável na v1 (buscado
  em `Watchlist.tsx`, `AssetCard.tsx`, `chartColors.ts`). Isso preserva
  paridade de dado (não é uma coluna nova, é o mesmo campo `type` já
  existente) sem inventar um novo texto de UX fora de escopo.
- Nenhum outro desvio do escopo descrito no prompt.

## Comparação de valores com a v1

Os valores exibidos vêm exatamente do mesmo `valuedItems` de
`useValuedPortfolio()` consumido por `Watchlist.tsx`/`AssetCard.tsx` na
v1, sem transformação adicional além de `getAssetPnL()` (já testado no
prompt 48) e formatação padrão (`formatCurrency`/`formatPercent` de
`src/lib/formatters.ts`, também usados na v1). Como não há ambiente com
dados de um usuário real disponível nesta execução para uma comparação
visual lado a lado, a paridade foi garantida por construção (mesma fonte,
mesmas funções puras, mesmos formatadores) em vez de captura de tela
comparativa.

## Commit

```
Horizonte FI 52 - Tabela de carteira v2
```
