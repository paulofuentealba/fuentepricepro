### Prompt 18 — Implementação SEC EDGAR (Fase 2) ✅

- **Objetivo**: Integrar a API oficial da SEC EDGAR para buscar dinamicamente o Book Value Per Share (BVPS) de ações e REITs americanos, suprimindo o fato de que a API do Yahoo Finance frequentemente retorna `null` para essa métrica nesses ativos (quebrando o cálculo do preço justo de Graham).
- **Implementação Técnica (`src/lib/api/secEdgar.server.ts`)**:
  - **Serviço Independente**: Criado `fetchSecEdgarFacts` com cache em memória (TTL de 24h) para o arquivo gigante `company_tickers.json` da SEC, resolvendo o ticker para o CIK de 10 dígitos.
  - **Filtro XBRL Preciso**: Extrai `StockholdersEquity` e `EntityCommonStockSharesOutstanding` (com fallback para `CommonStockSharesOutstanding`). Para evitar uso de contextos desatualizados ou comparativos do ano anterior, os fatos (facts) XBRL são ordenados por `end` date em ordem decrescente, e apenas o primeiro registro (o mais recente) é utilizado.
  - **Tolerância a Falhas**: Toda a operação é encapsulada em bloco try/catch global. Retorna silenciosamente `{ bvps: null }` se houver indisponibilidade da SEC EDGAR, ausência de fato contábil recente, ou se o CIK não existir (ex: em caso de falso positivo com um ticker BR como PETR4).
- **Integração SSOT (`src/lib/apiService.functions.ts`)**:
  - Injetado em `fetchAssetFn` especificamente no branch onde `isYahoo` é executado, **apenas** quando o retorno principal possuir `asset.metrics.bvps` como null ou undefined.
  - Isso garante que a regra de SSOT seja mantida e a UI nunca dependa da SEC EDGAR diretamente, mantendo todos os cálculos centralizados no fluxo já existente do servidor.
- **Verificação Dinâmica**:
  - O script de validação dinâmica (`scripts/verify-sec-edgar.ts`) confirmou BVPS reais para:
    - AAPL: ~7.36 (Referente ao Q3 - FY26, 2026-06-27, com PL de $107,52B)
    - O (Realty Income): ~41.98
    - JNJ: ~35.25
    - KO: ~7.81
    - TICKERFAKE123 (Inexistente): null
- **Testes e Build**: Suíte de testes (41/41) passando sem quebras no mock, com build do Vite gerado e com os chunks corretos. BVPS americano destravado com sucesso na UI (Graham habilitado).

---