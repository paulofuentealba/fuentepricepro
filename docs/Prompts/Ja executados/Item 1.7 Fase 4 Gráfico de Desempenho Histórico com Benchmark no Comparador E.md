### Item 1.7 Fase 4: Gráfico de Desempenho Histórico com Benchmark no Comparador ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Implementada a Fase 4 do Item 1.7 do backlog (`docs/BACKLOG_V2.md`), adicionando o gráfico de linhas de desempenho histórico (`ComparatorPerformanceChart.tsx`) na tela do Comparador (`/app/comparator`).
- **Recursos Principais**:
  1. **Serviço de Séries de Preços de Ativos (`fetchAssetPriceHistoryFn` + `formatYahooTicker` + `assetPriceHistoryQueryOptions`)**:
     - `formatYahooTicker` adiciona sufixo `.SA` para tickers BR sem sufixo e preserva ativos US/símbolos customizados.
     - `fetchAssetPriceHistoryFn` calcula o retorno percentual acumulado `cumulativeReturnPct`.
     - `assetPriceHistoryQueryOptions` gerencia o cache com `staleTime: 24h`.
  2. **Gráfico `ComparatorPerformanceChart.tsx`**:
     - Desenho em Recharts sobrepondo até 3 ativos e benchmarks automáticos (IBOV para BRL, S&P 500 para USD, ou ambos em carteiras mistas).
     - Seletores de período `6M`, `1A` (padrão) e `5A`.
     - Cores baseadas no Design System SSOT (`var(--chart-1)`, `var(--chart-2)`, `var(--chart-3)` para ativos, `var(--warning)` para IBOV, `var(--muted-foreground)` para S&P 500).
     - Custom Tooltip exibindo o retorno acumulado de cada ativo/benchmark na data.
  3. **Conclusão do Item 1.7**:
     - Marcatura de conclusão completa (🟢) do Item 1.7 no `docs/BACKLOG_V2.md` cobrindo todas as 4 fases.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **176 passed** | 4 skipped (30 suítes de teste aprovadas, incluindo testes de `formatYahooTicker`).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `4ca560d` (`feat(comparator): adiciona grafico de desempenho historico com benchmarks no comparador (Item 1.7 Fase 4)`).

---