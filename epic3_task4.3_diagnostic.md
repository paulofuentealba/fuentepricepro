# Diagnóstico da Divergência de Dados (BBAS3)

A investigação sobre as discrepâncias de `eps`, `bvps` e `dividendCagr5y` para o mesmo ativo (ex: BBAS3) entre as visualizações "Meu Portfólio" e "Radar Global" revelou o seguinte:

## Origem dos Dados (Metadados vs. Cotação)

1. **Radar Global (`fetchRadarFn`)**:
   - Ao varrer os tickers (como `BBAS3`), a função consulta a API da **Brapi** (`fetchFromBrapi`).
   - O objeto retornado contém o `currentPrice` e os metadados (`pbRatio`, `eps`, `dividendCagr5y`) **capturados no exato mesmo momento pela Brapi**.
   - O cálculo do Valor Patrimonial por Ação (`bvps`) é feito como: `Brapi currentPrice / Brapi pbRatio`.
   - Resultado: Consistência interna perfeita, pois o preço e os múltiplos pertencem ao mesmo "snapshot" de tempo da Brapi.

2. **Meu Portfólio (`useLiveQuotesAndMeta.ts`)**:
   - Para exibir os dados ricos na Watchlist, são feitas duas requisições paralelas:
     - `fetchAssetFn` (Metadados): Consulta a **Brapi** para obter `pbRatio`, `eps`, `dividendCagr5y` (idêntico ao Radar).
     - `fetchQuoteFn` (Cotação Live): Consulta o **Yahoo Finance** (`fetchYahooQuote`) para obter a cotação em tempo real (`currentPrice`).
   - O cálculo do Valor Patrimonial por Ação (`bvps`) é feito como: `Yahoo currentPrice / Brapi pbRatio`.
   - **Resultado (A Divergência)**: Como o preço em tempo real do Yahoo difere do preço da Brapi (que pode estar defasado ou ser de fechamento), o cálculo do `bvps` diverge daquele visto no Radar. Os valores estáticos de `eps` e `dividendCagr5y` em si são idênticos, mas qualquer métrica que cruze _Preço x Metadados_ ficará diferente entre as telas.

## Conclusão

A causa raiz não é um erro de cálculo nem de código, mas sim uma **diferença de timing e de fonte entre a cotação e o P/B ratio**.
No Portfólio, privilegiou-se a cotação super-atualizada do Yahoo Finance, o que distorce levemente a matemática reversa do P/B Ratio que foi gerada com a cotação passada da Brapi.

Para alinhar completamente as métricas no futuro (se desejado), o Portfólio precisaria recalcular o `pbRatio` ao vivo usando o preço do Yahoo (o que exigiria obter o BVPS isolado, não o P/B) ou o Radar precisaria consultar os preços do Yahoo além de chamar a Brapi, o que degradaria a performance da tela de Radar que consulta dezenas de ativos de uma vez. No momento, trata-se de um trade-off arquitetural aceitável.
