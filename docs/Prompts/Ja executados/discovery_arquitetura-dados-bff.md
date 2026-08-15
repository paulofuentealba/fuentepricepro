# Discovery Arquitetural — Normalização de Dados & Camada de Integração
## Fuente Price Pro — De "Frontend Integrador" para BFF/Domain Layer

**Papel exercido:** Principal Software Architect / Firebase & Cloud Architecture
**Skill aplicada:** `fuente-solution-architect` (fase de desenho — antecede `fuente-architecture-review`)
**Data:** 2026-08-15
**Status:** Discovery — nenhum código alterado, nenhuma decisão de execução tomada

---

## Governança de Roles (Regra 9)

| Role | Engajado? | Papel nesta análise |
|---|---|---|
| `fuente-solution-architect` | ✅ Sim | Framework de acoplamento, benchmarks, ADRs — condutor principal |
| `fuente-architecture-review` | ⚪ Não ainda | É o gate do *plano formal* que sai desta discovery — entra na próxima etapa |
| `fuente-business-architect` | ✅ Sim (parcial) | Seção 5 considera capacidade de negócio "consolidar posição" como fluxo, não só técnico |
| `fuente-advogado-lgpd-gdpr` | ✅ Sim (parcial) | Overfetching de `/assets` vs dados privados tem implicação de minimização de dado (Seção 1.4) |
| `fuente-product-manager` | ⚪ Não | Não há priorização de backlog nesta etapa — é discovery, não vira item do `BACKLOG_V2.md` ainda |
| `fuente-investidor-profissional` | ⚪ Não | Não há mudança de superfície visível ao usuário nesta discovery |
| `fuente-investidor-iniciante` | ⚪ Não | Idem |
| `fuente-ux-designer` | ⚪ Não | Zero mudança de UI proposta — é puramente camada de dados |
| `fuente-product-marketing` | ⚪ Não | Não há decisão de posicionamento envolvida |

---

## 1. Diagnóstico de Riscos e Anti-Patterns no Frontend-como-Integrador

**Acoplamento atual**: 🔴 — o frontend hoje não só *lê* dados de múltiplas fontes, ele *decide* como elas se relacionam. Isso viola o princípio "UI 100% burra" do benchmark de mercado (StatusInvest/Snowball/SSD todos isolam essa decisão no backend).

### 1.1 Acoplamento Indesejado
Hoje, hooks como `useValuedPortfolio` (e componentes que ainda não passam por ele — ver `super_prompt_code_sweep_antigravity.md`, item 3.1) precisam conhecer simultaneamente:
- O contrato de `positions`/transações do usuário (privado)
- O contrato de cotação/valuation do ativo (público, `getAssetValuation`)
- O contrato de câmbio (`exchangeRateQueryOptions`)

Isso significa que qualquer mudança de schema em **qualquer um** dos três obriga revisão no cliente. Em arquitetura de elite, o cliente não deveria saber que esses três contratos existem separadamente — ele consome um DTO já unificado.

### 1.2 Sobrecarga de Rede (Chatty I/O)
Para montar uma tela de carteira valuada hoje, o padrão é: 1 leitura de transações → derivar posições no cliente → N leituras de ativos (uma por ticker, ou batch) → 1 leitura de câmbio → merge no cliente. Em mobile (prioridade Regra 5), isso é round-trips múltiplos antes do primeiro paint útil — exatamente o padrão que TanStack Query mascara com cache mas não elimina na origem.

### 1.3 Vazamento de Regras de Negócio
`getAssetValuation` já está corretamente isolado como função pura (não é vazamento). O vazamento real está em quem **decide quando e como combinar** posição + ativo + câmbio — essa orquestração hoje vive em hooks React, ou seja, em camada de apresentação/state, não em domain layer server-side. Pelo checklist do `fuente-solution-architect` (pergunta 2 — "Camada de dados vazando para cima?"): sinal 🟡, tendendo a 🔴 dependendo do componente.

