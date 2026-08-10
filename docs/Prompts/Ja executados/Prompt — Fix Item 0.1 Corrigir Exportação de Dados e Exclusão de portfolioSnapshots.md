### Prompt — Fix Item 0.1: Corrigir Exportação de Dados e Exclusão de portfolioSnapshots ✅

- **Objetivo**: Corrigir o bug crítico de exportação LGPD mockada e garantir o expurgo completo (scrubbing) da subcoleção `portfolioSnapshots` durante a exclusão de conta em `DeleteAccountWizard` (`src/routes/settings.tsx`), sanando a violação do Direito ao Esquecimento da LGPD.
- **Implementação Técnica**:
  - **Função Pura de Exportação (`src/lib/dataExport.ts`)**: Criada a função pura `buildUserDataExport` para formatar e sanitizar dados do usuário. Mescla `issuerTickerMappings` locais de `localStorage` com a nuvem (**Opção A**, nuvem prevalece em conflito) e remove dados públicos (`enrichedFundamentals`).
  - **Função Pura de Expurgo (`src/lib/accountDeletion.ts`)**: Criada a função pura `buildAccountDeletionPaths` para construir os caminhos ordenados do Firestore. Garante que as 3 subcoleções (`assets`, `transactions`, `portfolioSnapshots`) sejam listadas **antes** do documento raiz `users/{userId}` para evitar documentos órfãos no banco de dados.
  - **Gate Estrito no Wizard (`src/routes/settings.tsx`)**: Atualizado `handleExport` para realizar leitura real assíncrona das 3 subcoleções. Bloqueia o avanço para o Passo 2 em caso de erro na exportação. Atualizado `handleDelete` para consumir `buildAccountDeletionPaths` e expurgar `portfolioSnapshots` em lotes de 400.
  - **i18n**: Adicionadas as chaves `exportingBackup` e `backupError` nos dicionários `dict.ptBR.ts`, `dict.en.ts` e `dict.es.ts`.
- **Testes Unitários (`dataExport.test.ts` e `accountDeletion.test.ts`)**:
  - Adicionadas suítes de testes unitários para a montagem de exportação e ordenação de caminhos de exclusão de conta (100% desconectadas do Firebase Auth).
- **Validação Efetiva (Outputs Reais)**:

**`npm run test` output**:
```
 RUN  v4.1.10 C:/Users/paulo/OneDrive/Fuente Price Pro

 ✓ src/lib/__tests__/accountDeletion.test.ts (3 tests) 2ms
 ✓ src/lib/__tests__/nasdaq.test.ts (3 tests) 28ms
 ✓ src/lib/__tests__/realizedIncome.test.ts (12 tests) 23ms
 ✓ src/lib/__tests__/suggestedAllocation.test.ts (8 tests) 7ms
 ✓ src/lib/__tests__/investor-profile.test.ts (10 tests) 3ms
 ✓ src/lib/__tests__/allocation.test.ts (12 tests) 6ms
 ✓ src/lib/__tests__/calc.test.ts (6 tests) 3ms
 ✓ src/lib/__tests__/cashflow.test.ts (5 tests) 11ms
 ✓ src/lib/__tests__/portfolioIrr.test.ts (6 tests) 5ms
 ✓ src/lib/__tests__/br-business-calendar.test.ts (5 tests) 3ms
 ✓ src/lib/__tests__/fiiPaymentRules.test.ts (6 tests) 4ms
 ✓ src/lib/__tests__/secEdgar.test.ts (5 tests) 4ms
 ✓ src/lib/__tests__/classify.test.ts (4 tests) 4ms
 ✓ src/lib/__tests__/dataExport.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/watchlist.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/transactions.test.ts (6 tests) 4ms
 ✓ src/lib/__tests__/corporate-events.test.ts (4 tests) 3ms
 ✓ src/lib/__tests__/cvm.test.ts (3 tests) 3ms
 ✓ src/lib/__tests__/pdf-parser.test.ts (18 tests) 12ms
 ✓ src/lib/__tests__/issuerTickerMappings.test.ts (2 tests) 103ms

 Test Files  20 passed (20)
      Tests  125 passed (125)
   Start at  17:35:49
   Duration  8.49s
```

**`npm run build` output**:
```
[tagline-check] OK: Nenhuma ocorrência de slogan legado encontrada.
vite v6.2.0 building for production...
transforming...
✓ 2341 modules transformed.
rendering chunks...
computing checksum...
✓ built in 11.23s
building Server bundle...
transforming...
✓ 4 modules transformed.
rendering chunks...
✓ built in 10ms
```
- **Conclusão**: O Item 0.1 da Fase 0 foi integralmente corrigido, testado e validado. Status atualizado em `BACKLOG_V2.md`.


---