# Unificar Todos os Inputs de Data no Padrão Calendar com Dropdown

Unificação de todos os campos de seleção de data do sistema para utilizarem o padrão visual e de interação `Popover` + `Calendar` (com `captionLayout="dropdown"`), permitindo seleção rápida de mês e ano por dropdowns em vez de navegação individual por setas.

## Contexto e Diagnóstico

Foram identificados 4 campos de data distribuídos em 3 componentes do repositório:
1. `src/components/ceiling/watchlist/TransactionForm.tsx` (Data da transação — já usava Popover+Calendar).
2. `src/components/ceiling/shared/InvestingSinceField.tsx` (Data "Investindo Desde" — já usava Popover+Calendar).
3. `src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx` (Data de Início e Data de Vencimento de Renda Fixa — usavam `<Input type="date">` nativo).

## Decisão Arquitetural: Extração de Componente Compartilhado (`DatePickerField`)

Optamos por extrair um componente reutilizável `DatePickerField.tsx` em `src/components/ui/date-picker.tsx` (ou `src/components/ceiling/shared/DatePickerField.tsx`).

### Racional:
- **Evita duplicação**: Os 4 campos possuem a mesma estrutura visual (botão trigger estilizado com ícone de calendário, popover responsivo, calendário em dark mode com dropdown de mês/ano).
- **Consistência de parsing/formatação de datas**: Centraliza o tratamento seguro de fuso horário local ao converter strings `"YYYY-MM-DD"` de/para objetos `Date`.
- **Flexibilidade de limites de data**: Aceita props de configuração como `fromYear`/`toYear` ou `startMonth`/`endMonth`, permitindo suportar tanto intervalos passados (15 anos atrás até hoje) quanto intervalos futuros (hoje até +40 anos para Vencimento de Renda Fixa).

## Proposed Changes

### UI / Shared Component

#### [NEW] [date-picker.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ui/date-picker.tsx)
- Encapsula `Popover`, `PopoverTrigger`, `Button`, `CalendarIcon`, `PopoverContent` e `<Calendar captionLayout="dropdown" />`.
- Suporta entradas como `Date`, `string` (`"YYYY-MM-DD"`), ou `number` (timestamp).
- Oferece modos predefinidos ou customizados (`startMonth`, `endMonth`, `disabled`).

### Watchlist & Ceiling Components

#### [MODIFY] [TransactionForm.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/TransactionForm.tsx)
- Substituir o uso direto de `Popover` + `Calendar` pelo `<DatePickerField>`.
- Configurar limite de 15 anos no passado até o mês/ano atual (`captionLayout="dropdown"`).

#### [MODIFY] [InvestingSinceField.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/shared/InvestingSinceField.tsx)
- Substituir o uso direto de `Popover` + `Calendar` pelo `<DatePickerField>`.
- Manter comportamento de leitura (badge) quando `firstTransactionDate` existir.
- Configurar limite de 15 anos no passado até o mês/ano atual (`captionLayout="dropdown"`).

#### [MODIFY] [FixedIncomeWizardSheet.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/FixedIncomeWizardSheet.tsx)
- Migrar `startDate` e `maturityDate` de `<Input type="date">` para `<DatePickerField>`.
- `startDate`: intervalo de 15 anos no passado até o mês atual.
- `maturityDate`: intervalo do ano atual até +40 anos no futuro (permitindo títulos de longo prazo).

### Documentation & Tracking

#### [MODIFY] [PROMPTS_LOG.md](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/PROMPTS_LOG.md)
- Registrar o resumo da tarefa e a decisão de refatoração/compartilhamento do componente `DatePickerField`.

#### [NEW] [Relatório Final em Prompts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/Prompts)
- Salvar o relatório de execução na pasta `docs/Prompts/`.

## Verification Plan

### Automated Verification
- `npx tsc --noEmit` (sem erros de tipos)
- `npm run test` (todos os testes passando, incluindo `design-tokens.test.ts`)
- `npm run build` (build limpo sem erros de empacotamento)

### Manual & Visual Verification
- Capturar screenshots dos 3 componentes atualizados.
- Testar a navegação de ano/mês no dropdown para datas passadas (15 anos) e futuras (+40 anos no Wizard de Renda Fixa).
