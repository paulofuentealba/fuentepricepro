### Fix: Suprimir Copy Eufórica em Margens Implausíveis (>100% ou Não-Finitas) ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz & Motivação de Risco Reputacional**:
  - `src/components/ceiling/watchlist/AssetDetailSheet.tsx` acionava a mensagem eufórica de *"Golden opportunity! The asset is {{margin}}% Undervalued"* (`t.result.insights.bargain`) para qualquer margem $> 10\%$, sem um limiar máximo de sanidade.
  - Margens atípicas (ex: $591\%$, decorrentes de eventual distorção no modelo de Gordon quando a taxa de crescimento $g$ se aproxima do desconto $r$) exibiam copy superlativa financeira sem disclaimer em um produto sem registro CVM.
- **Alterações**:
  1. `src/lib/i18n/dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`: adicionada nova chave `result.insights.dataInsufficient`:
     - PT: `"Dados insuficientes para consenso confiável."`
     - EN: `"Insufficient data for reliable consensus."`
     - ES: `"Datos insuficientes para un consenso fiable."`
  2. `src/components/ceiling/watchlist/AssetDetailSheet.tsx`:
     - Adicionada verificação `isImplausibleMargin = margin > 100 || !Number.isFinite(margin)`.
     - Quando ativada, suprime o texto eufórico e exibe a mensagem neutra `t.result.insights.dataInsufficient` com badge em tom `slate` (`bg-slate-500/5 border-slate-500/20`).
  3. `docs/BACKLOG_V2.md`:
     - Registrada explicitamente a distinção entre esta mitigação de copy em UI e a correção matemática da causa raiz no modelo de Gordon em `calculations.ts` (item B1/B2, pendente).
- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped).
  2. **`npm run build`**: Compilação limpa do cliente (4097 módulos em 1.36s) e SSR (251 módulos em 793ms).

---