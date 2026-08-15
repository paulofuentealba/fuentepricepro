# SUPER PROMPT v2 — Code Sweep Arquitetural Definitivo (Fuente Price Pro)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Este prompt substitui e amplia o Code Sweep original (10/08/2026).
> Construído sobre os 4 skills mestres do projeto:
> `fuente-architecture-review` (as 9 regras, formato de checklist),
> `fuente-product-manager` (classificação + RICE), `fuente-advogado-lgpd-gdpr`
> (checklist de direito do titular), `fuente-ux-designer`/`fuente-solution-architect`
> (padrões de qualidade visual e arquitetura). Nenhum critério novo foi
> inventado — este prompt só orquestra os 4 na mesma varredura.

---

## 🛑 MODO DE OPERAÇÃO — LEIA ANTES DE QUALQUER OUTRA COISA

Você vai atuar **exclusivamente como Auditor de Código Sênior** nesta
tarefa, com autoridade equivalente a `fuente-architecture-review`
rodando o gate mestre do projeto.

1. **Você NÃO tem permissão para alterar nenhum arquivo de código
   nesta rodada.** Nenhum `create_file`, nenhum `str_replace`, nenhum
   `git commit`. Zero. Exceção única: você **pode e deve executar**
   comandos read-only de verificação (`npx tsc --noEmit`,
   `npm run test`, `node scripts/check-ssot-leaks.js`,
   `node scripts/check-tagline.js`, `grep`/busca) — rodar essas
   ferramentas não é "alterar código", é parte da auditoria.
2. **Sua única entrega é o Relatório de Diagnóstico Arquitetural v2**,
   no formato exigido na Seção 6. Nada além disso.
3. Se sentir o impulso de "já corrigir enquanto encontra" — **resista**.
   Anote no relatório. Corrigir é a próxima conversa.
4. **Regra 8 se aplica ao próprio relatório**: o documento final *é* o
   plano — será revisado por Claude e Paulo antes de qualquer execução
   futura derivada dele.
5. **Declaração de Roles (Regra 9) é obrigatória no topo do relatório**,
   antes de qualquer achado — formato exato da Seção 6.1.

**Sobre honestidade de escopo:** se não conseguir cobrir 100% de uma
área, **diga isso explicitamente**. Varredura parcial declarada é
aceitável. Varredura que finge ser completa e não é, não é — isso já
causou retrabalho real neste projeto (contagens de teste fabricadas,
"build limpo" que não estava limpo, correções de leitura que não
resolveram a causa raiz na origem do dado — ver Prompt 106 vs 107).

---

## 1. Contexto do Projeto (atualizado)

**Fuente Price Pro** — terminal financeiro premium para investidores
de dividendos (BR + US). Stack: React 19, TanStack Start/Router/Query,
Firebase/Firestore, Tailwind CSS v4, shadcn/ui, Vite/SSR, Cloud Run,
Vitest.

### 1.1 SSOTs confirmadas (não é hipótese — são fatos do código atual)
- **Financeiro**: `src/lib/calculations.ts` (`getAssetValuation`) —
  única fórmula de Bazin/Graham/Gordon/Consenso (mediana verdadeira,
  não média — ver `consensusPrice`). `src/lib/useValuedPortfolio.ts` é
  o hook que toda tela de carteira **salva** deve consumir.
- **Alocação sugerida**: `src/lib/suggestedAllocation.ts`
  (`computeSuggestedAllocation`) — única fonte de "estratégia → pesos
  por classe de ativo", com composição multiplicativa quando 2
  estratégias são combinadas.
- **Câmbio**: `exchangeRateQueryOptions()` em `src/lib/queryOptions.ts`
  (fonte Yahoo `BRL=X`).
- **Moeda por ativo**: campo `currency: Currency` em `WatchlistItem` —
  **nunca inferir moeda a partir de `type`** (bug real corrigido nos
  Prompts 106/107; a inferência correta, quando necessária na origem
  do dado, só é legítima em exatamente 3 arquivos:
  `src/lib/watchlist.ts` (`rowToItem`/`readLocal`),
  `src/lib/api/brapi.server.ts`, `src/lib/api/yahoo.server.ts`).
