### Timeout/Retry em APIs Externas (SEC EDGAR & Selic BCB) ✅ CONCLUÍDO E VERIFICADO

- **Contexto**: Adicionados controles explícitos de timeout e retry em integrações com APIs externas para evitar chamadas travadas e aumentar a resiliência do aplicativo.
- **Arquivos Alterados**:
  1. `src/lib/api/secEdgar.server.ts`:
     - Substituted direct `fetch()` calls with `fetchWithRetry()` from `./http.server`.
     - `company_tickers.json`: `timeoutMs: 5000`, `retries: 1`.
     - `companyfacts/CIK${cik}.json`: `timeoutMs: 2500`, `retries: 1`.
     - Retained headers (`User-Agent: SEC_USER_AGENT`) and graceful fallback (`{ bvps: null }`).
  2. `src/lib/useSelic.ts`:
     - Added local client-side `AbortController` timeout (`5000`ms) matching precedent established in `fetchMacroRatesFn` (`src/lib/apiService.functions.ts`).
     - Kept zero server imports to preserve clean client bundle.
     - Retained fallback `SELIC_FALLBACK` (10.5) on error or abort.

- **Precedente de Timeout BCB**:
  - `fetchMacroRatesFn` localizado em `src/lib/apiService.functions.ts` (linhas 415-460) utilizando `AbortController` com `5000ms` timeout para as séries do Banco Central (BCB SGS).

- **Evidências de Validação**:
  1. **`npm run test`**: 136 passed (22 test files passed, 1 skipped test file for firestore emulator rules).
  2. **`npm run build`**: Compilação limpa do cliente (4098 módulos) e SSR (252 módulos).

---