# Relatório de Execução — Simplificar Legenda Mensal e Corrigir Cores do Tooltip Investido vs. Recebido

## Contexto e Objetivo
Ajustar o componente `CashFlowChart.tsx` para simplificar a apresentação do gráfico mensal de proventos e alinhar a paleta de cores do tooltip de "Investido vs. Recebido" com as barras do gráfico correspondente.

---

## Modificações Realizadas

### 1. Simplificação da Legenda e Tooltip do Gráfico Mensal (`CustomTooltip`)
- **Legenda**: Alterado a rótulo de "Realizado" (`t.tabs.chart.realized`) para **"Pago"** (`t.tabs.chart.confirmed`), reutilizando a chave i18n existente sem criar novas entradas.
- **Tooltip (`CustomTooltip`)**:
  - Removido o agrupamento com sub-itens indentados (`• Realizado`, `• Pago`, `• Provisionado`).
  - Simplificado para 2 linhas limpas no estilo do `InvestedVsReceivedTooltip`:
    - `Pago: {realizedConfirmedSum}` (`text-success`, ícone `CheckCircle`) — renderizado quando `realizedConfirmedSum > 0`.
    - `Projetado: {projectedSum}` (`text-comparison`, ícone `TrendingUp`) — renderizado quando `projectedSum > 0`.
  - Em meses com proventos 100% pagos (ex: Abril), exibe apenas a linha "Pago".
  - Em meses mistos (ex: Agosto), exibe as linhas "Pago" e "Projetado".
  - Mantidos o total do cabeçalho (`effectiveTotal`) e sua lógica de destaque de cor (`isBest` / `isWorst`) inalterados.

### 2. Correção de Cores do Tooltip "Investido vs. Recebido" (`InvestedVsReceivedTooltip`)
- **Valor de `item.invested`**: Atualizado de `text-foreground` para `text-success` (verde, correspondendo à cor `COLOR_BAR` / `var(--success)` das barras de Investido).
- **Valor de `item.received`**: Atualizado de `text-success` para `text-comparison` (azul, correspondendo à cor `COLOR_INVESTED` / `var(--comparison)` das barras de Recebido).

---

## Validação dos Gates

1. **`npx tsc --noEmit`**: 0 erros de compilação.
2. **`npm run test`**: 156 testes passaram em 25 arquivos de teste (incluindo o gate estático de tokens de design).
3. **`npm run build`**: Bundle de produção Client & SSR gerados sem erros.

---

## Registro do Commit
- **Mensagem**: `fix(cashflow): simplifica legenda e tooltip para Pago/Projetado e corrige cores de Investido vs Recebido`
- **Hash**: `0ad5022`
- **Branch local**: `main` (Sem push conforme instrução do usuário).