- **Tradução de tipo de ativo**: `t.types[item.type]` — nunca
  renderizar `item.type`/`asset.type` cru em JSX (bug real corrigido
  2× — Prompts 86 e 107 — em componentes diferentes).
- **Entitlement/Feature Gates**: `src/lib/subscription.tsx` +
  `src/lib/featureGates.ts` + `src/lib/useFeatureGate.ts` — único hook
  de decisão de gate. Firestore Rules: leitura de `config/featureGates`
  é **pública por design** (é config de produto, não dado sensível —
  ver Prompt 92); `ingestionLog/*` é **admin-only** (dado operacional).
- **Auth Admin**: `src/lib/api/requireAdmin.server.ts` (Custom Claims
  `isAdmin`) — único ponto de validação de admin, camadas
  independentes: guard de rota (UX) + `requireAdmin()` no server
  (segurança real) + Firestore Rules (defesa em profundidade).
- **Persistência de transação/posição**: qualquer fluxo que crie ou
  edite uma posição deve calcular via
  `recalculateHoldingFromTransactions` — nunca mutação manual direta
  de `quantity`/`averagePrice`. **Nunca gravar no Firestore antes de
  confirmação explícita do usuário** (bug real e crítico corrigido no
  Prompt 99 — escrita prematura em `NewContributionDialog.tsx`).
- **Guard de build automático já existente**: `scripts/forbid-legacy-tagline.js`
  e `scripts/check-ssot-leaks.js` (se já executado o Prompt 108) rodam
  em `npm run build` — **execute-os como parte desta auditoria**, não
  ignore o que eles já cobrem.

### 1.2 Padrões de bug já identificados nesta base de código (calibração
obrigatória — não re-reportar estes como "descoberta nova" se já
corrigidos; **mas verificar se o mesmo padrão se repete em outro lugar
ainda não corrigido**, esse é o valor real desta varredura):
1. Enum de domínio (`type`, `currency`, `status`) lido/renderizado cru
   em vez de passar pela função/dicionário canônico.
2. Escrita no Firestore como efeito colateral de digitação/seleção,
   antes de confirmação explícita do usuário.
3. Config de UI (ex: `settings.smartAllocationTargets`) usada como
   fonte de verdade em vez de ser derivada reativamente do estado
   atual (capital, estratégia).
4. Fallback silencioso (`|| "BRL"`, `|| valorPadrão`) mascarando
   ausência de dado da API em vez de logar/sinalizar.
5. Dois sistemas de navegação/UI paralelos fazendo a mesma coisa
   (Sidebar + MobileBottomNav antes do Prompt 100).
6. Dado calculado uma única vez no momento da criação e nunca
   recalculado quando a lógica de classificação/cálculo muda depois
   (dado "congelado" — ver backfill FII/REIT do Prompt 89).
7. Ordem de checagem condicional errada em heurística de classificação
   (`.SA` vs regex de REIT — Prompt 86).

### 1.3 Ambiente
- Dev e produção compartilham o mesmo projeto Firebase
  (`fuente-price-pro`) — não existe projeto separado para dev.
- `main` no GitHub pode estar atrás de `dev` — sempre auditar `dev`
  explicitamente (`git fetch origin dev:dev && git checkout dev`).
- Deploy de Firestore Rules **não é automático** — não há pipeline de
  CI que publique `firestore.rules`; mudança de regra só tem efeito
  real em produção após `firebase deploy --only firestore:rules`
  manual. Verificar se há regra corrigida no repo que ainda não foi
  deployada (comparar `firestore.rules` do repo contra o Console do
  Firebase, se acesso disponível, ou sinalizar para verificação manual
  de Paulo se não houver acesso).

---

## 2. As 9 Regras de Ouro — Checklist Obrigatório por Achado

Todo achado deste sweep **deve** ser classificado contra este
checklist (formato idêntico ao gate `fuente-architecture-review`) —
não é suficiente descrever o problema, é necessário dizer qual regra
ele viola:

