# PROMPT — Fase 2 / Tier 1 / Lote 1: 6 Achados de Suavização Silenciosa
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Plano/diff/gates individuais por item, não misturar commits. Branch: `git fetch origin dev:dev &&
git checkout dev && git pull origin dev` (deve estar em cima de todos os commits da Fase 1, já
mesclados em `main` e `dev`). 3 gates reais, output literal completo, sempre.

Contexto: estes são achados do **Tier 1** da Fase 2 (varredura de componentes) — "suavização
silenciosa/auditabilidade", não corrupção ativa de dado como o Tier 0. Ainda merecem correção, mas
com prioridade abaixo do que já fechamos.

Ordem: **1 → 2 → 3 → 4 → 5 → 6** conforme abaixo.

---

## ITEM 1 — Paywall Bloqueia Tooltip Educativo (`ResultStats.tsx`)

### Causa raiz confirmada (reconfirmado agora, ainda presente)
`<details onClick={(e) => { if (!customTaxUnlocked) { e.preventDefault(); onShowPaywall(); } }}>`
envolve o `<summary>` que contém o `InfoTooltip` de "Exceções Fiscais". Usuário free clicando no
ícone de informação pra só **entender** a feature aciona o paywall, em vez de ler a explicação.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/result/ResultStats.tsx`.
- **(b) Lógica:** aplicar `e.stopPropagation()` no gatilho do próprio `InfoTooltip` (ou isolar a
  checagem de paywall só no controle de input interno, não no `<details>` inteiro) — investigar
  qual abordagem tem menos risco de regressão no comportamento de abrir/fechar o `<details>` em si.
- **(c) Testes:** clique no ícone de tooltip não deve dispara `onShowPaywall`; clique em outra
  parte do `<summary>` (fora do tooltip) continua disparando normalmente pra usuário free.

---

## ITEM 2 — `PortfolioIrrCard`: Fallback de CDI/Selic Sem Indicação Visual (`fallbackSelic`)

### Causa raiz confirmada (reconfirmado agora)
Linhas 246/256: `annualizedCdi !== null ? ... : \`${fallbackSelic.toFixed(1)}% a.a.\`` — quando a
série histórica de CDI falha, mostra a taxa Selic estática **sem nenhuma indicação** de que é
fallback, não dado real anualizado.

### Plano esperado
- **(a) Arquivo:** `src/components/ceiling/cashflow/PortfolioIrrCard.tsx`.
- **(b) Lógica:** mesmo padrão já aplicado em `AllocationChart.tsx` (badge `bg-warning` +
  `AlertCircle` + tooltip, já existe precedente real no projeto) quando o valor exibido é
  fallback, não dado real. Aplicar nas 2 ocorrências (CDI e Selic).
- **(c) Testes:** badge aparece quando `annualizedCdi`/`annualizedSelic` é `null`; não aparece
  quando há dado real.

---

## ITEM 3 — `WatchlistKpiSection`: Moeda Consolidada Hardcoded em "BRL"

### Investigação necessária antes de codar
Confirme se esse achado do relatório original ainda reflete o código atual (linhas ~89,102 na
varredura original) — pode ter sido tocado por trabalho posterior desta investigação. Reporte o
que encontrar antes de propor correção.

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/ceiling/watchlist/WatchlistKpiSection.tsx`.
- **(b) Lógica:** formatar totais consolidados respeitando a moeda base configurada em
  `useUserSettings` (`displayCurrency`), não fixar `"BRL"`.
- **(c) Testes:** totais em USD quando `displayCurrency === "USD"`.

---

## ITEM 4 — `ConsensusPyramid`: Tooltips Ocultos Quando Métodos São Válidos

### Investigação necessária antes de codar
Confirme o estado atual de `InfoTooltip`/`notNullTooltip` em `ConsensusPyramid.tsx` — o achado
original dizia que o tooltip só aparece quando o modelo é `null` (`isNull && notApplicableTooltip`),
deixando o iniciante sem explicação quando os valores estão presentes e calculados.

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/ceiling/watchlist/ConsensusPyramid.tsx`.
- **(b) Lógica:** exibir `InfoTooltip` com o conceito de cada método (Bazin/Graham/Gordon) tanto
  para estados válidos quanto nulos — conteúdo do tooltip muda conforme o estado, mas a
  disponibilidade não deveria depender de `isNull`.

---

## ITEM 5 — `AssetDetailSheet.tsx:147`: Mutação Direta de Firestore em Subcomponente de Apresentação

### Investigação necessária antes de codar
Confirme se `AssetHoldings` (subcomponente citado no achado original) ainda dispara
`updateAsync(item.id, { investingSince })` diretamente, acoplando UI de apresentação a persistência.

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/ceiling/watchlist/AssetDetailSheet.tsx`.
- **(b) Lógica:** delegar a persistência para um handler exposto pelo container/pai da Watchlist,
  em vez do subcomponente de apresentação chamar `updateAsync` diretamente. Investigar o quanto de
  refactor isso exige antes de assumir que é trivial — pode precisar de prop drilling ou context.

---

## ITEM 6 — `RegulatoryDisclaimerBanner`: Lista de Rotas Omite Telas Analíticas (CVM)

### Investigação necessária antes de codar
Confirme se `DISCLAIMER_ROUTES` ainda omite `/app/riskradar` e `/app/fi` (ou quaisquer rotas
analíticas/quantitativas novas criadas desde a varredura original).

### Plano esperado (se confirmado)
- **(a) Arquivo:** `src/components/shared/RegulatoryDisclaimerBanner.tsx`.
- **(b) Lógica:** ou integrar o disclaimer ao layout geral de ferramentas de análise (aplica a
  todas as rotas por padrão, com exceção explícita em vez de inclusão explícita), ou adicionar as
  rotas faltantes na lista — decidir qual abordagem é mais sustentável a longo prazo (menos
  propensa a esquecer rota nova no futuro) antes de só tapar o buraco atual.

---

## Governança (Regra 9)

Tabela individual por item no relatório de conclusão.

---

## Lembrete Final

Comece pelo Item 1. Itens 3, 4, 5, 6 exigem reconfirmação contra o código atual antes de propor
correção — não assuma que o achado original de meses atrás ainda está intacto sem verificar.
