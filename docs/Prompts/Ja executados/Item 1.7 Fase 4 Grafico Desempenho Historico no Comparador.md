# Relatório de Execução — Item 1.7 Fase 4: Gráfico de Desempenho Histórico com Benchmark no Comparador

## Contexto & Resumo

Conclusão da **Fase 4 do Item 1.7** do backlog (`docs/BACKLOG_V2.md`). O Comparador (`/app/comparator`) agora exibe um gráfico de linhas interativo (`ComparatorPerformanceChart.tsx`) plotando o retorno percentual acumulado (`cumulativeReturnPct`) dos ativos selecionados (até 3) sobrepostos aos seus benchmarks correspondentes (IBOV para BRL, S&P 500 para USD, ou ambos simultaneamente em carteiras mistas).

---

## Escopo Técnico Implementado

### 1. Camada de Dado de Preço Histórico (`apiService.functions.ts` & `queryOptions.ts`)
- **`formatYahooTicker(ticker: string): string`**:
  - Função pura exportada para testabilidade.
  - Adiciona o sufixo `.SA` para tickers brasileiros (`/^[A-Z]{4}\d{1,2}$/`) que ainda não o possuem (ex: `PETR4` -> `PETR4.SA`).
  - Preserva tickers com `.SA` pré-existente e tickers americanos (ex: `AAPL`, `MSFT`).
- **Server Function `fetchAssetPriceHistoryFn`**:
  - Encapsula `fetchYahooBenchmarkSeries(yhSymbol, fromDate, toDate)` para buscar séries históricas e calcular `cumulativeReturnPct`.
- **`assetPriceHistoryQueryOptions(ticker, fromDate, toDate)`**:
  - Configurado em `queryOptions.ts` com cache `staleTime: 24h` (`86_400_000` ms) e `gcTime: 48h`.

### 2. Componente de Gráfico (`ComparatorPerformanceChart.tsx`)
- **Visualização**: Recharts `ResponsiveContainer` + `LineChart` plotando `cumulativeReturnPct` no mesmo eixo.
- **Seleção Automática de Benchmarks**:
  - Se a seleção contém ativos BRL -> Plota linha do **IBOV** (`^BVSP`, cor `var(--warning)`).
  - Se a seleção contém ativos USD -> Plota linha do **S&P 500** (`^GSPC`, cor `var(--muted-foreground)`).
  - Se a seleção é mista -> Plota ambas as linhas de benchmark simultaneamente.
- **Cores & Design System (Gate SSOT)**:
  - Ativo 0: `var(--chart-1)`
  - Ativo 1: `var(--chart-2)`
  - Ativo 2: `var(--chart-3)`
  - IBOV: `var(--warning)` (destaque sem competir com a paleta primária)
  - S&P 500: `var(--muted-foreground)` (Slate suave para índice secundário)
  - Grid: `color-mix(in oklab, var(--border) 40%, transparent)`
  - **Zero cores hardcoded hex/rgb/oklch** no componente TSX, mantendo compliance total com `design-tokens.test.ts`.
- **Seleção de Período**: Botões `"6M"`, `"1A"`, `"5A"` ("1A" como padrão inicial).
- **Tooltips & Robustez**: Tooltip interativo customizado com formatador percentual (`+X.XX%` / `-X.XX%`) e carregamento gracioso (`Skeleton` / omissão de série com falha).

### 3. Integração na Tela (`AssetComparator.tsx`)
- Posicionado estrategicamente entre a barra de ações ("X ativos comparados" + "Exportar CSV") e o grid de `AssetCard`s.

---

## Validação dos Gates de Qualidade

1. **`npx tsc --noEmit`**: **0 erros** de compilação (Exit code 0).
2. **`npm run test`**: **176 passed** / 4 skipped (30 suítes de teste aprovadas, incluindo novos testes unitários para `formatYahooTicker`).
3. **`npm run build`**: Bundle de produção Client & SSR compilados com sucesso.

---

## Status do Backlog

Com a conclusão da Fase 4, o **Item 1.7 do Backlog V2 está 100% CONCLUÍDO (🟢)** em todas as suas 4 fases (Exportação Watchlist CSV, Exportação Comparador CSV, Importação Avançada por Template de Transações e Gráfico de Benchmarks no Comparador).
