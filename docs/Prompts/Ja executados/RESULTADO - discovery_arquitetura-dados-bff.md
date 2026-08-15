# RESULTADO — Discovery: Arquitetura de Dados & Camada de Integração (BFF)

> **Data**: 15/08/2026  
> **Status**: Discovery Concluído — Modo Read-Only (0 arquivos de código modificados)  
> **Skill Aplicada**: `fuente-solution-architect` / `fuente-architecture-review`  
> **Conformidade**: 100% aderente a [`AGENTS.md`](file:///C:/Users/paulo/OneDrive/Fuente%20Price%20Pro/docs/AGENTS.md)

---

## 1. Síntese do Diagnóstico Técnico

- **Anti-Pattern Identificado**: O frontend atual atua como "integrador", orquestrando 7 queries simultâneas no hook `useValuedPortfolio.tsx` (leitura de itens, leitura de transações, recomputação de preço médio em memória, cotações em lote, taxas Selic/IPCA/Câmbio e chamadas de valuation).
- **Impacto de Custo & Performance**: Em dispositivos móveis, round-trips múltiplos aumentam a latência perceptível. No Firestore, leituras de ativos não-cacheados escalam por usuário em vez de escalar por ativos distintos de mercado.
- **Arquitetura Alvo Aprovada**:
  1. `/assets/{ticker}` como catálogo público e cache centralizado de mercado no Firestore.
  2. `/users/{uid}/positions/{ticker}` como Read Model consolidado com dono único de escrita (Cloud Function `onWrite` em transactions).
  3. `/users/{uid}/transactions/{txId}` como Ledger imutável privado de custódia.
  4. Server Function `fetchValuedPortfolioFn` rodando em Cloud Run (TanStack Start) servindo o DTO unificado `ValuedPortfolioDTO`.

---

## 2. Plano de Ação Sequenciado (5 Fases)

- **Fase 0 — ADR-001**: Formalização da decisão arquitetural em `docs/architecture/adrs/ADR-001-bff-e-normalizacao-firestore.md` e mapeamento do baseline de leituras.
- **Fase 1 — Cache `/assets`**: Ingestão persistida em `/assets` com fallback síncrono transparente para APIs externas.
- **Fase 2 — Read Model `/positions`**: Cloud Function com garantia estrita de idempotência para cálculo de posição consolidada.
- **Fase 3 — Server Function BFF**: Construção de `fetchValuedPortfolioFn` e chaveamento gradual via Feature Gate (`useFeatureGate`).
- **Fase 4 — Depreciação do Legado**: Desligamento do merge client-side após 100% de paridade validada em produção.
