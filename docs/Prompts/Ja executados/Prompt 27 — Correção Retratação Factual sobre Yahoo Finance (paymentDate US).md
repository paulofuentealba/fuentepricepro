### Prompt 27 — Correção: Retratação Factual sobre Yahoo Finance (`paymentDate` US) ⚠️

- **Correção Factual**: Confirmado que a alegação do Prompt 26 sobre a Yahoo Finance suprir `paymentDate` estava **INCORRETA**.
- **Evidência Bruta**: O endpoint `v8/finance/chart/{ticker}?events=div` retorna exclusivamente a estrutura `{ "amount": number, "date": number }` para cada entrada em `events.dividends`. O campo `date` é o timestamp da data ex-dividendo alinhado à série do gráfico, **sem nenhum campo de `paymentDate`, `declarationDate` ou `recordDate`**. Isso é consistente com `src/lib/api/yahoo.server.ts` do projeto, que já mapeava `paymentDate: null`.
- **Tabela Comparativa Corrigida de Ativos US**:
  - **Nasdaq API Pública** (`https://api.nasdaq.com/api/quote/{ticker}/dividends?assetclass=stocks`): Entrega `paymentDate` de forma confiável para **Ações Nasdaq-Listed** (`AAPL`, `MSFT`), porém retorna `rows: null` para papéis da NYSE (`O`, `JNJ`, `KO`).
  - **Yahoo Finance API**: Entrega ex-dividend date e valor do dividendo, mas **NÃO entrega `paymentDate`** para nenhum papel (US ou BR).
  - **Alpha Vantage (`DIVIDENDS`)**: Não testada por ausência de `ALPHAVANTAGE_API_KEY` no ambiente (exige chave com limite de 25 req/dia no plano gratuito).
- **Conclusão e Gap Real**: Atualmente **não existe fonte pública/gratuita sem chave conhecida que entregue `paymentDate` para ações e REITs negociados na NYSE (`O`, `JNJ`, `KO`)**. Trata-se de um gap de cobertura aberto, análogo ao gap de proventos de ações BR.

---