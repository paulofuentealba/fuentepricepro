### Alinhamento da Toolbar da Watchlist + Botão de Template CSV ✅ CONCLUÍDO E VERIFICADO

- **Causa Raiz Real Diagnosticada (Desalinhamento da Toolbar)**:
  - **Divergência de Alturas**: Os controles vizinhos na toolbar da Watchlist utilizavam 4 alturas inconsistentes (24px em `FilterPill`, 30px no toggle grid/tabela, 32px no select de ordenação/exportar, e 36px/40px no botão `AddAssetDropdown`).
- **Ações de Correção**:
  1. **Padronização Visual da Toolbar**:
     - Todos os 6 controles da toolbar (Pill de total "Todos X", `FilterPill`s "Descontados/Caros", `SelectTrigger` de ordenação, botão "+ Add Asset", botão "Exportar" e alternador Grid/Tabela) foram ajustados para a altura unificada de `h-8` (`32px`) e alinhados verticalmente no mesmo baseline `items-center` com `gap-2` / `gap-3`.
  2. **Conexão do Botão "Baixar Modelo CSV"**:
     - Adicionado o botão "Baixar modelo CSV" no menu do `AddAssetDropdown.tsx` (utilizando a chave i18n `t.watchlist.downloadTemplate`), chamando `buildTransactionTemplateCsv()` e `downloadCsv("modelo-importacao-transacoes.csv", csv)`.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **178 passed** | 4 skipped (30 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `f081725` (`fix(watchlist): alinha toolbar para altura h-8 unificada e adiciona opcao baixar modelo csv no dropdown`).

---