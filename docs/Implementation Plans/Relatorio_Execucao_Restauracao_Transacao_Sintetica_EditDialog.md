# Relatório de Execução — Restaurar Transação Sintética na Edição Manual (Regressão do Item 6C Fase 2)

**Data:** 11 de Agosto de 2026  
**Atividade:** Restaurar Transação Sintética na Edição Manual (`Watchlist.tsx` / `EditItemDialog`)  
**Branch:** `dev`  
**Status:** Concluído com sucesso

---

## 1. Investigação da Causa Raiz & Commit Responsável

- **Causa Raiz Identificada:** No commit `c750c05e041904cad0a555bc79b841f1a7acd1cb` ("feat/fix: UI da Watchlist, Transacoes e sinc. Firestore"), a refatoração do componente `EditItemDialog.tsx` adicionou `disabled={hasTransactions}` nos campos de quantidade e preço médio quando o ativo já possuía transações gravadas. Contudo, no manipulador `handleDialogSave` em `Watchlist.tsx`, a lógica de salvar continuou executando apenas `update(editing.id, patch)` direto no documento do `WatchlistItem`. 
- **Onde o Fix Se Perdeu:** Para ativos com 0 transações prévias (ou nos cenários em que o diálogo permite edição), o salvamento gravava `quantity`/`averagePrice` diretamente no item sem emitir a transação sintética correspondente no hook `useTransactions()`.

---

## 2. Correções Implementadas

1. **Recuperação e Emissão de Transação Sintética por Delta (`Watchlist.tsx`)**:
   - Em `handleDialogSave`, o manipulador agora extrai `targetQty` e `targetAvgPrice` do patch.
   - Deriva o `currentHolding` atual das transações via `recalculateHoldingFromTransactions`.
   - Calcula o `delta = targetQty - currentQty`.
   - **Caso 0 Transações Prévias:** Cria a transação inicial de compra `tx-manual-{ticker}-{timestamp}` com a quantidade e preço médio informados.
   - **Caso Delta > 0 (Compra Adicional):** Calcula o preço ponderado por cota necessário para atingir o preço médio alvo `(targetTotalCost - currentTotalCost) / delta` (mesmo algoritmo do import CSV) e emite a transação de compra.
   - **Caso Delta < 0 (Venda Parcial):** Emite transação de venda com o preço por cota correspondente.
   - **Caso Delta == 0 e PM Alterado:** Atualiza o `pricePerShare` da compra inicial existente.
   - **Garantia de Compatibilidade:** Mantém o patch direto no documento `update(editing.id, patch)`.

2. **Chave de i18n Unificada**:
   - Adicionada a chave `manualAdjustment: "Ajuste manual de posição"` (PT-BR), `"Manual position adjustment"` (EN), `"Ajuste manual de posición"` (ES) sob `t.transactions` nos dicionários de internacionalização.

---

## 3. Suíte de Testes de Regressão Executada

Adicionada nova suíte `Synthetic transaction emission on manual position edit` em `src/lib/__tests__/transactions.test.ts`:
- **Teste de Compra Adicional:** Verifica que alterar manualmente a quantidade de 100 para 150 cotas gera uma transação sintética de compra de 50 cotas com o preço ponderado correto.
- **Teste de Venda Parcial:** Verifica que alterar manualmente de 200 para 120 cotas gera uma transação sintética de venda de 80 cotas.
- **Teste de Ativo Novo (0 Transações):** Verifica que editar um ativo sem histórico gera a transação de compra inicial.
- **Convergência de PM:** Confirma que o preço médio final após `recalculateHoldingFromTransactions` bate 100% com o valor editado.

---

## 4. Gates de Saída & Verificação

1. `npx tsc --noEmit` — **Aprovado (0 erros)**
2. `npx vitest run` — **Aprovado (30 suítes passadas, 191 testes passados)**
3. `npm run build` — **Aprovado (Build SSR e Client executados com sucesso)**