### 1.4 Segurança e Overfetching
`/assets/{ticker}` proposto como catálogo público não tem problema de LGPD (dado de mercado, não pessoal). O risco real de overfetching está do lado privado: se hoje uma tela lê o documento inteiro de posição/transação para renderizar um card simples, ela trafega mais dado pessoal do que o necessário — isso é relevante para minimização de dado (princípio LGPD) além de custo. Um DTO enxuto resolve os dois problemas com a mesma mudança.

---

## 2. Normalização Firestore — Avaliação

A proposta de separar em três coleções é **estruturalmente correta** e alinhada ao padrão de mercado (ledger imutável + snapshot agregado é o mesmo padrão usado por fintechs de posição — ex: brokers separam "order book" de "portfolio snapshot").

| Coleção | Papel | Observação arquitetural |
|---|---|---|
| `/assets/{ticker}` | Catálogo público, SSOT de mercado | Já existe conceitualmente (dados vêm de Brapi/CVM/SEC/Yahoo/Nasdaq via `src/lib/api/*.server.ts`) — a mudança real é **persistir e servir a partir de um cache Firestore centralizado**, em vez de o cliente buscar/recalcular por ativo |
| `/users/{userId}/transactions/{txId}` | Ledger privado imutável | Já é o padrão do produto (SSOT de `quantity` é derivada de histórico — nunca campo standalone, conforme já documentado). **Nenhuma mudança conceitual aqui, só confirma o desenho atual está correto.** |
| `/users/{userId}/positions/{ticker}` | Posição consolidada (read model) | **É a peça nova.** Hoje a consolidação (soma de transações → quantidade, preço médio ponderado) acontece no cliente a cada render/query. Materializar como read model é o ganho real de performance e custo. |

### Trade-offs
- **Vantagem:** leitura de carteira vira 1 leitura de `positions` (N documentos pequenos, mas 1 query) em vez de processar N transações no cliente a cada carregamento.
- **Custo:** introduz necessidade de manter `positions` sincronizado toda vez que uma transação é criada/editada/apagada — isso exige um agente de escrita confiável (Cloud Function trigger em `onWrite` de `transactions`, ou recomputação no BFF na escrita). Esse é o ponto que mais precisa de rigor de idempotência (princípio não-negociável do `fuente-solution-architect`: "Se rodar 2x, o Firestore muda?" → deve ser não).
- **Risco de divergência:** se `positions` for populado por dois caminhos (ex: client-side write E function trigger), duplica-se exatamente o antipadrão "segunda implementação da mesma pergunta de negócio" já mapeado como problema recorrente no projeto (`super_prompt_code_sweep_antigravity.md`, item 3.1). **A escrita em `positions` deve ter dono único.**

---

## 3. Avaliação das 3 Camadas de Integração

| Padrão | Adequação ao Fuente Price Pro | Veredito |
|---|---|---|
| **BFF dedicado** | Camada fina, roda em Cloud Run (já é a infra existente), consome Firestore + APIs externas, devolve DTO. Reaproveita 100% do investimento já feito em `src/lib/api/*.server.ts` — esse código já é server-side (TanStack Start SSR/server functions), então o "BFF" não é uma reescrita, é uma **extração e consolidação** do que já existe em funções de servidor espalhadas. | ✅ **Recomendado** |
| **API Gateway / Aggregator** | Faz sentido em arquitetura de microsserviços com múltiplos backends independentes. Fuente Price Pro é um monólito modular server-side (TanStack Start) — introduzir um gateway separado seria uma camada de infraestrutura nova sem múltiplos serviços reais para agregar. Overhead desproporcional ao tamanho do time (solo founder). | ❌ Não recomendado agora |
| **GraphQL / Orquestração declarativa** | Resolve overfetching de forma elegante, mas troca um problema de acoplamento por outro: exige schema GraphQL mantido, resolvers, e uma curva de aprendizado/manutenção que não se paga para um único cliente (web) com um único formato de consumo real (`ValuedPortfolioDTO`). Se o produto crescer para múltiplos clientes (app nativo, parceiros API) o cálculo muda. | ❌ Não recomendado agora — reavaliar se surgir 2º cliente de API |

