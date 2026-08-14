# RESULTADO — 106 — Corrigir Currency Exposure no Risk Radar (SSOT de Moeda)

## 1. Contexto e Diagnóstico
- **Problema**: `src/lib/usePortfolioRisk.ts:68` utilizava a seguinte verificação:
  ```typescript
  const itemCurrency = ["Stock", "REIT"].includes(item.type) ? "USD" : "BRL";
  ```
- **Causa Raiz**:
  1. `item.type` possui valores canônicos do enum `AssetType` como `"STOCK_US"` (e não `"Stock"`). Por causa disso, todos os ativos da classe US Stock caíam no `else` e eram contabilizados incorretamente como `"BRL"`.
  2. Violação de SSOT (Regras 1 e 4): O tipo `WatchlistItem` já armazena o campo `currency: Currency` (`"BRL" | "USD"`), não havendo necessidade de inferência manual a partir de `type`.

## 2. Ações Realizadas
1. **SSOT de Moeda Aplicada**:
   - Linha 68 alterada para:
     ```typescript
     const itemCurrency = item.currency;
     ```
2. **Auditoria de Ocorrências em `src/`**:
   - Realizada busca global por `"Stock"` literal. Nenhuma outra ocorrência indevida de inferência de moeda foi identificada no restante do projeto.
3. **Teste de Regressão Automatizado**:
   - Criado `src/lib/__tests__/portfolioRisk.test.ts` com um caso contendo 1 ativo `STOCK_US` (`AAPL`, 10 x $200 = $2.000 = R$ 10.000) e 1 ativo `FII` (`HGLG11`, 100 x R$ 100 = R$ 10.000).
   - Validado que `risk.currencies` reporta com exatidão **50% USD** e **50% BRL** (em vez de 100% BRL).

## 3. Gates de Verificação
- `npx tsc --noEmit`: 0 erros
- `npx vitest run src/lib/__tests__/portfolioRisk.test.ts`: 1 test passing (8ms)
- Commit: `8c7031f` — `fix(risk-radar): use item.currency SSOT for currency exposure calculation [Prompt 106]`
