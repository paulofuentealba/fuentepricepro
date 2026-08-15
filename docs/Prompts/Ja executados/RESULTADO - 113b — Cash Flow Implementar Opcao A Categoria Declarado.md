# RESULTADO — 113b — Cash Flow: Implementação da Opção A (Categoria "Declarado")

## 1. Contexto & Resolução Técnica

Conforme decisão de Paulo (Opção A), implementamos a separação tripartite de proventos no Cash Flow:
1. **`realizedAmount` / "Pago" (Verde Sólido)**: Representa estritamente a renda líquida já recebida em meses que já se encerraram (`isPast === true`).
2. **`announcedAmount` / "Declarado" (Padrão Listrado `#striped`)**: Representa os proventos já anunciados pela empresa (data-com/`exDate` no passado, com direito adquirido do investidor), mas cuja data de pagamento está agendada para um mês futuro (`isPast === false`).
3. **`projectedAmount` / "Projetado" (Azul / Comparação)**: Representa o valor residual estatístico projetado para o mês (`Math.max(0, b.amount - announcedAmount)`), evitando qualquer duplicação ou contagem inflada.

---

## 2. Ações Realizadas

### 2.1 Backend / Lógica de Domínio (`src/lib/cashflow.ts`)
- Em `cashflow.ts:254-260`:
  - Aplicado gate `isPast` para `realizedAmount = isPast ? roundedBucketRealized : 0`.
  - Populado `announcedAmount = !isPast ? roundedBucketRealized : 0`.
  - Calculado `projectedAmount = isPast ? 0 : Math.max(0, Math.round((b.amount - announcedAmount) * 100) / 100)`.

### 2.2 Gráfico & Legenda (`src/components/ceiling/cashflow/CashFlowChart.tsx`)
- **Legenda**: Adicionado o terceiro elemento visual posicionado entre "Pago" e "Projetado", com o ícone listrado idêntico ao padrão SVG (`repeating-linear-gradient(45deg, var(--realized), var(--realized) 2px, transparent 2px, transparent 4px)`) e o texto `{t.tabs.chart.announced}`.
- **CustomTooltip**:
  - `effectiveTotal` soma `realizedConfirmedSum + announcedSum + projectedSum`.
  - Adicionada a linha de provento "Declarado" (`announcedSum > 0`) com ícone `<Clock />` e valor formatado em `formatCurrency`. Se `announcedSum === 0`, a linha é omitida graciosamente.
- **CashFlowCalendar**:
  - Atualizado o predicado `hasData` para considerar `d.announcedAmount > 0`.

### 2.3 Internacionalização (i18n)
- Adicionada chave `announced` nos 3 dicionários:
  - `dict.ptBR.ts`: `announced: "Declarado"`
  - `dict.en.ts`: `announced: "Announced"`
  - `dict.es.ts`: `announced: "Declarado"`

### 2.4 Testes Automatizados (`src/lib/__tests__/cashflowAnnounced.test.ts`)
- Criada suite cobrindo:
  1. Ativo com `exDate` passada e `paymentDate` em mês futuro cai exclusivamente em `announcedAmount` (e `realizedAmount === 0`).
  2. Ativo em mês passado cai exclusivamente em `realizedAmount` (e `announcedAmount === 0`).
  3. Cálculo de `projectedAmount` como resíduo (`b.amount - announcedAmount`), sem duplicação de valores.

---

## 3. Gates de Verificação (Regra 8 de `AGENTS.md`)
- `node scripts/check-ssot-leaks.js`: `OK: No SSOT leaks detected`
- `node scripts/forbid-legacy-tagline.js`: `OK: No legacy tagline found`
- `npx tsc --noEmit`: 0 erros (Clean)
- `npm test`: 61 arquivos / 390 testes passando (100%)
- `npm run build`: Build de produção gerado com sucesso
