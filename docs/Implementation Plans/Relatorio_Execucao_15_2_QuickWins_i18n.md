# Relatório de Execução — Task 15.2: Quick Wins i18n + Código Morto (Risco Baixo)

**Data:** 10 de Agosto de 2026  
**Atividade:** Task 15.2 — Quick Wins i18n + Código Morto (Tabela 1)  
**Branch:** `dev`  
**Status:** Concluído com sucesso (11/11 itens marcados e 3/3 gates de verificação aprovados)

---

## 1. Contexto & Regras de Ouro

Esta atividade focou na eliminação de strings hardcoded em UI (Regra 2), na eliminação de código morto (Regra 1) e na consolidação de opções de cache no TanStack Query (Regra 1), observando rigorosamente as **9 Regras de Ouro** do `AGENTS.md`:

1. **Reusabilidade Primeiro (Arquitetura)**
2. **Global i18n Enforcement (Sem Hardcode)** — *Foco principal desta task*
3. **Isolamento e Segurança de Dados (Database & Mocks)**
4. **Single Source of Truth (SSOT — Dados Financeiros)**
5. **Abordagem "Mobile-First" Sustentável**
6. **Qualidade Visual Premium (Aesthetics)**
7. **AGENTS.md Tem Precedência (Governança)**
8. **Plano de Implementação Obrigatório Antes de Executar**
9. **Governança de Roles (Skills)**

---

## 2. Checklist dos 11 Itens Executados

- [x] **Item 1: `src/lib/emailService.ts`** — Verificado 0 imports ativos no repositório inteiro e removido o arquivo de código morto.
- [x] **Item 2: `src/components/ceiling/Header.tsx:184,263,279`** — Substituídas as strings hardcoded "Sign In" e "Language" pelas chaves `t.header.signIn` e `t.header.language` (adicionadas aos dicionários `dict.ptBR.ts`, `dict.en.ts` e `dict.es.ts`).
- [x] **Item 3: `src/components/ceiling/SmartAllocation.tsx:255,257`** — Substituídos os textos "Calculando..." e "Recalculate / Reset" pelas chaves `t.smartAllocation.calculating` e `t.smartAllocation.recalculate`.
- [x] **Item 4: `src/components/ceiling/AssetComparator.tsx:279`** — Substituídos os textos "ativo comparado" / "ativos comparados" por `t.comparator.assetCompared` e `t.comparator.assetsCompared` com suporte singular/plural.
- [x] **Item 5: `src/components/ceiling/GoalPlanner.tsx:106`** — Substituída a string fallback "Shares" pela chave `t.common.shares` (adicionada aos dicionários).
- [x] **Item 6: `src/components/ceiling/FeedbackWidget.tsx:24-37`** — Movido o objeto de tradução condicional inline para o objeto `feedback` nos dicionários centrais de tradução.
- [x] **Item 7: `src/routes/settings.tsx:142`** — Substituída a string hardcoded "Fuente Price Pro" no cabeçalho pela chave i18n canônica `{t.appTitle}`.
- [x] **Item 8: `src/components/ceiling/ComparatorPerformanceChart.tsx:52`** — Substituída a condicional de locale hardcoded em `toLocaleString` pela função utilitária `toIntlLocale(locale)`.
- [x] **Item 9: `src/components/ceiling/watchlist/BrokerNoteUploader.tsx:408,433`** — Substituído `toLocaleString("pt-BR", ...)` por `formatCurrency(val, currency, locale)` do módulo de formatação.
- [x] **Item 10: `src/components/ceiling/DividendRadar.tsx:59`** — Extraída a configuração de query inline para a função helper `dividendRadarQueryOptions()` em `src/lib/queryOptions.ts`.
- [x] **Item 11: `src/lib/corporateEvents.ts:113`** — Extraída a configuração de query inline para `corporateEventsQueryOptions()` em `src/lib/queryOptions.ts`.

---

## 3. Gates de Verificação

1. `npx tsc --noEmit` — **Aprovado (0 erros após CADA item)**
2. `npx vitest run` — **Aprovado (30 suítes passadas, 184 testes passados)**
3. `npm run build` — **Aprovado (Build limpo)**

---

## 4. Confirmação do Commit

O commit desta atividade foi realizado na branch `dev` com a mensagem de commit: `15.2 — Quick Wins i18n + Código Morto (risco Baixo)`.