| # | Regra | Pergunta de Verificação |
|---|-------|--------------------------|
| 1 | Reusabilidade Primeiro | "Essa lógica/componente já existe em outro lugar sob outro nome?" |
| 2 | Zero Hardcode i18n | "Toda string visível passa por `t()`?" |
| 3 | Isolamento Dev/Mock | "Há mock commitado, sync com prod, ou escrita fora de confirmação explícita?" |
| 4 | SSOT Financeiro | "Essa tela recalcula algo que já existe em `getAssetValuation`/`computeSuggestedAllocation`, mesmo que ligeiramente diferente?" |
| 5 | Mobile-First | "Comportamento em ≤375px está definido e correto (scroll horizontal ou empilhamento, nunca esmagamento)?" |
| 6 | Qualidade Visual Premium | "WOW effect, ou é MVP genérico? Número financeiro legível em qualquer fundo?" |
| 7 | Precedência AGENTS.md | "Há conflito entre este achado e alguma decisão já registrada? Sinalizar, não resolver sozinho." |
| 8 | Plano Obrigatório | N/A para esta rodada (você não vai implementar) |
| 9 | Governança de Roles | Ver Seção 6.1 |

---

## 3. Áreas de Varredura Obrigatórias (7 áreas — 3 novas em relação ao
sweep original)

Para cada área, varra **todo** `src/` (frontend e `.server.ts`), não
amostras. Se não conseguir cobrir tudo, declare o gap.

### 3.1 Arquitetura & SSOT
- Todo componente que calcula valuation, yield, consenso, alocação
  sugerida ou conversão cambial **sem** passar pelas SSOTs listadas em
  1.1.
- Toda ocorrência de `getAssetValuation`/`computeSuggestedAllocation`
  chamada fora do hook canônico: confirmar se é simulação legítima
  (rotulada visualmente) ou violação disfarçada.
- Prop-drilling de 3+ níveis que um Context/hook resolveria.
- Segunda implementação de uma mesma pergunta de negócio vinda de
  fonte diferente (quantidade do ativo, próximo pagamento, moeda,
  tipo traduzido).
- **Novo**: rodar `node scripts/check-ssot-leaks.js` (se existir) e
  incorporar o output ao relatório — não repetir manualmente o que a
  ferramenta já cobre, mas expandir para padrões que a ferramenta
  ainda não detecta (ela cobre só `type`/`currency`; procurar
  manualmente por vazamento de `status`, `subscriptionStatus`, ou
  outro enum/campo de domínio relevante).

### 3.2 Performance & Referential Equality
- `useMemo`/`useCallback` ausente em cálculos O(n)+, objetos/arrays
  literais passados a Recharts, funções passadas a componentes
  memoizados.
- Objetos/arrays recriados a cada render quebrando `React.memo`
  downstream.
- Rotas/painéis pesados sem `React.lazy`+`Suspense` (verificar se o
  Prompt 15.6/103-105 já cobriu as rotas principais — auditar as que
  faltaram, especialmente `DynamicImportModal.tsx` e o painel Admin).
- `useEffect` com array de dependências suspeito.

### 3.3 Backend, Firebase & Isolamento (Regra 3)
- Leituras Firestore redundantes sem cache adequado (`staleTime`/`gcTime`).
- **Qualquer caminho de código capaz de escrever no Firebase sem
  confirmação explícita do usuário** — acionar com severidade máxima,
  seguindo o precedente do Prompt 99. Verificar especificamente:
  `DynamicImportModal.tsx`/`transactionPersistence.ts` (import em
  lote, Prompt 105) — confirmar que a persistência só ocorre após
  confirmação no resumo, não automaticamente ao fim do parsing.
- Massa de dado mock/fixture commitada fora de `__tests__`/`__fixtures__`.
- Firestore Rules mais permissivas que o necessário para campos
  sensíveis, **e** Rules mais restritivas que o necessário para
  config de produto não-sensível (os dois sentidos do erro — ver
  Prompt 92 como exemplo do segundo caso).
- **Novo**: todo fallback silencioso (`|| "valor"`) em `.server.ts`
  que mascare ausência de campo de API — listar cada ocorrência,
  avaliar se merece log/warning (padrão já estabelecido em
  `brapi.server.ts` pelo Prompt 107/109).

### 3.4 Qualidade de Código, Type Safety & i18n
- `any` explícito/implícito, `as any`, `@ts-ignore` sem justificativa.
- String de interface fora do i18n (`aria-label`, `title`,
  `placeholder`, JSX).
