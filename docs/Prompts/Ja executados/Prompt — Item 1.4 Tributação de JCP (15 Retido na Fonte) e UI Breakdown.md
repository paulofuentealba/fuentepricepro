### Prompt — Item 1.4: Tributação de JCP (15% Retido na Fonte) e UI Breakdown ✅

- **Objetivo**: Corrigir o cálculo de renda realizada de JCP (Juros sobre Capital Próprio), aplicando a alíquota legal de 15% de IRRF (anteriormente calculado como 0%), e adicionar distinção visual de JCP vs Dividendo na tabela de proventos do ativo e no resumo do Cash Flow.
- **Investigação da API Brapi (Parte A)**:
  - Efetuadas chamadas HTTP reais e verificado que o endpoint `https://brapi.dev/api/quote/{ticker}?fundamental=true&dividends=true` retorna o campo **`label`** em cada item de `dividendsData.cashDividends` (tanto com token quanto sem token).
  - Confirmados os valores `"JCP"` (sujeito a 15% IRRF), `"DIVIDENDO"` (0% IRRF) e `"RENDIMENTO"` (0% IRRF).
- **Implementação Técnica (Parte B)**:
  - **Provider & Domain (`brapi.server.ts` & `domain.ts`)**: Adicionada propriedade `isJCP?: boolean` no `DividendEvent`, derivada de `d.label?.toUpperCase().includes("JCP")`.
  - **Motor de Cálculo SSOT (`calculations.ts` & `realizedIncome.ts`)**:
    - Criada constante `JCP_TAX_RATE = 0.15` (15%).
    - Adicionado o parâmetro opcional `isJCP?: boolean` na 5ª posição de `dividendTaxRate` e `netAfterTax` (mantendo 100% de compatibilidade retroativa com os 8 pontos de chamada existentes no sistema).
    - `getTaxType` e `calculateRealizedIncome` atualizados para atribuir `taxType: "jcp"` e descontar 15% de imposto no valor líquido (`amountNet`), propagando automaticamente para o IRR da carteira (`portfolioIrr.ts`) e relatórios.
    - `computeRealizedIncomeSummary` atualizado para computar subtotais de `dividendTotal` e `jcpTotal`.
  - **UI & i18n (`DividendsHistoryPanel.tsx` & `CashFlowSummary.tsx`)**:
    - Adicionada coluna "Tipo" na tabela de histórico do ativo com badges de "Dividendo" (emerald) ou "JCP" (amber).
    - Adicionado resumo de subtotal Dividendo vs JCP (Retido 15%) nos cards do Cash Flow.
    - Chaves i18n adicionadas em `dict.en.ts`, `dict.ptBR.ts` e `dict.es.ts`.
- **Testes Unitários**:
  - `calc.test.ts`: Adicionado teste para `dividendTaxRate` e `netAfterTax` com `isJCP: true` (confirma 15% / R$ 85 líquido para R$ 100 bruto).
  - `realizedIncome.test.ts`: Adicionado teste para `getTaxType` e cenário 7 de `calculateRealizedIncome` com evento de JCP.
- **Validação**:
  - `npm run test`: **108/108 testes unitários aprovados** em 17 arquivos de teste.
  - `npm run build`: Compilação Client/SSR 100% limpa.

---