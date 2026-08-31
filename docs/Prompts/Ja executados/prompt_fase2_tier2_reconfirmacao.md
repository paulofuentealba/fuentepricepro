# PROMPT — Fase 2 / Tier 2: Reconfirmação de Achados (i18n & Dívida Técnica) Antes de Fatiar em Lotes
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Este prompt é **só de investigação/reconfirmação** — não codar nada ainda. Objetivo: validar contra
o código atual em `dev` (já sincronizada com o fechamento do Tier 1, Lote 2 — commit `37097ac`) se os
achados abaixo, catalogados no relatório de status consolidado
(`docs/Prompts/relatorio_status_sweep_v2_fases_executadas_e_pendencias.md`, Seções 3.B e 3.C), ainda
refletem o estado real do código. Para cada item, reporte um dos três status:

- **CONFIRMADO** — achado ainda presente exatamente como descrito.
- **ALTERADO** — achado existe mas o código mudou (linha, estrutura, ou nome do arquivo/função
  diferem do relatório original) — descreva o estado atual.
- **JÁ RESOLVIDO** — achado não se aplica mais, foi corrigido por trabalho anterior não documentado
  neste relatório (aconteceu no Item 6 do Tier 1 / Lote 2 — não é reprovação, só reporte).

Além disso: **varredura adicional**. O relatório de status lista 13 itens conhecidos (10 de i18n +
3 de limpeza de código morto). Se, ao abrir cada arquivo listado, você notar *outros* achados
similares (hardcode de texto, prop morta, import não usado) na mesma vizinhança de código que não
constam na lista original, catalogue-os separadamente ao final do relatório — não corrija nada, só
catalogue para eu decidir se entram no escopo dos próximos lotes.

---

## BLOCO A — i18n / Hardcode de Texto e Formatação (10 achados)

### A.1 — `FIProgressCard.tsx` (Rank 11)
Confirme se a contagem regressiva ("ano"/"anos", "mês"/"meses") e avisos relacionados à Independência
Financeira ainda estão hardcoded em português, sem passar por `t.fiMode.*` nos 3 dicionários.

### A.2 — `ValuationAssumptionsModal.tsx` (Rank 18)
Confirme se os prefixos de moeda nos inputs (`R$` vs `$`) ainda são fixos, sem dinamizar conforme
`asset.currency` para ativos cotados em USD.

### A.3 — `useAssetCardDerived.ts` (Rank 19)
Confirme se o template de texto de compartilhamento social ainda está fixo em inglês, sem passar
pelo dicionário i18n.

### A.4 — `AddToWatchlistDialog.tsx` (Rank 22)
Confirme se o texto do prompt de autenticação (pedindo login pra salvar o ativo) ainda está fora do
sistema i18n.

### A.5 — `MaskedInput.tsx` (Rank 32)
Confirme se o componente ainda não suporta o locale espanhol e se o símbolo monetário continua
acoplado ao idioma da interface em vez de à moeda do ativo.

### A.6 — `GoalPlanner.tsx` (Rank 38)
Confirme se `t.result.sharesNeededLabel` ("Cotas Necessárias") ainda não existe como chave dedicada,
e se o texto continua fragilmente montado via `.split("{{qty}}")`.

### A.7 — `AssetDataDisplay.tsx` (Rank 39)
Confirme se ainda usa `.toFixed(1)` em vez de `formatNumber(margin, locale, 1)`, o que quebra a
vírgula decimal esperada em PT/ES.

### A.8 — `RiskRadar.tsx` (Rank 41)
Confirme se os enums de classe de ativo (`STOCK_BR`, `FII`, etc.) e botões estáticos ainda não estão
traduzidos.

### A.9 — `Header.tsx` (Rank 54)
Confirme se a cotação do dólar no badge do header ainda é exibida sem passar por
`formatCurrency(fx.USDBRL, "BRL", locale)`.

### A.10 — `CashFlowEmptyState.tsx` (Rank 35) & `FixedIncomePanel.tsx` (Rank 56)
Confirme se as mensagens de estado vazio (`CashFlowEmptyState.tsx`) e os rótulos de Renda Fixa
("% do CDI" e afins, `FixedIncomePanel.tsx`) ainda estão hardcoded.

---

## BLOCO B — Limpeza de Código Morto (Cluster 7 — 3 achados)

### B.1 — `SummaryCard.tsx` (Rank 57)
Confirme se `src/components/ceiling/watchlist/SummaryCard.tsx` continua órfão (sem nenhum import
ativo em nenhum outro arquivo), mantendo o componente ativo real que substituiu suas funções em
`src/routes/app/index.tsx`. Se confirmado, este item é elegível para exclusão direta do arquivo (sem
necessidade de refactor, só remoção).

### B.2 — `CashFlowHeader.tsx` (Rank 59)
Confirme se o tipo `ViewMode` ainda é exportado sem nenhum consumidor externo.

### B.3 — `AssetCard.tsx` (Rank 58)
Confirme se ainda existem imports ou propriedades não referenciadas no componente — atenção: este
arquivo já foi tocado no Item 8 do Tier 1/Lote 2 (remoção de `isPro`/`useFeatureGate`), então
reconfirme contra o estado *pós-Lote 2*, não contra a varredura original.

---

## Formato do Relatório de Reconfirmação

Para cada um dos 13 itens (A.1–A.10, B.1–B.3): status (CONFIRMADO / ALTERADO / JÁ RESOLVIDO) + trecho
relevante do código atual + linha exata. Ao final, uma seção separada "Achados Adicionais Encontrados
Durante a Varredura" (se houver) com o mesmo nível de detalhe.

Não proponha correções neste prompt — isso vem depois, em prompts de execução por lote, já com o
diagnóstico validado.
