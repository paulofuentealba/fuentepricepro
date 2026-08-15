# Plano de Implementação — Prompts 110, 111 e 112

## 1. Contexto e Objetivos

Este lote aborda as melhorias de qualidade, performance e type safety identificadas no Sweep Arquitetural v2, além de alinhar o relatório documental de auditoria:

1. **PROMPT 110 (P1 — Quick Wins do Sweep v2)**:
   - **Item 1**: Unificar o tipo `Locale` em `formatters.ts` (`"pt-BR" | "en-US" | "es-ES" | "ptBR" | "en" | "es"`) e remover os 6 casts `as any` em componentes de UI.
   - **Item 2**: Localizar via i18n os 7 status de showcase em `cards.ts` (`statusKey: "undervalued" | "fairlyPriced"` e `{t.showcase.status[card.statusKey]}`).
   - **Item 3**: Lazy loading de `DynamicImportModal` em `WatchlistDialogs.tsx` via `React.lazy` e `<Suspense>`.
2. **PROMPT 111 (P2/P3 — Backlog do Sweep v2)**:
   - **Item 1 (P2)**: Warning estruturado com `console.warn` em `yahoo.server.ts:183` quando a API omitir `currency`.
   - **Item 2 (P2)**: Code-splitting com `React.lazy` e `<Suspense>` nas 4 abas do painel `/admin` (`FeatureGatesTab`, `IngestionLogTab`, `UsersTab`, `CloudCostsCard`).
   - **Item 3 (P3)**: Interface tipada `SecEdgarFactsResponse` em `secEdgar.server.ts:106`, eliminando `as any`.
   - **Item 4 (P3)**: Type guard `isPendingCorporateEvent` em `corporateEvents.ts:104`, eliminando o duplo cast.
3. **PROMPT 112 (Documentação — Correção no Relatório do Sweep v2)**:
   - Remover o falso positivo de `ComparatorPerformanceChart` das Tabelas 3 e 4.
   - Corrigir a listagem de campos de `listUsersFn` na Tabela 5 (`displayName`, `email`, `subscriptionStatus`, `createdAt`, `lastLoginAt`, `providerId`, omitindo `uid` por design).
   - Adicionar nota de rastreabilidade pós-publicação.

---

## 2. Governança de Roles (Regra 9 de `AGENTS.md`)

- **fuente-architecture-review**: Garante conformidade com as 9 regras e validação limpa de todos os 3 gates de qualidade (`tsc`, `test`, `build`).
- **fuente-solution-architect**: Implementa code-splitting seguro para `DynamicImportModal` e as abas do admin, mantendo isolamento de escopo.
- **fuente-business-architect**: Garante que o status dos ativos no showcase reflita com precisão a precificação da metodologia Fuente.
- **fuente-product-manager**: Aplica os itens P1/P2/P3 priorizados sob a matriz RICE.
- **fuente-ux-designer**: Garante feedback visual gracioso com fallback durante o carregamento de abas lazy e modais.
- **fuente-investidor-profissional**: Assegura precisão na formatação de moedas e percentuais com tipagem estrita de `Locale`.
- **fuente-investidor-iniciante**: Garante tradução 100% amigável de todos os termos em pt-BR, en e es.
- **fuente-advogado-lgpd-gdpr**: Mantém conformidade de documentação no relatório de minimização de dados do painel admin.
- **fuente-product-marketing**: Garante visual polido e textos sem inconsistências na Landing Page.

---

## 3. Pontos de Atenção & Decisões de Arquitetura (Regra 8 de `AGENTS.md`)

| Risco Identificado | Decisão Tomada |
| :--- | :--- |
| **Risco 1: Quebra de compatibilidade em `Locale`** (`formatters.ts` vs `i18n-provider.tsx`) | **Decisão 1**: Ampliar o union type de `Locale` para aceitar tanto os códigos canônicos BCP-47 (`"pt-BR" \| "en-US" \| "es-ES"`) quanto os identificadores curtos legados (`"ptBR" \| "en" \| "es"`), garantindo interoperabilidade com `toIntlLocale` sem quebras. |
| **Risco 2: Flicker visual ao carregar modais ou abas lazy** | **Decisão 2**: Usar fallback leve (spinner/skeleton sutil) que preserve as dimensões do container, prevenindo layout shift. |
| **Risco 3: Falso positivo no type guard `isPendingCorporateEvent`** | **Decisão 3**: Validar os tipos primitivos de `eventId`, `date`, `type` (`"split" \| "grouping"`) e `ratio` (`number > 0`), acompanhado de teste unitário dedicado. |

---

## 4. Arquivos a Criar / Modificar

### Prompt 110 (Quick Wins P1)
- [MODIFY] [`src/lib/formatters.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/formatters.ts): Atualizar `Locale` e remover casts em callers (`AssetCardTags.tsx`, `AssetMonthlyDividendChart.tsx`, `DividendsHistoryPanel.tsx`, `ComparatorPerformanceChart.tsx`, `AssetCard.tsx`).
- [MODIFY] [`src/components/landing/showcase/cards.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/landing/showcase/cards.ts): Substituir `status: string` por `statusKey: "undervalued" | "fairlyPriced"`.
- [MODIFY] [`src/components/landing/showcase/ShowcaseCard.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/landing/showcase/ShowcaseCard.tsx): Renderizar `{t.showcase.status[card.statusKey]}`.
- [MODIFY] [`src/lib/i18n/dict.ptBR.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.ptBR.ts), [`dict.en.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.en.ts), [`dict.es.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/i18n/dict.es.ts): Adicionar chaves de status no `t.showcase`.
- [MODIFY] [`src/components/ceiling/watchlist/WatchlistDialogs.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/components/ceiling/watchlist/WatchlistDialogs.tsx): Lazy load do `DynamicImportModal`.

### Prompt 111 (Backlog P2/P3)
- [MODIFY] [`src/lib/api/yahoo.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/yahoo.server.ts): Warning estruturado quando `currency` estiver ausente.
- [MODIFY] [`src/routes/admin.tsx`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/routes/admin.tsx): Code-splitting via `React.lazy` para as abas do admin.
- [MODIFY] [`src/lib/api/secEdgar.server.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/api/secEdgar.server.ts): Adicionar interface `SecEdgarFactsResponse` e tipar `factsData`.
- [MODIFY] [`src/lib/corporateEvents.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/corporateEvents.ts): Adicionar type guard `isPendingCorporateEvent`.
- [NEW] [`src/lib/__tests__/corporateEventsTypeGuard.test.ts`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/src/lib/__tests__/corporateEventsTypeGuard.test.ts): Testes unitários para o type guard de eventos corporativos.

### Prompt 112 (Correção Documentação Sweep v2)
- [MODIFY] [`docs/Prompts/RESULTADO - SUPER_PROMPT_v2_Code_Sweep_Arquitetural_Definitivo.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/Prompts/RESULTADO%20-%20SUPER_PROMPT_v2_Code_Sweep_Arquitetural_Definitivo.md): Ajustar Tabelas 3, 4 e 5 e incluir nota de rastreabilidade.

---

## 5. Plano de Verificação

### 5.1 Testes Automatizados
- `node scripts/check-ssot-leaks.js` (0 erros).
- `node scripts/forbid-legacy-tagline.js` (0 erros).
- `npx vitest run src/lib/__tests__/corporateEventsTypeGuard.test.ts`.
- `npm test` (suite completa com 60+ arquivos passando).

### 5.2 Gates de Qualidade
- `npx tsc --noEmit` limpo (0 erros).
- `npm run build` limpo.
- `git commit` e `git push origin dev`.
