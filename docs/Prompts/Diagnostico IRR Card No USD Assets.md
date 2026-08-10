# Relatório de Diagnóstico e Correção — IRR Card "No USD Assets" em Carteira com Ativos USD Reais

## Causa Raiz Diagnosticada (com Evidência Real)

O bug ocorria por duas causas combinadas na forma como a plataforma trata posições e transações:

1. **Ausência de Transação Explícita para Ativos da Watchlist em Modo Convidado / Dados Mock / Importação Simples de Posição (Causa Primária)**:
   - Componentes visuais como os cards de resumo e o gráfico "Invested vs. Received" utilizam uma regra de fallback em `cashflow.ts`: quando um ativo possui posição registrada na Watchlist (`quantity > 0` e `averagePrice > 0`), mas o histórico de transações explícitas (`transactions` em `useTransactions()`) ainda não possui registros para aquele ativo, o sistema calcula os fluxos de proventos projetados e realizados utilizando a quantidade cadastrada no item da Watchlist (`(item?.quantity ?? 0)`).
   - O `PortfolioIrrCard.tsx`, contudo, dependia **exclusivamente** da existência de objetos de transação explícitos na coleção `transactions` do Firestore/LocalStorage (`filteredTransactions.length === 0`).
   - Consequentemente, para uma carteira contendo ativos americanos (como `MSFT`, `O`, `VYM`, `JNJ`) cadastrados via Watchlist ou importação de posição sem histórico detalhado de compras passadas, `transactions` para USD retornava vazio (`[]`), acionando incorretamente o estado de estado vazio ("No USD assets in this portfolio").

2. **Variações de Formato de Ticker (Causa Secundária)**:
   - Em certos fluxos de importação, o ticker pode estar gravado sem sufixo `.SA` (ex: `PETR4` vs `PETR4.SA`) ou em minúsculas (`msft`), enquanto o mapa de moedas da Watchlist (`assetCurrenciesMap`) guarda o ticker em maiúsculas (`MSFT`).
   - A busca direta por chave `assetCurrencies[tx.ticker.toUpperCase()]` falhava quando havia inconsistência de sufixo ou formato entre a transação e o item da Watchlist.

---

## Solução Arquitetural Aplicada

Para resolver a causa raiz sem mascarar dados nem alterar registros do Firestore em produção:

1. **Geração de Transações Efetivas (`getEffectiveTransactions` em `src/lib/portfolioIrr.ts`)**:
   - Criada a função `getEffectiveTransactions(transactions, items)`.
   - Caso um ativo da Watchlist possua posição aberta (`quantity > 0`) mas não possua nenhuma transação explícita correspondente (verificado com e sem sufixo `.SA`), a função sintetiza temporariamente uma transação implícita de compra (`type: "buy"`) na data de início do investimento (`investingSince` ou `addedAt`) com a quantidade e preço médio do ativo.
   - Isso garante alinhamento 100% consistente entre os gráficos de Cashflow, Proventos Realizados e o Card de IRR.

2. **Normalização Robusta de Moeda por Ticker (`isUsdAsset` em `src/lib/portfolioIrr.ts`)**:
   - Criada a função `isUsdAsset(ticker, assetCurrencies)` que normaliza os tickers (remover `.SA`, `trim()`, `toUpperCase()`) e testa todas as variações contra o catálogo da carteira:
     - `assetCurrencies[normTicker]`
     - `assetCurrencies[normClean]`
     - `assetCurrencies["${normClean}.SA"]`
   - Preserva o fallback padrão para tickers sem sufixo `.SA` e fora da regex brasileira (`/^[A-Z]{4}\d{1,2}$/`).

3. **Integração em `PortfolioIrrCard.tsx` e `CashFlowCalendar.tsx`**:
   - `PortfolioIrrCard` agora processa `effectiveTransactions` via `getEffectiveTransactions(transactions, items)`.
   - `CashFlowCalendar` calcula proventos realizados utilizando o mesmo conjunto de transações efetivas, garantindo paridade total entre todos os cards da tela.

---

## Relatório de Migração de Dados em Produção

> [!NOTE]
> **Necessidade de migração de banco de dados no Firestore**: **NÃO É NECESSÁRIA**.
> A solução foi desenhada na camada de computação de domínio (`getEffectiveTransactions` e `isUsdAsset`), dispensando alterações retroativas nos documentos gravados no Firestore. Transações e itens gravados em produção continuam intactos e válidos.

---

## Validação dos Gates de Qualidade

1. **`npx tsc --noEmit`**: **0 erros** de compilação (Exit code 0).
2. **`npm run test`**: **173 passed** | 4 skipped (30 suítes de teste aprovadas, incluindo novo teste de regressão em `portfolioIrr.test.ts`).
3. **`npm run build`**: Bundle de produção Client & SSR compilados com sucesso.

---

## Novo Teste de Regressão Criado

Em `src/lib/__tests__/portfolioIrr.test.ts`:
- **Cenário**: Ativo USD `MSFT` na Watchlist com posição aberta (`quantity: 10`, `averagePrice: 400`), sem transações explícitas na lista `transactions`.
- **Verificação**:
  - `getEffectiveTransactions` gera a transação efetiva de compra em USD.
  - `isUsdAsset("msft", assetCurrencies)` classifica corretamente como USD mesmo para tickers em minúsculas ou sem `.SA`.
  - `buildCashFlowsFromPortfolio` gera cashflows em USD válidos e `calculateIrr` retorna a taxa anualizada correta sem acionar o estado de erro.
