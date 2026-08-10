# Relatório de Execução — Unificar Todos os Inputs de Data no Padrão Calendar com Dropdown

## 1. Resumo Executivo e Objetivo

Paulo aprovou o protótipo de calendário com dropdown de mês/ano (em vez de navegação exclusiva por setas anterior/próximo) para acelerar a seleção de datas distantes no Fuente Price Pro.

Realizamos uma varredura completa no repositório e identificamos **3 componentes reais / 4 campos de seleção de data**:
1. `src/components/ceiling/watchlist/TransactionForm.tsx` (Data da transação)
2. `src/components/ceiling/shared/InvestingSinceField.tsx` (Data "Investindo Desde")
3. `src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx` (Data de Início e Data de Vencimento de Renda Fixa)

---

## 2. Decisão Arquitetural: Extração de Componente Compartilhado (`DatePicker`)

**Local do Componente**: [`src/components/ui/date-picker.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/date-picker.tsx)

### Racional:
- **Zero Duplicação (DRY)**: Evitou repetir ~25 linhas de JSX por campo (Popover, PopoverTrigger, Button, CalendarIcon, PopoverContent, Calendar props).
- **Consistência Visual e Temática**: Garante o mesmo tema escuro, bordas, glassmorphism e foco ring em todas as partes da aplicação.
- **Parsing de Data sem Bug de Fuso Horário**: Centralizou as funções `parseToLocalDate` e `formatToISO`, resolvendo o problema comum em que strings `"YYYY-MM-DD"` convertidas via `new Date("2026-08-10")` eram interpretadas em UTC meia-noite e retrocediam um dia no fuso horário do Brasil (GMT-3).
- **Modos de Intervalo Configuráveis (`rangeMode`)**:
  - `rangeMode="past"`: Limita de 15 anos no passado (`startMonth = Jan (anoAtual - 15)`) até a data atual (`endMonth = agora`).
  - `rangeMode="future"`: Permite navegar do ano atual (`startMonth = Jan (anoAtual)`) até +40 anos no futuro (`endMonth = Dez (anoAtual + 40)`), essencial para títulos públicos e CDBs de vencimento longo (ex.: Tesouro IPCA+ 2065).

---

## 3. Detalhamento das Alterações por Componente

### 3.1 [`src/components/ui/date-picker.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/date-picker.tsx) [NOVO]
- Componente genérico que recebe props `value` (`Date | string | number | null`), `onChange`, `placeholder`, `disabled`, `rangeMode` (`"past"` | `"future"` | `"custom"`), `startMonth` e `endMonth`.
- Renderiza `<Calendar captionLayout="dropdown" />` internamente.

### 3.2 [`src/components/ceiling/watchlist/TransactionForm.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/TransactionForm.tsx) [MODIFICADO]
- Substituído a implementação inline de Popover/Calendar por `<DatePicker value={date} onChange={(d) => setDate(d)} rangeMode="past" />`.
- Mantido o timestamp salvo no objeto `Transaction` (`date.getTime()`).

### 3.3 [`src/components/ceiling/shared/InvestingSinceField.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/shared/InvestingSinceField.tsx) [MODIFICADO]
- Substituído o Popover/Calendar inline pelo `<DatePicker value={value} onChange={(d) => d && onChange(d)} rangeMode="past" />`.
- Mantida intacta a visualização somente leitura (badge estática com aviso) quando `firstTransactionDate != null`.

### 3.4 [`src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx`](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx) [MODIFICADO]
- Migrados os campos `startDate` e `maturityDate` que usavam `<Input type="date">` nativo do navegador para o componente `<DatePicker>`.
- `startDate`: usa `rangeMode="past"` (15 anos atrás até hoje).
- `maturityDate`: usa `rangeMode="future"` (ano atual até +40 anos no futuro, permitindo selecionar vencimentos distantes).
- Mantidos o estado do formulário (`startDate`/`maturityDate` como string `"YYYY-MM-DD"`) e as fórmulas de projeção de rendimento no vencimento sem qualquer alteração.

---

## 4. Evidências Literais de Validação

1. **Checagem de Tipos (`npx tsc --noEmit`)**:
   - **0 erros** (Exit code 0).
2. **Suíte de Testes (`npm run test`)**:
   - **184 testes aprovados** | 4 ignorados (31 arquivos de teste passando limpos, incluindo `design-tokens.test.ts`).
3. **Compilação de Produção (`npm run build`)**:
   - Compilação do cliente Vite e SSR concluídas com sucesso.
4. **Registro de Log**:
   - `docs/PROMPTS_LOG.md` atualizado com o resumo da implementação e racional da escolha de abstração.

---

## 5. Status da Branch e Commit

- **Branch**: `dev`
- **Alterações validadas e prontas para commit**.