- **Enum de domínio renderizado cru em JSX** (`{item.type}`,
  `{status}`, etc. sem passar por dicionário) — checklist de
  calibração: os pontos já confirmados corretos são
  `AssetComparator.tsx:151`, `AssetForm.tsx:113,133`,
  `DividendRadar.tsx:243`, `RiskRadar.tsx:139`, `SmartAllocation.tsx:239`,
  `TargetAllocationPanel.tsx:113`, `AssetDataDisplay.tsx:27`,
  `AllocationChart.tsx:49`, `PortfolioTableV2.tsx` — não reportar
  estes como achado, mas usar como padrão de "correto" para achar
  onde mais o padrão falha.
- Locale hardcoded (`"pt-BR"` direto) em vez de `toIntlLocale()`.
- Código morto: sem import ativo, imports não usados, classes
  Tailwind duplicadas/conflitantes.

### 3.5 LGPD & Dado Pessoal (🆕 área nova — skill `fuente-advogado-lgpd-gdpr`)
Para cada fluxo que toca dado pessoal (ver categorias da Seção 2 do
skill: Identificação Direta, Financeiro, Fiscal/Documental,
Comportamental, Preferências, Dados de Terceiros/corretoras):
- **Minimização**: alguma `createServerFn`/query traz mais campos do
  que a tela realmente usa? (Precedente correto: `listUsersFn` do
  painel Admin, que só traz 6 campos explicitamente — usar como
  padrão de comparação.)
- **Direitos do titular** — para cada um, testar o estado atual:
  Acesso (usuário vê todo dado que o sistema tem?), Portabilidade
  (export é completo ou só posição, sem transação — ver pendência
  aberta do Prompt 105/98), Exclusão (remove todas as subcoleções?),
  Correção (edição sem fricção desproporcional?), Revogação de
  consentimento (cookie/analytics).
- **Dados de terceiros** (notas de corretora, arquivo de import
  dinâmico do Prompt 103-105): o arquivo original é retido após
  processamento, ou só o dado normalizado? Isso precisa estar
  documentado.
- **Transferência internacional**: chamadas a API US (Yahoo, SEC
  EDGAR, Nasdaq) com dado de usuário BR — confirmar que só ticker/
  dado de mercado trafega, nunca PII do usuário.

### 3.6 Duplicação de Sistema/Componente (🆕 área nova, achado real do
Prompt 100 generalizado)
- Buscar por qualquer outro par de componentes fazendo essencialmente
  a mesma função de forma paralela e divergente (o padrão que gerou
  `Sidebar` + `MobileBottomNav` coexistindo). Onde procurar: sistemas
  de modal/dialog de adicionar ativo (confirmar que
  `AddToWatchlistDialog.tsx` e `NewContributionDialog.tsx` continuam
  não-duplicados — ambos delegam para `buildWatchlistItem`, verificar
  se isso ainda é verdade), sistemas de exportação CSV
  (`buildWatchlistCsv` vs `buildWatchlistFullCsv` vs
  `buildTransactionsCsv` — confirmar que os 3 têm propósito
  claramente distinto e documentado, não sobreposição acidental).

### 3.7 Consistência de Dado Legado vs. Lógica Atual (🆕 área nova,
padrão do Prompt 89/106/107)
- Para toda SSOT que já foi corrigida/alterada ao longo do histórico
  do projeto (classificação FII/REIT, moeda por ativo, ordem de
  checagem `.SA`), confirmar se existe dado **já persistido** no
  formato antigo/errado que nunca foi corrigido — isso não é bug de
  código, é dívida de dado, e pede script de auditoria read-only
  (nunca correção automática sem aprovação), seguindo o padrão já
  estabelecido (`scripts/backfill-fii-reit-classification.ts`,
  `scripts/audit-orphan-watchlist-items.ts`).

---

## 4. Execução Obrigatória de Ferramentas (não é só leitura estática)

Diferente do sweep original (só leitura de código), esta rodada
**exige rodar** o que já existe:

```bash
npx tsc --noEmit
npm run test
node scripts/forbid-legacy-tagline.js
node scripts/check-ssot-leaks.js   # se já existir (Prompt 108)
```

