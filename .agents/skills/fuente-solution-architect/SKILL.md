---
name: fuente-solution-architect
description: Consultar sempre que Paulo propuser um padrão novo de arquitetura, uma decisão de design de solução, ou pedir para "pensar como arquiteto" no Fuente Price Pro — antes de existir um plano formal de implementação (o fuente-architecture-review é o gate de aprovação do plano). Use para decidir como desenhar algo, onde colocar responsabilidade nova, se reusar ou criar camada, como desacoplar módulos, e trazer benchmarks de mercado (padrões usados por fintechs/SaaS financeiros de elite) antes de comprometer a decisão. Também use ao revisar diff/plano e suspeitar de acoplamento excessivo (UI puxando lógica de negócio, hook chamando Firestore direto, etc.).
---

# Fuente Price Pro — Solution Architect (World-Class)

Papel: **Desenho de solução técnica** — fase anterior ao plano formal. Complementa o `fuente-architecture-review` (gate de aprovação). Use **primeiro** ("como vamos construir"), o outro **depois** ("o proposto está certo?").

---

## 1. Análise de Acoplamento — Framework Rigoroso

Sempre que revisar componente, hook, ou módulo novo, **mapear dependências explicitamente** antes de aprovar. Classificação de saída **obrigatória**:

### Perguntas de Verificação (Ordem = Prioridade)

| # | Pergunta | Sinal Vermelho (����) | Sinal Amarelo (����) | Sinal Verde (����) |
|---|----------|---------------------|---------------------|------------------|
| 1 | **UI acoplada a lógica de negócio?** | Componente React calcula Bazin/Graham/Gordon, decide regra fiscal, ou toma decisão de dado | Hook expõe lógica mas componente ainda decide *como* exibir/transformar | Componente 100% burro — recebe props já calculadas, tipadas, prontas para render |
| 2 | **Camada de dados vazando para cima?** | Componente/hook UI conhece path Firestore (`users/{uid}/assets`), `collection()`, `doc()` | Hook usa service mas expõe tipos do Firestore (`DocumentSnapshot`, `QueryConstraint`) | Camada de dados isolada atrás de interface estável (`IAssetRepository`, `IPortfolioService`) — UI só conhece DTOs |
| 3 | **Acoplamento temporal implícito?** | Módulo A precisa que B rode antes/depois sem contrato (ex: `useEffect` dependendo de ordem de mount) | Ordem documentada mas frágil (comentário "precisa rodar depois de X") | Dependências declaradas via tipos/contratos — ordem irrelevante |
| 4 | **Estado mutável compartilhado sem dono?** | 2+ módulos lendo/escrevendo mesmo contexto/objeto global sem `owner` claro | Contexto tem `owner` mas mutação espalhada (setters em múltiplos lugares) | Single source of truth + mutação centralizada (reducer, store, ou hook dono) |
| 5 | **Fan-out de mudança > 3-4 arquivos?** | Alterar módulo toca 5+ arquivos sem interface clara | 3-4 arquivos, interface existe mas vazada | Alteração contida no módulo + testes; interfaces blindam consumidores |

### Classificação de Saída (Obrigatória no Output)
```
**Acoplamento**: ���/����/���� — [justificativa técnica específica]
**Onde a lógica DEVE viver**: [Data Layer / Domain Layer / Presentation Layer / Infrastructure]
**Interface/Contrato proposto**: [TypeScript interface ou spec se ���/����]
**Risco de dívida técnica**: [nomear explicitamente se ���/����]
**Recomendação**: Prosseguir / Ajustar desenho antes / Bloquear
```

---

## 2. Benchmarks de Mercado — Padrões de Elite (Fintech/SaaS Financeiro)

Não copiar cegamente — usar para **calibrar risco**. Se reinventamos, saber por quê.

### Camadas em Apps Financeiros de Dados Densos (StatusInvest, Investidor10, Simply Safe Dividends, Snowball, Yahoo Finance)
```
��─────────────────────────────────────────────────────────────��
│  PRESENTATION LAYER                                         │
│  • Componentes "burros" (dumb) — só props tipadas           │
│  • Zero lógica de negócio, zero fetch, zero mutation        │
│  • Acessibilidade, i18n, responsive, microinterações        │
��─────────────────────��───────────────────────────────────────��
                      ��
��─────────────────────────────────────────────────────────────��
│  DOMAIN / VALUATION LAYER (SSOT)                            │
│  • Funções PURAS: getAssetValuation, calculateIRR, etc.     │
│  • Zero dependência: React, Firebase, rede, tempo real      │
│  • Testáveis unitariamente com 100% coverage                │
│  • Single source of truth — Regra 4 do AGENTS.md            │
��─────────────────────��───────────────────────────────────────��
                      ��
��─────────────────────────────────────────────────────────────��
│  DATA FETCHING / STATE LAYER                                │
│  • TanStack Query (server state) + Zustand/Context (client) │
│  • Hooks: useValuedPortfolio, useAssets, useWatchlist       │
│  • Cache, invalidation, optimistic updates centralizados    │
��─────────────────────��───────────────────────────────────────��
                      ��
��─────────────────────────────────────────────────────────────��
│  INFRASTRUCTURE LAYER                                       │
│  • Firebase (Auth, Firestore, Functions)                    │
│  • APIs externas (CVM, SEC EDGAR, Yahoo, Nasdaq)            │
│  • Adapters/Repositories isolando detalhes de implementação │
��─────────────────────────────────────────────────────────────��
```

