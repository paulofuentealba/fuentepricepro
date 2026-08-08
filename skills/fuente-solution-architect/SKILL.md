---
name: fuente-solution-architect
description: Consultar sempre que Paulo propuser um padrão novo de arquitetura, uma decisão de design de solução, ou pedir para "pensar como arquiteto" no Fuente Price Pro — antes de existir um plano formal de implementação (esse é o papel do fuente-architecture-review, que é o gate de aprovação). Use este skill para decidir como desenhar algo, onde colocar uma responsabilidade nova, se reusar ou criar camada, como desacoplar módulos, e para trazer benchmarks de mercado (padrões usados por fintechs e SaaS financeiros comparáveis) antes de comprometer a decisão. Também use quando revisar um diff/plano e suspeitar de acoplamento excessivo entre camadas (UI puxando lógica de negócio, hook chamando Firestore direto, etc.).
---

# Fuente Price Pro — Arquiteto de Solução

Este skill cobre decisões de **desenho** de solução — antes do plano formal de implementação existir. É complementar ao `fuente-architecture-review` (que é o gate de aprovação do plano já escrito). Use este skill primeiro, na fase de "como vamos construir isso", e o outro depois, na fase de "isso que foi proposto está certo".

## 1. Revisão de acoplamento

Sempre que revisar um componente, hook, ou módulo novo, mapear explicitamente as dependências antes de aprovar o desenho:

**Perguntas de verificação (nesta ordem):**
1. **UI está acoplada a lógica de negócio?** Um componente React nunca deve calcular Bazin/Graham/Gordon, decidir regras fiscais, ou tomar decisão de dado — isso é papel de hook/service (reforça a Regra 4 de SSOT, mas em escopo mais amplo: qualquer lógica de negócio, não só valuation).
2. **Camada de dados está vazando para camadas superiores?** Um componente ou hook de UI não deveria conhecer o path exato do Firestore (`users/{userId}/assets`) — isso deveria estar isolado atrás de uma camada de acesso a dados (reforça o item pendente `firestorePaths.ts` centralization já registrado no backlog).
3. **Acoplamento temporal:** o módulo A precisa que o módulo B rode antes/depois numa ordem implícita e frágil? Se sim, sinalizar — isso é acoplamento escondido que quebra silenciosamente quando alguém reordena código.
4. **Acoplamento por dado compartilhado mutável:** dois módulos escrevendo/lendo o mesmo estado global sem contrato claro (ex: dois componentes lendo/escrevendo o mesmo objeto de contexto sem um dono definido)?
5. **Fan-out de mudança:** se eu alterar este módulo, quantos outros arquivos preciso tocar para não quebrar nada? Mais de 3-4 sem um padrão de interface clara é sinal de acoplamento excessivo — sinalizar como risco de arquitetura, não só como "trabalho extra".

**Classificação de saída ao revisar:**
- 🟢 **Baixo acoplamento** — módulo depende só de interfaces/contratos estáveis, não de detalhes de implementação de outro módulo
- 🟡 **Acoplamento aceitável com ressalva** — funciona, mas documentar a dependência explicitamente para não virar dívida técnica silenciosa
- 🔴 **Acoplamento a corrigir antes de aprovar** — UI conhece Firestore direto, lógica de negócio duplicada, ou dependência circular

## 2. Melhores práticas de mercado (benchmark de desenho)

Antes de aprovar um padrão de arquitetura novo, comparar contra o que fintechs/SaaS financeiros consolidados fazem — não para copiar cegamente, mas para saber se estamos reinventando algo com solução conhecida ou introduzindo risco desnecessário:

- **Camadas em apps financeiros de dados densos (StatusInvest/Investidor10-like):** tipicamente separam claramente *data fetching* (hooks de query, ex. TanStack Query) → *domain/valuation layer* (funções puras, testáveis, sem dependência de UI ou de rede) → *presentation layer* (componentes burros que só recebem props já calculadas). O `getAssetValuation`/`useValuedPortfolio` do projeto já segue esse espírito — usar isso como referência ao avaliar propostas novas.
- **Idempotência em operações financeiras:** qualquer operação que grava transação/dividendo deve ser desenhada para tolerar reexecução (retry de rede, duplo clique) sem duplicar dado. Perguntar sempre: "se essa chamada rodar duas vezes, o resultado no Firestore muda?"
- **Cache e consistência:** ao introduzir cache (React Query, memoização), verificar se a fonte de verdade (Firestore) e a camada de cache podem divergir, e como isso é invalidado. Isso é especialmente crítico dado o histórico do projeto com bugs de dado divergente entre telas.
- **Feature flags / paywall centralizado:** decisão já tomada e registrada — qualquer novo gate de feature deve passar pela config centralizada (ex. `FEATURE_GATES`), nunca condicional solta no JSX. Tratar isso como padrão de mercado consolidado (é como Stripe, LaunchDarkly, e a maioria dos SaaS fazem — flags como dado, não como código espalhado).
- **Multi-tenant/multi-moeda:** ao desenhar qualquer fluxo que toque BR e US simultaneamente (fiscal, moeda, formatação), verificar se a solução usa um único ponto de conversão/normalização, não conversões espalhadas pelo código — esse é o padrão usado por fintechs multi-região (ex: normalizar tudo para uma unidade canônica internamente, converter só na borda de apresentação).

## 3. Formato de saída

```
## Desenho de Solução — [nome da decisão/componente]

**Acoplamento**: 🟢/🟡/🔴 — [detalhe]
**Onde a lógica deveria viver**: [camada]
**Padrão de mercado equivalente**: [referência, se houver]
**Risco de dívida técnica**: [se houver, nomear]
**Recomendação**: [prosseguir / ajustar desenho antes / bloquear]
```

Depois desta etapa, se a decisão for seguir, o próximo passo é o Antigravity produzir o plano formal — que passa pelo gate do `fuente-architecture-review`.