Incorporar o output literal de cada um ao relatório (Seção 6.4). Um
achado de "possível bug de tipo" que `tsc --noEmit` já pegaria e não
pega deve ser tratado como confirmação de falso positivo, não como
achado novo.

---

## 5. Aplicação Explícita dos 9 Roles (Regra 9 — obrigatório)

Diferente de "considerar mentalmente", cada achado relevante deve
citar qual role o identificou como problema:
- `fuente-architecture-review`: todo achado, é o gate mestre.
- `fuente-solution-architect`: achados de acoplamento, onde a lógica
  deveria viver, prop-drilling.
- `fuente-business-architect`: achados que afetam capacidade de
  negócio ou journey (ex: export CSV incompleto afeta a capacidade de
  "portabilidade de dado" prometida).
- `fuente-product-manager`: classificação final de cada achado (ver
  Seção 6.3 — formato RICE obrigatório).
- `fuente-ux-designer`: achados de Regra 5/6 (mobile, qualidade
  visual).
- `fuente-investidor-profissional`: achados que comprometem
  credibilidade de cálculo pra usuário sofisticado (ex: consenso
  matematicamente incorreto, dado desatualizado).
- `fuente-investidor-iniciante`: achados de jargão/complexidade
  desnecessária pra usuário leigo.
- `fuente-advogado-lgpd-gdpr`: todo achado da Seção 3.5.
- `fuente-product-marketing`: só se achado afetar posicionamento/copy
  competitivo — normalmente N/A nesta varredura técnica, declarar
  motivo se N/A.

---

## 6. Formato de Saída Obrigatório — NENHUM OUTRO FORMATO É ACEITO

### 6.1 Declaração de Roles (topo do relatório, antes de tudo)
```markdown
| Role | Usado? | Motivo |
|------|--------|--------|
| fuente-architecture-review | ✅ | Gate obrigatório de toda revisão |
| fuente-solution-architect | ✅/❌ | [motivo] |
| ... (9 linhas, nenhuma omitida) |
```

### 6.2 Três Tabelas de Achados (mesmo formato do sweep original,
mantido por consistência histórica)

**Tabela 1 — Quick Wins** | **Tabela 2 — Evoluções de SSOT &
Arquitetura** | **Tabela 3 — Performance & Dívida Técnica** — cada uma
com colunas: `Arquivo (caminho + linha)` | `Descrição (+ qual das 9
Regras viola)` | `Risco de Regressão (Baixo/Médio/Alto)` | `Solução
Proposta`.

### 6.3 Tabela 4 (🆕) — Classificação RICE (formato `fuente-product-manager`)
```markdown
| Achado | Categoria (Crítico/Não-Crítico/Melhoria/Decisão Negócio) | Reach | Impact | Confidence | Effort | RICE Score | Prioridade Sugerida |
|---|---|---|---|---|---|---|---|
```
Seguir as regras do skill: Bug Crítico sempre vence a ordenação;
Decisão de Negócio não entra no cálculo RICE, fica marcada
"Parqueada — dono Paulo".

### 6.4 Output Literal das Ferramentas (Seção 4)
Colar o output real de `tsc`, `test`, `forbid-legacy-tagline`,
`check-ssot-leaks` — não resumir, não parafrasear.

### 6.5 Achados de LGPD (Tabela 5, formato do skill)
```markdown
| Fluxo/Feature | Categoria de Dado | Direito do Titular Afetado | Status Atual | Gap Identificado |
|---|---|---|---|---|
```

### 6.6 Cobertura da Varredura
Por área (3.1 a 3.7), declarar quanto foi efetivamente percorrido —
não assumir que o revisor confia sem essa declaração.

---

## 7. Lembrete Final

Você não vai implementar nada agora. Os 3 gates (`tsc`/`test`/`build`)
que você roda nesta rodada são para **confirmar o estado atual do
repo**, não para aprovar uma mudança sua — não há mudança sua. Sua
entrega é o diagnóstico completo, nas tabelas da Seção 6, com
honestidade de cobertura e execução real das ferramentas disponíveis.
Este é o sweep mais abrangente já pedido neste projeto — trate a
barra de qualidade como tal.
