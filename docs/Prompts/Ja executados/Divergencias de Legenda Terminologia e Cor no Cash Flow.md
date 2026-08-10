# Divergências de Legenda, Terminologia e Cor no Cash Flow

> [!NOTE]
> Diagnóstico empírico com causas raízes e soluções implementadas para as 4 divergências identificadas na tela do Cash Flow.

---

## 1. Diagnóstico e Resolução das 4 Divergências

### 🔍 Divergência 1 — Tooltip com terminologia diferente da legenda
- **Causa Raiz**: A legenda do gráfico exibia 2 categorias ("Realizado" e "Projetado"), enquanto o tooltip exibia até 4 linhas soltas sem agrupamento visual (`Realizado`, `Pago`, `Provisionado`, `Projetado`).
- **Decisão Tomada (Opção A)**:
  - Estruturação do tooltip em 2 blocos principais correspondentes à legenda:
    1. **Realizado / Confirmado** (soma de `realizedAmount + paidAmount + announcedAmount`).
    2. **Projetado** (`projectedAmount`).
  - Quando houver mais de uma componente em "Realizado / Confirmado", os sub-itens soam exibidos de forma indentada com marcadores (`• Realizado`, `• Pago`, `• Provisionado`), mantendo total transparência sem poluir ou divergir do gráfico principal.

---

### 🎨 Divergência 2 — Cor do valor total do tooltip inconsistente com o código
- **Causa Raiz**: O span do total utilizava a classe Tailwind `text-success` que sofria interferência de especificidade/herança de cor do container `<ChartTooltip>` do Recharts ao passar o mouse sobre barras de projeção.
- **Correção**: Definida a cor diretamente via `style={{ color: isBest ? "var(--warning)" : isWorst ? "var(--muted-foreground)" : "var(--success)" }}`, garantindo renderização verde (`var(--success)`) 100% constante em runtime.

---

### 🧮 Divergência 3 — Total do tooltip não bate com a soma das linhas mostradas
- **Causa Raiz**: O cabeçalho do tooltip lia `payload[0].payload.amount`, que registrava a fórmula de projeção estática bruta (`b.amount`). Em meses passados ou mistos, a soma das parcelas efetivas (`realizedAmount` + `paidAmount` + `announcedAmount`) diferia de `b.amount`.
- **Correção**: O valor total exibido no cabeçalho do tooltip agora é calculado dinamicamente como:
  $$\text{effectiveTotal} = (\text{realizedAmount} + \text{paidAmount} + \text{announcedAmount}) + \text{projectedAmount}$$
  Isso garante matemática perfeita onde o total bate com a soma do detalhamento a R$ 0,01.

---

### 🌐 Divergência 4 — Cards de resumo (topo da tela) com texto hardcoded fora do i18n
- **Causa Raiz**: `CashFlowSummary.tsx` utilizava ternários `isEn = locale === "en"` com strings hardcoded em inglês/português, violando as diretrizes de i18n e sem suporte ao Espanhol. O nome "Projeção Anual / Annual Projected" também era ambíguo, pois o card exibe o total anual (realizado + projetado).
- **Correção**:
  1. Adicionadas chaves i18n em `tabs.cashflow.summary` e `tabs.chart.realizedAndConfirmed` nos 3 dicionários (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`).
  2. Atualizado o rótulo do card para `"Total Anual (Realizado + Projetado)"` / `"Annual Total (Realized + Projected)"` / `"Total Anual (Realizado + Proyectado)"`, eliminando a ambiguidade com o card de projeção pura.

---

## 2. Evidências Literais de Validação dos 3 Gates

1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
2. **`npm run test`**: **155 passed** | 4 skipped (26 arquivos de teste aprovados).
3. **`npm run build`**: Client e SSR compilados com sucesso.
