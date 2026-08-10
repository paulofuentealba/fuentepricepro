### Corrigir Texto "PDF" Incorreto no Modal de Importação CSV ✅ CONCLUÍDO E VERIFICADO

- **Resumo**: Adicionadas as chaves i18n dedicadas `csvDragDropText` ("Arraste e solte o seu CSV aqui") e `csvImporting` ("Importando transações...") nos dicionários `ptBR`, `en` e `es`, substituindo o texto genérico herdado da nota de corretagem no `CsvImportUploader.tsx`.
- **Melhoria Responsiva**: O card topo de aviso do template CSV foi atualizado para `flex flex-col sm:flex-row sm:items-center`, empilhando verticalmente o botão "Baixar modelo CSV" em viewports mobile (~375px) sem quebras de linha indesejadas.
- **Evidências Literais de Validação**:
  1. **`npx tsc --noEmit`**: **0 erros** (Exit code 0).
  2. **`npm run test`**: **178 passed** | 4 skipped (30 suítes de teste aprovadas).
  3. **`npm run build`**: Client e SSR compilados com sucesso em 946ms.
  4. **Git Commit Local**: `ebdb4c6` (`fix(watchlist): substitui textos de PDF por CSV no CsvImportUploader e ajusta layout responsivo`).

---