**Justificativa da escolha:** o BFF é o único padrão que reaproveita a infraestrutura existente (TanStack Start já roda server functions em Cloud Run) sem adicionar uma peça de infraestrutura nova ao stack de um solo founder. Ele também é o padrão dominante nos benchmarks citados no `fuente-solution-architect` (StatusInvest, Investidor10 e concorrentes de dados densos operam sobre camada server-side própria, não GraphQL público).

---

## 4. Custos no Firestore e Estratégia de Cache

### Leitura centralizada em `/assets` vs. subcoleções de usuário
- **Hoje:** se cada usuário, ao abrir a carteira, dispara leitura de valuation por ativo, o custo de leitura escala com `usuários × ativos na carteira`, mesmo que 500 usuários tenham `PETR4` na carteira — Firestore não deduplica isso automaticamente, cada leitura de documento é cobrada.
- **Com `/assets/{ticker}` centralizado:** o BFF lê `PETR4` **uma vez** (ou a cada TTL de cache), serve N usuários a partir do mesmo dado em memória/cache do BFF. O custo de leitura no Firestore passa a escalar com `ativos distintos × frequência de atualização`, não com `usuários`. Essa é a alavanca de custo mais relevante da proposta.
- **Trade-off:** `/assets` precisa de um processo de ingestão que já existe conceitualmente (o pipeline de 8 fontes externas com taxonomia PASSED/FAILED/ERROR/INVALID/WARNING/SKIPPED) — a mudança é o **destino** dessa ingestão passar a ser Firestore persistido, não recálculo por request.

### Conciliação de cache BFF ↔ TanStack Query
Duas camadas de cache não são redundância, são complementares se os TTLs forem coerentes:
- **BFF (server-side):** cache de curto prazo (segundos a poucos minutos) para absorver picos de leitura entre requests de usuários diferentes pedindo o mesmo ativo.
- **TanStack Query (client-side):** `staleTime`/`gcTime` já configurado por query — mantém o dado "fresco o suficiente" no dispositivo do usuário, evitando round-trip ao BFF a cada navegação.
- **Regra de coerência:** o `staleTime` do cliente **nunca deve ser maior** que o TTL de cache do BFF para o mesmo dado — senão o cliente pode considerar "fresco" um dado que o BFF já invalidou, criando inconsistência silenciosa. Isso deve virar uma constante compartilhada documentada (ex: `ASSET_CACHE_TTL_SECONDS`), não dois números escolhidos independentemente em dois lugares do código — exatamente o antipadrão de "segunda implementação da mesma decisão" que já mordeu o projeto antes.

---

## 5. Recomendação Técnica e Plano de Transição

### Recomendação definitiva
Adotar **BFF leve sobre a infraestrutura server-side já existente** (TanStack Start server functions / Cloud Run), com Firestore normalizado em três coleções (`/assets`, `/users/{uid}/transactions`, `/users/{uid}/positions`), servindo um DTO único e enxuto (`ValuedPortfolioDTO`) ao cliente.

**Acoplamento resultante**: 🟢 — UI passa a ser 100% consumidora de DTO tipado; camada de domínio (`getAssetValuation`) permanece pura e testável isoladamente; camada de dados fica atrás de um contrato estável.

**ADR necessário?** Sim — esta é uma decisão 🔴→🟢 de alto impacto estrutural. Recomendo registrar como `ADR-00X` em `docs/architecture/adrs/` antes de qualquer execução, seguindo o formato do `fuente-solution-architect`.

### Contrato do DTO principal — `ValuedPortfolioDTO`

