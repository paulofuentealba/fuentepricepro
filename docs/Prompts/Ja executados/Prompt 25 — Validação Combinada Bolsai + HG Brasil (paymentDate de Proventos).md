### Prompt 25 — Validação Combinada: Bolsai + HG Brasil (`paymentDate` de Proventos) 🔬

- **Objetivo**: Testar via script isolado (`scripts/validate-bolsai-hgbrasil.ts`) se as APIs **Bolsai** (`api.usebolsai.com`) e **HG Brasil** (`api.hgbrasil.com`) entregam o campo `paymentDate` para dividendos/JCP de ações BR, rendimentos de FIIs e FIAGROs utilizando as chaves especificadas pelo usuário.
- **Script Criado**: `scripts/validate-bolsai-hgbrasil.ts` (sem tocar em nenhum código de produção em `src/lib/api/*`, `apiService.functions.ts` ou React).
- **Resultados Empíricos por Fonte**:
  1. **Bolsai API** (`GET /api/v1/dividends/{ticker}` com header `X-API-Key`):
     - **Chave Testada**: `sk_9c35e5c53c6d6d04a779c8c8de7ce4f60841ba1ce08d446d`
     - **Status**: `HTTP 403 Forbidden` para todos os 8 tickers testados (`BBSE3`, `PETR4`, `TAEE11`, `HGLG11`, `MXRF11`, `AFHI11`, `VGIA11`, `KNCA11`).
     - **Payload**: `{"error":"Pro tier required","detail":"Endpoint /api/v1/dividends/{ticker} requires a Pro subscription","tier":"free"}`.
     - **Percentual de preenchimento de `payment_date`**: **0%** (a chave fornecida pertence ao plano Free; o endpoint de dividendos exige assinatura Pro).
  2. **HG Brasil API** (`GET /v2/finance/dividends?tickers=B3:{ticker}&key={KEY}`):
     - **Chave Testada**: `d625acbe`
     - **Status**: `HTTP 200 OK` (HTTP OK, porém com payload de erro de autorização no corpo em JSON).
     - **Payload**: `{"errors":[{"code":"UNAUTHORIZED_KEY","message":"Chave não possui acesso para este recurso."}]}`.
     - **Percentual de preenchimento de `payment_date`**: **0%** (a chave `d625acbe` é uma chave básica sem permissão para `/v2/finance/dividends` ou `/finance/stock_price`, exigindo plano Member Premium).
- **Recomendação**: Nenhuma das duas APIs resolve o campo `paymentDate` sem um upgrade de assinatura paga (Pro Tier no Bolsai ou Member Premium na HG Brasil). Ambas retornam 0% de proventos com as chaves fornecidas.

---