**O projeto JÁ segue isso** (`getAssetValuation` + `useValuedPortfolio` + hooks de query). **Qualquer proposta nova deve reforçar, nunca violar, esta separação.**

### Princípios Não-Negociáveis de Mercado

| Princípio | Aplicação no Fuente Price Pro | Verificação |
|-----------|-------------------------------|-------------|
| **Idempotência em operações financeiras** | Toda gravação (transação, dividendo, evento corporativo) tolera reexecução sem duplicar | "Se rodar 2x, o Firestore muda?" → Deve ser **não** |
| **Cache & Consistência** | React Query `staleTime`, `gcTime`, invalidação por `queryKey` padronizado | Fonte de verdade (Firestore) vs cache — divergência = bug conhecido histórico |
| **Feature Flags Centralizadas** | `FEATURE_GATES` config único — **zero** condicionais soltos no JSX | Stripe/LaunchDarkly pattern: flags = dado, não código espalhado |
| **Multi-moeda / Multi-jurisdição** | Normalização canônica interna (BRL centavos, USD centavos) — conversão **só na borda** (apresentação) | Fintechs multi-região: 1 ponto de conversão, não espalhado |
| **Observabilidade por design** | Logs estruturados, erros com contexto, métricas de negócio (não só técnicas) | "Como sei se valuation falhou para 1% dos usuários?" |
| **Security by default** | Regras Firestore = contrato; validação server-side em Functions; zero segredo no client | `firestore.rules` testadas unitariamente (`npm run test:rules`) |

---

## 3. Decision Records — ADR Leve (Obrigatório para Decisões ���/����)

Toda decisão arquitetural com risco ���/���� gera **ADR (Architecture Decision Record)** leve:

```markdown
## ADR-XXX: [Título da Decisão]

**Contexto**: [O que motivou, qual problema]
**Decisão**: [O que foi decidido — uma frase]
**Alternativas Consideradas**: [Pelo menos 2, com prós/contras]
**Consequências**: [Técnicas, de manutenção, de performance, de risco]
**Status**: Proposta / Aceita / Rejeitada / Substituída por ADR-YYY
**Data**: YYYY-MM-DD
**Autor**: [quem propôs]
```

Arquivar em `docs/architecture/adrs/` (criar se não existe). **Não aprovar decisão ���/���� sem ADR.**

---

## 4. Formato de Saída Completo (Obrigatório)

```markdown
## Desenho de Solução — [nome da decisão/componente]

**Acoplamento**: ���/����/���� — [detalhe técnico específico, não genérico]
**Camada Onde Lógica Deve Viver**: [Data / Domain / Presentation / Infrastructure]
**Interface/Contrato Proposto**: [TypeScript interface se aplicável]
**Padrão de Mercado Equivalente**: [Referência concreta: ex: "TanStack Query v5 pattern como Stripe Dashboard", "Repository pattern como Plaid Link"]
**Risco de Dívida Técnica**: [Nomear explicitamente: ex: "UI conhece Firestore path → quebra se schema muda", "Valuation duplicado → divergência silenciosa entre telas"]
**ADR Necessário?**: Sim/Não [se ���/����, ADR obrigatório]
**Recomendação**: Prosseguir / Ajustar desenho antes / Bloquear

---
**Próximo Passo**: Se "Prosseguir" → Antigravity produz Plano Formal → `fuente-architecture-review` gate.
```

---

## 5. Anti-Padrões Comuns no Projeto (Para Detectar Rápido)

| Anti-Padrão | Sintoma | Correção Canônica |
|-------------|---------|-------------------|
| **Smart Component** | Componente faz `useQuery` + calcula + renderiza | Separar: `useAssetData` (hook) → `AssetCard` (dumb) |
| **Firestore na UI** | `import { doc, getDoc } from 'firebase/firestore'` em componente | Repository/Service isolado + hook tipado |
| **Valuation Inline** | `const bazin = (dy * 100) / 16` no componente | `getAssetValuation(asset, 'bazin')` |
| **Feature Flag Espalhada** | `{isPro && <ProFeature />}` em 10 lugares | `<FeatureGate feature="pro">` centralizado |
| **Moeda Hardcoded** | `value * 5.2` ou `toLocaleString('pt-BR')` espalhado | `formatCurrency(value, currency)` centralizado |
| **Mutation Sem Idempotência** | `addDoc(collection, data)` sem check de duplicata | `runTransaction` + check existe / upsert |

---

## 6. Checklist Rápido para Revisão de Diff/Plano

- [ ] Nenhum `import firebase/firestore` fora de `src/lib/api/` ou `src/lib/dataIngestion/`
- [ ] Nenhum cálculo Bazin/Graham/Gordon fora de `src/lib/calculations.ts`
- [ ] Hooks novos tipados com `interface` exportada (contrato)
- [ ] Feature gates via `useFeatureGate` / `<FeatureGate>`, não `if (isPro)`
- [ ] Moeda/formatação via `src/lib/formatters.ts`
- [ ] ADR criado se decisão ���/����
- [ ] Plano formal (Regra 8) virá depois com (a)(b)(c)

---

> **Mentalidade:** "Desenhar para mudar, não para durar." O melhor desenho é aquele que permite **mudar a camada de dados, o provedor de valuation, ou a UI** sem reescrever as outras. Cada acoplamento que você aceita hoje é um imposto que o projeto pagará amanhã.