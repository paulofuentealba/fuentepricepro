# RESULTADO — 89 Item 2 — Backfill de Classificação FII/REIT

## Script criado: `scripts/backfill-fii-reit-classification.ts`

- Segue o padrão de `scripts/seed-feature-gates.ts` (Admin SDK, `isFirebaseAdminConfigured()` guard).
- **Coleção mapeada:** o único local no Firestore que guarda `type: AssetType` por ativo neste projeto é a subcoleção `users/{uid}/assets` (confirmado em `itemToRow()`, `src/lib/watchlist.ts:231-258`) — não existe uma coleção `portfolio/` separada como o prompt hipotetizava. O script usa `db.collectionGroup("assets").where("type","==","REIT")` para varrer essa subcoleção de todos os usuários numa única consulta.
- **Critério de "falso-REIT":** como o campo `ticker` salvo nunca carrega o sufixo `.SA` (removido por `cleanTicker()` em todo save/load — ver `src/lib/formatters.ts:56-64`), o sinal confiável de "é brasileiro" é `currency === "BRL"`, não o sufixo do ticker. Para cada documento com `type: "REIT"` e `currency: "BRL"`, o script chama `classifyBr(ticker)`; se o resultado for `"FII"`, o documento é um falso-REIT.
- `--dry-run` (padrão, sem flag): apenas lista os documentos candidatos (caminho completo, ticker, moeda) e os tickers distintos afetados — não grava nada.
- `--execute`: aplica as correções em lotes de até 400 (limite de 500 do Firestore), com `batch.update(doc, { type: "FII" })`.

## Resultado do `--dry-run`

**Não foi possível executar o dry-run neste ambiente.** O worktree de execução não tem `FIREBASE_SERVICE_ACCOUNT_KEY`/`GOOGLE_APPLICATION_CREDENTIALS` configurados (`isFirebaseAdminConfigured()` retorna `false`), então o script aborta antes de qualquer leitura, por design (mesma trava de segurança de `scripts/seed-feature-gates.ts`) — e mesmo que estivesse configurado, rodar contra o Firestore de produção a partir deste ambiente sem supervisão direta de Paulo não seria apropriado.

**Ação pendente para Paulo:** rodar `npx tsx scripts/backfill-fii-reit-classification.ts` (sem `--execute`, modo dry-run) em um ambiente com as credenciais do Admin SDK configuradas, revisar a lista de tickers/documentos impressa no console, e só então decidir se autoriza rodar com `--execute`.

```bash
npx tsx scripts/backfill-fii-reit-classification.ts
```

## Item 2.2 — Teste de regressão

Não existia teste cobrindo `classifyYahoo` (só `classifyBr` já tinha cobertura em `src/lib/__tests__/classify.test.ts`). Criado `src/lib/api/__tests__/classify.server.test.ts` cobrindo:
- `HGLG11.SA` → `FII`, `KNCR11.SA` → `FII` (a ordem `.SA`-antes-do-regex-REIT que o Prompt 86 corrigiu).
- `O.SA` → `STOCK_BR` (via `classifyBr`, ticker sem sufixo `11`).
- `O` (sem `.SA`) → `REIT` (nome bate no regex `REALTY|REIT`).
- ETFs/mutual funds e fallback `STOCK_US` como casos extras de regressão.

## Gate de saída

1. `npx tsc --noEmit` — 0 erros nos arquivos deste item (2 erros pré-existentes não relacionados em `HorizonteHero.tsx`/`MobileBottomNav.tsx`, fora de escopo).
2. `npx vitest run` — 340 testes passados (incluindo os 5 novos de `classify.server.test.ts`), 9 pulados, 0 falhas.
3. `npm run build` — build limpo.
