### Modal de Importação CSV no Padrão da Nota de Corretagem ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Criado o componente de modal `CsvImportUploader.tsx` espelhando a experiência e o design visual do `BrokerNoteUploader.tsx`.
- **Implementações Principais**:
  1. **Hook `useWatchlistCsvImport.ts`**: Exportada a função `handleFile(file: File): Promise<boolean>` diretamente na API do hook.
  2. **Componente `CsvImportUploader.tsx`**:
     - `Dialog` no padrão visual do `BrokerNoteUploader` com área drag-and-drop grande, borda tracejada, ícone de nuvem e spinner de carregamento.
     - Topo com aviso informativo e botão "Baixar modelo CSV" (`buildTransactionTemplateCsv()` + `downloadCsv()`).
     - Fechamento automático (`onOpenChange(false)`) após importação de dados com sucesso.
  3. **Wiring de Estado**:
     - Adicionado estado `showCsvImporter` em `Watchlist.tsx` e repassado para `AddAssetDropdown`, `WatchlistToolbar` e `WatchlistDialogs`.
  4. **Refatoração do `AddAssetDropdown.tsx`**:
     - Opção "Trazer meu arquivo" abre o modal `CsvImportUploader`.
     - Removido o item duplicado de "Baixar modelo CSV" do menu. O dropdown voltou a ter exatamente 4 opções limpas.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **178 passed** | 4 skipped (30 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso.
  4. **Git Commit Local**: `5b89a8a` (`feat(watchlist): implementa modal CsvImportUploader no padrao visual da nota de corretagem`).

---