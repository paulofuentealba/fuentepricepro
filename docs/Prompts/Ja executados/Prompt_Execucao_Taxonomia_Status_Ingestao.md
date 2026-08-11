# Prompt de Execução — Taxonomia de Status de Ingestão (Abordagem A)

> Decisão registrada em `docs/Implementation Plans/Discovery_Taxonomia_Status_Ingestao.md`.
> Abordagem A confirmada por Paulo em 2026-08-11: `fetchWithRetry`
> reporta `PASSED`/`FAILED`/`ERROR` automaticamente; callers reportam
> `INVALID`/`SKIPPED`/`WARNING` via opt-in (`reportIngestionStatus`).
> Painel `/admin/ingestion` **fora de escopo** desta rodada.

## Escopo

1. **`src/lib/api/ingestionLog.server.ts`** (novo arquivo)
   - `type IngestionStatus = "PASSED" | "FAILED" | "ERROR" | "SKIPPED" | "INVALID" | "WARNING"`
   - `type IngestionSource = "brapi" | "yahoo" | "cvm" | "secEdgar" | "nasdaq" | "benchmark"`
   - `reportIngestionStatus(source, status, detail?, ticker?)`: escreve em
     `ingestionLog/{source}_{YYYY-MM-DD}` via Admin SDK
     (`getAdminFirestore()`, mesmo padrão de `cvm.server.ts`), usando
     `FieldValue.increment(1)` no contador do status e sobrescrevendo
     `lastError` só quando `status !== "PASSED"`. Deve ser fire-and-forget
     do ponto de vista do caller (nunca lançar, nunca atrasar a resposta
     principal — `console.warn` e segue se o Admin SDK não estiver
     configurado ou o write falhar).

2. **`src/lib/api/http.server.ts`**
   - `fetchWithRetry` ganha um parâmetro obrigatório `source:
     IngestionSource` (ajustar todos os call sites).
   - Ao retornar (sucesso `r.ok`) → `reportIngestionStatus(source,
     "PASSED")`.
   - Ao retornar por esgotar retries com `!r.ok`, ou por status
     não-retryable → `reportIngestionStatus(source, "FAILED", detail:
     "HTTP {status}")`.
   - Ao relançar exceção de rede/timeout → `reportIngestionStatus(source,
     "ERROR", detail: err.message)` antes do `throw`.
   - Não bloquear o fluxo existente — os writes de log não devem ser
     `await`ados no caminho crítico (dispare e esqueça, com `.catch` para
     não gerar unhandled rejection).

3. **`src/lib/api/yahoo.server.ts`**
   - Migrar `getYahooAuth()` e `fetchYahooQuoteSummary()` de
     `fetchWithTimeout` para `fetchWithRetry(..., { retries: 0 })` —
     comportamento de timeout idêntico ao atual, ganha instrumentação
     automática. Não alterar a lógica de auth/cache além da troca da
     chamada de fetch.

4. **`src/lib/api/cvm.server.ts`**
   - Único ponto sem HTTP: instrumentar manualmente em
     `fetchCvmEnrichedFacts`.
     - Leitura de `enrichedFundamentals/{ticker}` bem-sucedida (doc
       existe e tem dados) → `reportIngestionStatus("cvm", "PASSED")`.
     - Erro no `.get()` do Firestore → `reportIngestionStatus("cvm",
       "ERROR", detail)`.
     - Doc ausente, cai para `cvmLocalCache` → `reportIngestionStatus("cvm",
       "WARNING", "fallback to local cache")`.
     - Nada encontrado em nenhuma das duas fontes → `reportIngestionStatus("cvm",
       "INVALID", "no data in Firestore or local cache")`.

5. **Callers que precisam de opt-in adicional** (`INVALID`/`SKIPPED`):
   - `dedupeInFlight` (`http.server.ts`): quando uma chamada é
     colapsada (Promise já em andamento reaproveitada), reportar
     `SKIPPED` — precisa saber a `source`/`key` para isso; avaliar se
     vale adicionar um parâmetro opcional `source` a `dedupeInFlight`
     só para esse log, sem mudar seu comportamento de dedupe.
   - `brapi.server.ts`, `nasdaq.server.ts`, `benchmark.server.ts`,
     `secEdgar.server.ts`: nos pontos onde hoje retornam `null`/`[]`/
     `Map()` vazio **após um `fetchWithRetry` que teve `PASSED`** (ou
     seja, HTTP OK mas conteúdo não passou validação — array vazio,
     campo obrigatório ausente), reportar `INVALID` com detail curto.
     Não duplicar log quando o `null`/vazio já veio de um `FAILED`/
     `ERROR` reportado pelo próprio `fetchWithRetry`.

6. **Firestore**
   - `firestore.rules`: adicionar bloco `ingestionLog/{docId}` com
     `allow read: if request.auth != null; allow write: if false;`
     (mesmo padrão de `config/featureGates`).

## Fora de escopo (explícito)

- Painel `/admin/ingestion` — não implementar rota, UI, nem
  `createServerFn` de leitura agregada nesta rodada.
- Alarmes/notificações automáticas sobre taxa de falha.
- Migração de `nasdaq.server.ts`'s `minInterval` ou qualquer outra
  mudança de comportamento de rate-limit — só instrumentação de log.

## Critério de conclusão

- `fetchWithRetry` exige `source` em todos os call sites (type error se
  esquecido — força cobertura completa).
- `cvm.server.ts` reporta status em todos os 4 ramos descritos.
- `firestore.rules` protege `ingestionLog` com o padrão server-only.
- Nenhuma mudança de comportamento observável no fluxo principal
  (mesmos retornos, mesmos fallbacks) — só logging adicional.
- Rodar typecheck/lint/testes existentes do projeto e confirmar que
  passam.
