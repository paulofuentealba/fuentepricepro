### Fix: Pacote 3 Bugs Menores de UX (Prompt Item 19) ✅ CONCLUÍDO E VERIFICADO

- **Diagnósticos e Soluções**:
  1. **Dropdown de Busca Cortado no Mobile (Stacking Context)**:
     - **Causa Raiz**: O componente `<Card>` usa `backdrop-blur-sm`, o que força a criação de um Stacking Context CSS individual. No mobile (`grid-cols-1`), o card de estado vazio posicionado em seguida no DOM pintava por cima do card de busca, aprisionando o dropdown `z-20`.
     - **Fix**: Adicionado `relative z-30` ao card container em `src/routes/app/screener.tsx`, e ajustados os dropdowns em `AssetForm.tsx` e `AssetComparator.tsx` para `relative z-30` e `z-50`.
  2. **Tile QTY com Grid Desequilibrado**:
     - **Causa Raiz**: O tile vizinho `safetyMargin` possuía `subValue` (Yield Alvo), estendendo a linha do grid 2x2 e deixando ~60% de espaço em branco sob o número do QTY.
     - **Fix**: Adicionado `subValue` exibindo o Preço Médio (`averagePrice`) no tile QTY em `src/components/ceiling/watchlist/assetCard/AssetCardFinancials.tsx`, equilibrando visualmente a altura de ambos os tiles.
  3. **Invested vs Received (Barra verde ausente + Rótulo cortado)**:
     - **Causa Raiz (3a)**: `COLOR_BAR` em `CashFlowChart.tsx` usava `"var(--success)"` direto no atributo `fill` SVG, que o Recharts não conseguia resolver adequadamente.
     - **Fix (3a)**: Atualizado para `"hsl(var(--success))"`, restaurando a renderização da cor verde na barra "Received".
     - **Causa Raiz (3b)**: O `AreaChart` no gráfico de fluxo possuía `margin={{ right: 0 }}`, fazendo com que a metade direita do último rótulo ("Dec" / "Dez") fosse cortada na borda do container SVG.
     - **Fix (3b)**: Ajustada a margem direita para `right: 16`.
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.66s) e SSR (251 módulos em 865ms).

---