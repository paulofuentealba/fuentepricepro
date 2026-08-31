# PROMPT — Tier 0 / Lote 1: 3 Correções Críticas da Fase 2 (Sweep Multi-Skill)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

3 itens nesta rodada, cada um com plano, diff e gates próprios — **não misture os 3 num commit
só**. Regra 8: responda com o plano de cada item antes de codar. Branch: `git fetch origin
dev:dev && git checkout dev && git pull origin dev` antes de tocar em qualquer arquivo. Sem
`git commit`/`git push` sem autorização explícita por item.

Ordem: **3 → 1 → 2** (o snapshot corrompido primeiro, é o único com dado real já sendo gravado
errado em produção agora).

---

## ITEM 3 (prioridade máxima) — Snapshot de Patrimônio Corrompido no Firestore

### Causa raiz confirmada
`src/components/ceiling/CashFlowCalendar.tsx:136-140`:
```typescript
const totalInvestedBRL = valuedItems.reduce((acc, it) => {
  const value = it.quantity * it.currentPrice;  // ← valor de MERCADO, não custo
  return acc + (it.currency === "USD" ? value * fxRate : value);
}, 0);

usePortfolioSnapshot(currentPortfolioValue, totalInvestedBRL);
```
`totalInvestedBRL` usa `it.currentPrice` (cotação atual) em vez de `it.averagePrice` (preço
médio de aquisição). Isso é persistido todo dia no Firestore via `usePortfolioSnapshot` —
**todo snapshot histórico já gravado tem "investido" = "valor de mercado atual"**, zerando
estruturalmente qualquer cálculo de rentabilidade que dependa desses snapshots.

### Decisão de arquitetura — não é patch local, é campo canônico faltando
Investiguei `src/lib/useValuedPortfolio.tsx` — o objeto `totals` retornado (linha 81) tem
`consolidatedNetWorth` (valor de mercado) mas **não tem** um equivalente de custo investido.
Não existe hoje. A correção correta não é só trocar `currentPrice` por `averagePrice` dentro de
`CashFlowCalendar.tsx` — é adicionar o campo canônico que falta em `useValuedPortfolio.tsx`, no
mesmo lugar onde `consolidatedNetWorth` já é calculado (linhas ~55-81), para que qualquer outra
tela que precise de "custo investido consolidado" no futuro (IRR, outros cards) consuma o mesmo
SSOT em vez de recalcular.

### Plano esperado (responda antes de codar)
- **(a) Arquivos:** `src/lib/useValuedPortfolio.tsx` (adicionar campo, ex: `consolidatedInvested`,
  calculado com a mesma lógica de agregação BRL/USD que já existe para `consolidatedNetWorth`,
  mas usando `it.averagePrice * it.quantity` em vez de `getPositionValue`/`currentPrice`) +
  `src/components/ceiling/CashFlowCalendar.tsx` (consumir o campo novo em vez de recalcular
  inline) + qualquer arquivo de tipo/interface que declare o shape de `totals`.
- **(b) Lógica central:** confirmar se `averagePrice` pode ser `null`/`0` para posições sem
  ledger de transações (ativos adicionados sem compra registrada) e decidir o que fazer nesse
  caso — não deixar `NaN` silencioso entrar no total.
- **(c) Pontos de atenção:**
  - **Dado já corrompido em produção:** os snapshots já gravados no Firestore com o valor errado
    não são corrigidos retroativamente por esta mudança (ela só corrige gravações futuras).
    Investigar (leitura Firestore, Regra 3 — só leitura) quantos documentos de snapshot existem
    hoje e reportar, mas **não decidir sozinho** se cabe um script de correção retroativa — trazer
    a pergunta para mim e Paulo decidirmos separadamente, fora desta rodada.
  - Confirmar se `usePortfolioSnapshot` é chamado em algum outro lugar do app com o mesmo padrão
    de bug (buscar todas as ocorrências antes de assumir que é só este arquivo).
  - Teste cobrindo: item com `averagePrice` diferente de `currentPrice` deve gerar
    `consolidatedInvested` ≠ `consolidatedNetWorth` (hoje, pelo bug, eles saem artificialmente
    próximos/iguais).

