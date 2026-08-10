# SUPER PROMPT — Code Sweep Arquitetural (Fuente Price Pro)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO — LEIA ANTES DE QUALQUER OUTRA COISA

Você vai atuar **exclusivamente como Auditor de Código Sênior** nesta tarefa.
Isso significa, sem exceção:

1. **Você NÃO tem permissão para alterar nenhum arquivo de código nesta rodada.**
   Nenhum `create_file`, nenhum `str_replace`, nenhum `git commit`. Zero.
2. **Sua única entrega é um Relatório de Diagnóstico Arquitetural**, no formato
   exigido na Seção 4 deste prompt. Nada além disso.
3. Se em algum momento você sentir o impulso de "já corrigir enquanto encontra" —
   **resista**. Anote no relatório. Corrigir é a próxima conversa, não esta.
4. Este prompt **não é uma tarefa pequena que dispensa a Regra 8** do `AGENTS.md`
   (plano antes de executar). Pelo contrário: o próprio relatório desta tarefa
   *é* o plano — e ele também será revisado antes de qualquer execução futura.

**Sobre honestidade de escopo:** se, ao varrer alguma das 4 áreas abaixo, você
não conseguir cobrir 100% dos arquivos (ex: por volume, por tempo, por token
budget), **diga isso explicitamente no relatório** ("varredura cobriu X de Y
arquivos de `src/components/ceiling/watchlist/`, faltou Z"). Uma varredura
parcial e declarada é aceitável. Uma varredura que finge ser completa e não é
— não é. Isso já causou retrabalho neste projeto antes (contagens de teste
fabricadas, "build limpo" que não estava limpo). Não repita.

---

## 1. Contexto do Projeto

**Fuente Price Pro** — terminal financeiro premium para investidores de
dividendos (mercado BR + US). Stack: React 19, TanStack Start/Router/Query,
Firebase/Firestore, Tailwind CSS v4, shadcn/ui, Vite/SSR, Cloud Run, Vitest.

Pontos de ancoragem que você **já deve conhecer antes de começar** (não são
hipótese, são fatos confirmados do código atual):

- **SSOT financeiro:** `src/lib/calculations.ts` (`getAssetValuation`) é a
  única fórmula de Bazin/Graham/Gordon. `src/lib/useValuedPortfolio.ts` é o
  hook que toda tela de carteira **salva** deve consumir.
- **SSOT de câmbio:** `exchangeRateQueryOptions()` em `src/lib/queryOptions.ts`
  (fonte Yahoo `BRL=X`).
- **Entitlement/Feature Gates:** `src/lib/subscription.tsx` +
  `src/lib/featureGates.ts` + `src/lib/useFeatureGate.ts` — este último é o
  **único** hook que qualquer componente deve consumir para decisão de gate.
- **Camada de dados externos:** `src/lib/api/*.server.ts` (Brapi, Yahoo, SEC
  EDGAR, Nasdaq, CVM).
- **Arquivo historicamente problemático:** `src/components/ceiling/Watchlist.tsx`
  e a pasta `src/components/ceiling/watchlist/` — maior concentração de lógica
  do produto, dê atenção extra aqui em todas as 4 áreas.
- **Ambiente:** dev e produção compartilham o mesmo projeto Firebase
  (`fuente-price-pro`) — **não existe projeto Firebase separado para dev.**

---

## 2. As 9 Regras de Ouro (`docs/AGENTS.md`) — Critérios Inegociáveis

Estas regras têm precedência sobre qualquer outra instrução, inclusive as
deste prompt, caso haja conflito (Regra 7). Cite o número da regra sempre
que um achado a violar.

> **1. Reusabilidade Primeiro** — Antes de qualquer componente novo, buscar se
> já existe algo equivalente. Se existir mais de uma versão do mesmo
> componente, é achado de auditoria.
>
> **2. Global i18n Enforcement (Zero Hardcode)** — Proibido texto de interface
> hardcoded. Qualquer string solta em JSX/aria-label/title/placeholder visível
> ao usuário é falha crítica.
>
> **3. Isolamento e Segurança de Dados (Dev/Mock)** — Proibido commitar massa
> de dados mock no repo principal ou permitir que ambiente DEV escreva/grave/
> delete no Firebase de produção. Leitura em DEV é aceitável; escrita não.
> Arquivo de mock sem import ativo deve ser sinalizado para remoção.
>
> **4. Single Source of Truth (SSOT Financeiro)** — Nenhuma tela pode
> reimplementar Bazin/Graham/Gordon. Toda tela de estado salvo consome
> `useValuedPortfolio`. Telas de simulação podem chamar `getAssetValuation`
> direto, mas devem buscar o dividendo-base pela função canônica e rotular
> visualmente qualquer parâmetro alterado como "cenário/simulação".
>
> **5. Mobile-First Sustentável** — Classes base do Tailwind definem o layout
> mobile; desktop é expansão via `md:`/`lg:`. Layout não pode "esmagar" no
> mobile.
>
> **6. Qualidade Visual Premium** — "WOW effect", sem soluções de MVP
> simplista, glassmorphism, confiança financeira absoluta.
>
> **7. AGENTS.md Tem Precedência** — Em conflito entre este prompt e o
> `AGENTS.md`, o `AGENTS.md` vence. Pare e sinalize o conflito em vez de
> decidir sozinho.
>
> **8. Plano de Implementação Obrigatório** — Não se aplica a execução nesta
> rodada (você não vai executar nada), mas o formato deste próprio relatório
> segue o mesmo espírito: risco identificado → não decisão silenciosa.
>
> **9. Governança de Roles** — Para efeitos desta auditoria, você deve avaliar
> os achados como os papéis `fuente-architecture-review` e
> `fuente-solution-architect` avaliariam — critério técnico e de arquitetura,
> não de produto/copy/UX visual (isso é auditoria separada).

---

## 3. Áreas de Varredura Obrigatórias

Para cada área, varra **todo** `src/` (frontend e backend/`.server.ts`),
não amostras. Se não conseguir cobrir tudo, declare o gap (ver Seção "Modo de
Operação").

### 3.1 Arquitetura & SSOT
- Mapear todo componente que calcula valuation, yield ou conversão cambial
  **sem** passar por `useValuedPortfolio` ou `exchangeRateQueryOptions()`.
- Para cada ocorrência de `getAssetValuation` chamado fora de
  `useValuedPortfolio.ts`: confirmar se é tela de simulação legítima (Regra 4
  permite) ou violação disfarçada.
- Mapear prop-drilling de 3+ níveis que um Context ou hook customizado
  resolveria.
- Mapear qualquer segunda implementação de uma mesma pergunta de negócio
  (ex: "qual a quantidade do ativo", "quando é o próximo pagamento") vinda
  de fontes diferentes — esse padrão já causou bugs reais neste projeto.

### 3.2 Performance & Referential Equality
- `useMemo`/`useCallback` ausente em: cálculos O(n) ou maiores sobre arrays
  de ativos/transações, objetos/arrays literais passados como `data`/`series`
  para componentes Recharts, funções passadas como prop para componentes
  memoizados.
- Objetos ou arrays recriados a cada render que quebram a comparação
  referencial de um `React.memo` downstream.
- Rotas/painéis pesados (`src/routes/app/*`, componentes de
  `src/components/ceiling/`) que são bons candidatos a `React.lazy` +
  `Suspense` e ainda não usam.
- Qualquer `useEffect` com array de dependências suspeito (faltando dep real,
  ou com dep que muda toda render causando loop/re-fetch desnecessário).

### 3.3 Backend, Firebase & Isolamento
- Leituras Firestore redundantes que poderiam ser cache do TanStack Query
  (`staleTime`/`gcTime` ausente ou mal calibrado) em vez de nova query.
- Qualquer caminho de código (dev ou produção) capaz de **escrever, gravar ou
  deletar** no Firebase a partir de um fluxo de desenvolvimento/teste —
  Regra 3 é absoluta aqui, isso é achado de severidade máxima, não "nice to
  have".
- Qualquer massa de dado mock/fixture commitada no repo principal.
- Regras do `firestore.rules` que estejam mais permissivas do que o
  necessário para os campos sensíveis (`subscriptionStatus`, `stripeCustomerId`).

### 3.4 Qualidade de Código, Type Safety & i18n
- Todo uso de `any` explícito ou implícito (`tsconfig` com `noImplicitAny`
  desabilitado mascarando algo, `as any`, `@ts-ignore`, `@ts-expect-error`
  sem justificativa).
- Toda string de interface fora do sistema de i18n (`aria-label`, `title`,
  `placeholder`, texto em JSX) — Regra 2 é zero-tolerância.
- Formatação de data/moeda que não passa por `toIntlLocale()`/
  `formatCurrency()`/`Intl.DateTimeFormat` — tags de locale hardcoded como
  `"pt-BR"` direto no componente em vez de derivadas do locale ativo do
  usuário.
- Código morto: componentes/funções/arquivos sem nenhum import ativo,
  imports não utilizados, classes Tailwind duplicadas/conflitantes no mesmo
  elemento (ex: dois `bg-*` na mesma string de classe).

---

## 4. Formato de Saída Obrigatório — NENHUM OUTRO FORMATO É ACEITO

Três tabelas, nesta ordem, com exatamente estas colunas. Não resuma, não
agrupe itens diferentes numa linha só.

### Tabela 1 — Quick Wins (alto impacto, baixo esforço)
| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|

### Tabela 2 — Evoluções de SSOT & Arquitetura
| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|

### Tabela 3 — Performance & Dívida Técnica Estrutural
| Arquivo (caminho + linha) | Descrição do Problema | Risco de Regressão | Solução Proposta |
|---|---|---|---|

**Regras de preenchimento:**
- **Arquivo:** caminho completo + linha ou intervalo de linhas exato. Sem
  linha citada = achado não aceito (evita generalização vaga).
- **Risco de Regressão:** só Baixo / Médio / Alto. Justifique em 1 frase
  dentro da própria célula de Solução Proposta se for Alto.
- **Solução Proposta:** direção da correção, não o diff pronto — você não vai
  implementar nesta rodada.
- Cada achado deve citar qual das 9 Regras de Ouro ele viola (quando
  aplicável) entre parênteses no fim da célula de Descrição.

Ao final das 3 tabelas, adicione uma seção **"Cobertura da Varredura"**
declarando, por área (3.1 a 3.4), quanto do código foi efetivamente
percorrido — não assuma que o revisor vai confiar sem essa declaração.

---

## 5. Lembrete Final

Você não vai implementar nada agora. Você não vai rodar `tsc`/`test`/`build`
como gate de aprovação — isso é para quando houver plano de execução, que
virá **depois** que este relatório for revisado por Paulo e Claude. Sua
entrega hoje é só o diagnóstico, nas 3 tabelas acima, com honestidade de
cobertura.