```typescript
// Contrato — não é implementação. Definição final entra no ADR.
interface ValuedPortfolioDTO {
  userId: string;
  generatedAt: string; // ISO 8601 — timestamp de quando o BFF montou este DTO
  baseCurrency: 'BRL'; // moeda de apresentação do usuário
  totalValue: MoneyDTO;
  totalInvested: MoneyDTO;
  totalYieldOnCost: number; // percentual, já calculado
  positions: ValuedPositionDTO[];
  exchangeRate: {
    pair: 'USDBRL';
    rate: number;
    asOf: string;
  };
}

interface ValuedPositionDTO {
  ticker: string;
  assetClass: 'STOCK_BR' | 'FII' | 'STOCK_US' | 'ETF';
  quantity: number;           // derivado do ledger, nunca campo bruto do Firestore
  averageCost: MoneyDTO;      // preço médio ponderado, já calculado no BFF
  currentPrice: MoneyDTO;
  marketValue: MoneyDTO;
  valuation: {
    consensus: number | null;       // Fuente Consensus já resolvido
    bazin: number | null;
    graham: number | null;          // null explícito se não aplicável (ex: FII sem EPS/BVPS)
    gordon: number | null;
  };
  isSimulationScenario: false;      // sempre false neste DTO — Regra 4: simulação nunca usa este contrato
}

interface MoneyDTO {
  amountCents: number;   // canônico em centavos — conversão só na borda de apresentação
  currency: 'BRL' | 'USD';
}
```

**Nota de aderência à Regra 4 (SSOT):** este DTO é exclusivo de tela de **estado salvo**. Telas de simulação continuam chamando `getAssetValuation` diretamente no cliente (permitido pela regra), buscando o dividendo-base pela função canônica — o BFF não participa do fluxo de simulação, evitando confundir os dois contratos.

### Plano de migração incremental (sem big-bang)

| Fase | Escopo | Critério de não-regressão |
|---|---|---|
| **0 — ADR + Discovery de dados existentes** | Registrar ADR. Mapear volume real de leituras atuais (instrumentação PostHog, já é P0 do roadmap Fase 0, reaproveitar aqui) para ter baseline de custo *antes* de migrar. | Nenhum código tocado. |
| **1 — `/assets` como cache, sem desligar caminho antigo** | Introduzir `/assets/{ticker}` alimentado pelo pipeline de ingestão já existente. BFF passa a **ler** daqui quando disponível, com fallback para o caminho atual (chamada direta às 8 fontes) se o cache estiver ausente/expirado. | `useValuedPortfolio` não muda de contrato — só a origem do dado por trás dele. Testável em paralelo (feature flag). |
| **2 — `/users/{uid}/positions` como read model derivado** | Cloud Function (`onWrite` em `transactions`) recalcula e grava a posição consolidada. **Dono único de escrita** — nenhum outro caminho escreve nesta coleção. | Rodar em paralelo ao cálculo client-side existente por um período, comparando os dois resultados (log de divergência, não troca de fonte ainda). |
| **3 — BFF monta `ValuedPortfolioDTO`** | Novo endpoint/server function que já combina `positions` + `assets` + câmbio e devolve o DTO. `useValuedPortfolio` passa a consumir este endpoint em vez de montar o merge no cliente. | Feature flag por usuário/porcentagem. Rollback = apontar o hook de volta para o caminho anterior sem deploy (flag), não revert de código. |
| **4 — Desligar caminho legado** | Remover lógica de merge client-side e leituras diretas de `transactions`/ativos individuais do cliente. | Só após Fase 3 estável em produção por período definido com Paulo (sem incidentes de divergência de valuation). |

Cada fase é independentemente reversível via feature flag (`useFeatureGate` já é a infraestrutura existente para isso) — nenhuma fase exige big-bang, e o motor atual (`useValuedPortfolio`) só muda de **origem de dado**, nunca de **contrato de saída**, até a Fase 3.

---

## Próximo Passo

Conforme o fluxo do `fuente-solution-architect`: esta discovery, se aprovada por Paulo, vira **ADR formal** em `docs/architecture/adrs/`, e só depois disso um **Plano de Implementação (Regra 8)** é gerado para a Fase 1 especificamente — respeitando o princípio de não misturar desenho com execução que já rege este projeto.
