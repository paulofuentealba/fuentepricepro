# Plano de Implementação — Item 2: NextPaymentBanner Migrar para `paymentDate` Real

Reestruturação do componente `NextPaymentBanner` e do container `WatchlistKpiSection` para utilizar a data de pagamento real (`paymentDate` do `DividendEvent`) em vez da data-com (`exDividendDate`), evitando a ocultação precoce de dividendos iminentes e exibindo a contagem total de pagamentos.

## Governança de Roles (Regra 9 de AGENTS.md)

- **fuente-architecture-review**: **Aplicado** — Garantia de reutilização da query paralela e cache TanStack Query (`assetQueryOptions` com `staleTime=5min`) já consolidado em `CashFlowCalendar.tsx`.
- **fuente-solution-architect**: **Aplicado** — Integração do mapa de eventos reais de dividendos (`DividendEventsMap`) entre `WatchlistKpiSection` e `NextPaymentBanner`.
- **fuente-product-manager**: **Aplicado** — Ajuste da regra de negócio para considerar o valor declarado do dividendo (`amountPerShare`) e tratamento gracioso de fallback com flag `paymentDateEstimated`.
- **fuente-ux-designer**: **Aplicado** — Exibição transparente da contagem total ("X de Y próximos pagamentos") e sinalização visual para pagamentos com data/valor estimados.
- **Papéis não aplicáveis a esta tarefa**:
  - *fuente-investidor-profissional*: A fórmula de imposto `netAfterTax` e o cálculo de valor por cota já estão em conformidade.
  - *fuente-investidor-iniciante*: Não altera métricas de valuation.
  - *fuente-business-architect*: Não afeta precificação ou planos de subscrição.
  - *fuente-product-marketing*: Não altera materiais promocionais.
  - *fuente-advogado-lgpd-gdpr*: Não envolve dados pessoais sensíveis.

---

## User Review Required

> [!IMPORTANT]
> **MUDANÇA DE COMPORTAMENTO DO BANNER:**
> 1. Ativos cuja data-com (`exDividendDate`) já passou, mas cujo pagamento (`paymentDate`) ainda vai ocorrer nos próximos dias (ex: KNCR11 com ex-date em 01/07 e pagamento em 13/08), **não serão mais omitidos** e aparecerão no banner com a data e o valor real declarado por cota.
> 2. Se houver mais de 4 pagamentos futuros, o banner exibirá a lista dos 4 mais próximos e ajustará o cabeçalho para "4 de X próximos pagamentos" (via novas chaves de i18n em ptBR, en e es).

---

## Pontos de Atenção & Decisões de Arquitetura

1. **Risco (Cache de Queries em `WatchlistKpiSection.tsx`)**:
   - **Identificação**: Fazer requisições duplicadas de ativos para obter `dividendEvents`.
   - **Decisão**: Reutilizar `useQueries` com `assetQueryOptions(it.ticker)` exatamente como feito em `CashFlowCalendar.tsx`. Como o TanStack Query possui `staleTime = 5min`, o custo é zero se a busca já foi realizada.
2. **Risco (Diferenciação entre Eventos Reais vs Estimados)**:
   - **Identificação**: Provedores de dados que não fornecem `paymentDate` explícito ou eventos baseados em projeção histórica.
   - **Decisão**: Utilizar o valor declarado `ev.amountPerShare * quantity` quando `DividendEvent` existe. Se `ev.paymentDate` for nulo ou se for usada a heurística histórica de `paymentMonths`, marcar `estimated: true` e exibir um indicador visual sutil `(est.)`.

---

## Proposed Changes

### Internationalization (`src/lib/i18n/dict.*.ts`)

#### [MODIFY] [dict.ptBR.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.ptBR.ts), [dict.en.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.en.ts), [dict.es.ts](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.es.ts)
- Adicionar chave `upcomingPaymentsCount` aos dicionários:
  - ptBR: `"{{x}} de {{total}} Próximos Pagamentos"`
  - en: `"{{x}} of {{total}} Upcoming Payments"`
  - es: `"{{x}} de {{total}} Próximos Pagos"`

---

### KPI Section Container (`src/components/ceiling/watchlist/WatchlistKpiSection.tsx`)

#### [MODIFY] [WatchlistKpiSection.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/WatchlistKpiSection.tsx)
- Importar `useQueries` de `@tanstack/react-query`, `assetQueryOptions` de `@/lib/queryOptions` e `DividendEventsMap` de `@/lib/cashflow`.
- Construir `dividendEventsMap` usando `useQueries` sobre `valuedItems`.
- Passar `dividendEventsMap` como prop para `<NextPaymentBanner />`.

---

### Next Payment Banner (`src/components/ceiling/watchlist/NextPaymentBanner.tsx`)

#### [MODIFY] [NextPaymentBanner.tsx](file:///c:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/NextPaymentBanner.tsx)
- Atualizar interface `Props` para incluir `dividendEventsMap: DividendEventsMap`.
- Refatorar o filtro de eventos em `useMemo`:
  - Iterar sobre `items`. Para cada item, buscar `dividendEventsMap[it.ticker]`.
  - Filtrar eventos onde `paymentDate > now`. Para cada evento válido, calcular `amountNet` com `ev.amountPerShare * it.quantity` e tributação `netAfterTax`.
  - Se não houver eventos com `paymentDate` futuro, utilizar fallback de data-com futura ou heurística com flag `estimated: true`.
- Calcular `totalCount = upcomingList.length` e limitar a exibição visual a `displayList = upcomingList.slice(0, 4)`.
- Se `totalCount > 4`, utilizar o rótulo i18n interpolado `"X de Y Próximos Pagamentos"`.
- Adicionar indicador visual `(est.)` quando `upcoming.estimated` for verdadeiro.

---

## Verification Plan

### Automated Tests
- Executar `npx tsc --noEmit` — 0 erros.
- Executar `npx vitest run` — 140+ testes passados.
- Executar `npm run build` — compilação limpa do cliente e SSR.

### Manual & Behavioral Verification
- **Teste Comportamental com KNCR11**: Simular ou verificar um ativo com data-ex no passado (ex: 01/07) e data de pagamento no futuro (ex: 13/08) com valor declarado por cota de R$ 1,10. Confirmar que o ativo é exibido no banner com a data de pagamento real (13/08) e o valor total em R$ derivado da quantidade correta.
- **Teste de Contagem**: Adicionar múltiplos ativos com pagamentos futuros (> 4 ativos) e confirmar que o cabeçalho exibe "4 de X Próximos Pagamentos".