---

## ITEM 1 — CTA "Desbloquear Pro" Morto (`BlurredPreviewOverlay.tsx`)

### Causa raiz confirmada
`src/components/ceiling/BlurredPreviewOverlay.tsx:32-37`:
```typescript
const handleUnlock = () => {
  if (!user) {
    window.dispatchEvent(new CustomEvent("open-auth-modal"));
  } else {
    window.dispatchEvent(new CustomEvent("open-subscription-modal"));
  }
};
```
Busquei `addEventListener` desses 2 eventos em toda a base — **zero ocorrências**. O botão não
faz nada.

### Padrão real já existente no projeto (Regra 1 — reusar, não inventar)
- Para o caso `!user`: `src/lib/auth-modal.tsx` exporta `useAuthModal()` com
  `openAuthModal(opts?: { message?, onSuccess? })` — provider já registrado na árvore (usado em
  `AssetCard.tsx`, `GoalPlanner.tsx`, `Header.tsx`, `SmartAllocation.tsx`, etc.).
- Para o caso `user` autenticado sem plano Pro: o padrão real do projeto é renderizar
  `<PaywallDialog open={showPaywall} onOpenChange={setShowPaywall} />` localmente com estado —
  confirmei em `AddToWatchlistDialog.tsx:50,58,109,120`. Não existe um "abrir paywall global via
  evento" em nenhum outro lugar do código.

### Plano esperado
- **(a) Arquivos:** `src/components/ceiling/BlurredPreviewOverlay.tsx` — substituir
  `handleUnlock` para chamar `useAuthModal().openAuthModal()` quando `!user`, e gerenciar estado
  local `showPaywall` + renderizar `<PaywallDialog>` quando `user` existe, seguindo exatamente o
  padrão de `AddToWatchlistDialog.tsx`.
- **(b) Lógica:** confirmar as props exatas de `PaywallDialog` (abrir o arquivo, não assumir) e
  replicar fielmente.
- **(c) Testes:** teste de interação confirmando que `openAuthModal` é chamado quando `!user`, e
  que `showPaywall` vira `true` (ou o dialog abre) quando `user` existe.

---

## ITEM 2 — Tipo de Ativo Editado Não Propaga (`AssetForm.tsx`)

### Causa raiz confirmada
`src/components/ceiling/AssetForm.tsx`:
- `onSubmit` só é chamado dentro de `pick()` (linha ~74-83), na seleção inicial via busca, com
  `type: hit.type` (o tipo original).
- O `<Select onValueChange={(v) => setManualType(v as AssetType)}>` (linha 126) só atualiza
  estado local `manualType`, usado apenas para exibição (`activeType`, linha 93).
- O botão "Concluído" (linha ~143, `onClick={() => setEditingType(false)}`) só fecha o modo de
  edição — não chama `onSubmit` de novo.

### Plano esperado
- **(a) Arquivos:** `src/components/ceiling/AssetForm.tsx`.
- **(b) Lógica:** o botão "Concluído" (ou o próprio `onValueChange`, decidir qual gatilho é mais
  correto de UX — provavelmente "Concluído", para não disparar recálculo a cada tecla/seleção
  intermediária) deve chamar `onSubmit` novamente com o `type` atualizado e os demais campos já
  coletados (`ticker`, `targetYield`, etc. — confirmar quais campos o `AssetFormValue` exige e
  garantir que nenhum fique undefined nessa segunda chamada).
- **(c) Pontos de atenção:** confirmar que essa segunda chamada de `onSubmit` não duplica o ativo
  na watchlist (deve ser um update, não um novo insert) — investigar como o consumidor de
  `onSubmit` trata chamadas repetidas para o mesmo ticker antes de assumir que já funciona certo.

---

## Governança (Regra 9) — Tabela Individual por Item

Cada um dos 3 itens recebe sua própria tabela de 9 papéis no relatório de conclusão — não uma
tabela única para os 3.

---

## Lembrete Final

Comece pelo plano do Item 3. Não pule para os Itens 1 e 2 sem eu confirmar o Item 3 primeiro.
