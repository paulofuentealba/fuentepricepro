# RESULTADO — 90 — Investigação: Fuente Consensus com Comportamento Suspeito (Bazin/Graham/Gordon)

**Modo:** investigação pura. `calculations.ts` e nenhum outro arquivo foram alterados nesta rodada.

## 1. Confirmação de SSOT — existe segunda implementação de consenso?

**Não.** Busca por `consensus`/`Consensus` em todo `src/` (17 arquivos) encontra **um único** ponto de cálculo: `src/lib/calculations.ts:421-431` (a mediana verdadeira já confirmada na leitura estática original). Todos os outros hits são apenas repasse do valor já calculado:
- `ConsensusPyramid.tsx:9,106-107` — renderiza `valuation.consensus` (prop), sem matemática própria.
- `ValuationRadar.tsx:16,31,42-43,119` — idem; só deriva `isSafeBuy`/margem de exibição a partir do valor recebido.
- `AssetDetailSheet.tsx:345-348,582-585`, `AssetCard.tsx:278,345-348` — repassam `valuation.graham/bazin/gordon/consensus` sem recalcular.
- `AssetComparator.tsx:253-256` — idem.

Nenhuma tela específica de FII/REIT, Cash Flow ou Radar tem fórmula própria de preço-teto. **Hipótese 2 do prompt (segunda implementação com `Math.min()`) descartada.**

## 2. A UI consome `getAssetValuation` de verdade?

Sim, confirmado pela cadeia completa: `useValuedPortfolio.tsx:80-87` chama `getAssetValuation({...})` diretamente (importado de `./calculations` na linha 6); o objeto `valuation` resultante (tipado como `ReturnType<typeof getAssetValuation>`) é anexado a cada linha da carteira e passado como prop por `AssetCard.tsx` → `ValuationRadar.tsx`/`AssetDetailSheet.tsx` → `ConsensusPyramid.tsx` — todos só renderizam campos já calculados. Não existe caminho alternativo.

## 3. `eps`/`bvps` para FIIs — de onde vêm, e fazem sentido conceitual?

Rastreado em `src/lib/api/brapi.server.ts:58-70`:
- `eps` = `res.earningsPerShare` (campo raiz da Brapi, "LPA"), com fallback para `res.defaultKeyStatistics.trailingEps`.
- `bvps` = `res.defaultKeyStatistics.bookValue` (sem fallback) — "VPA"/valor patrimonial por ação da Brapi.

**Nem `brapi.server.ts` nem `classify.server.ts` fazem qualquer distinção por `type` (ação vs. FII) antes de extrair esses campos** — são lidos de forma idêntica para qualquer ticker B3. O valor segue sem alteração por `buildWatchlistItem.ts:30-31` → `useValuedPortfolio.tsx:84-85` → `getAssetValuation`. Em `calculations.ts:400`, o Graham é calculado sempre que `eps > 0 && bvps > 0`, **sem nenhum guard de exclusão para `type === "FII"`** em nenhum ponto do pipeline.

**Fato, sem julgamento de modelagem (essa decisão fica com Paulo/role `fuente-investidor-profissional`):** os campos que a Brapi expõe (`earningsPerShare`, `defaultKeyStatistics.bookValue`) são os mesmos campos usados para ações — LPA e VPA no sentido tradicional de uma empresa — não um campo específico de fundo (ex: "Rendimento por Cota" ou "VP da Cota"). **Não foi possível verificar estaticamente se a Brapi de fato retorna esses campos populados (não-nulos) para tickers de FII** — não há fixture/amostra de resposta real de FII no repositório para confirmar; isso só é verificável com uma chamada real à API ou aos dados já salvos no Firestore.

## 4. Badge "Não aplicável a FIIs/REITs" — existe, mas não é reforçado no cálculo

Existe copy de wiki confirmando a preocupação de Paulo: `dict.en.ts:862-864` (`notApplicableBadge: "Not applicable to FIIs/REITs"`, `notApplicableReason: "Equity distortion and profit distribution obligations would invalidate the formula."`), espelhado em `dict.ptBR.ts:869-870` e `dict.es.ts:874-875`. Consumido em `src/routes/app/docs.tsx:175-186`, mas é um badge **estático** na página de metodologia (wiki), não condicionado ao tipo de um ativo específico sendo exibido — é copy educacional, não um aviso ao vivo por ativo.

**Isso contradiz diretamente o que o código faz:** a documentação afirma que Graham não deveria se aplicar a FIIs; `calculations.ts` nunca impõe essa regra — calcula Graham para qualquer ativo (FII incluso) sempre que `eps`/`bvps` estiverem presentes e positivos.

## Achado adicional (fora do escopo original, mas relevante)

O texto i18n do consenso também descreve incorretamente a fórmula: `dict.en.ts:78` ("Average of Graham, Bazin and Gordon valuation models.") e `dict.en.ts:849` ("By averaging Bazin, Graham, and Gordon...") — ambos dizem "média", mas `calculations.ts:421` implementa **mediana verdadeira**. Isso é só copy (não afeta o cálculo), mas explica uma parte do que Paulo observou: **quando há 2 modelos válidos, mediana de 2 valores É matematicamente uma média** — então "com 2 de 3 parece uma média" está certo e não é bug, é a definição matemática da mediana par se comportando exatamente como esperado.

## Reprodução com dado real (Item 2 do prompt) — não executada neste ambiente

**Não foi possível rodar a reprodução com 5 FIIs reais (3 métodos) + 5 FIIs reais (2 métodos) nesta rodada** — este ambiente de execução não tem acesso a credenciais do Firebase Admin SDK nem a uma sessão de usuário real com carteira populada para extrair `bazin`/`graham`/`gordon`/`eps`/`bvps` reais via `getAssetValuation`. A tabela pedida no formato de saída do prompt não pôde ser preenchida com dados reais.

**Ação pendente para Paulo:** rodar a reprodução (script standalone ou teste temporário chamando `getAssetValuation` com dados reais de 10 FIIs, via um ambiente com Firestore/Brapi configurados) para responder definitivamente se o "sempre repete o menor valor" com 3 métodos é (a) coincidência matemática legítima (os 3 valores calculados realmente ficam próximos/o menor bate com a mediana nesses ativos específicos) ou (b) sintoma de que `eps`/`bvps` da Brapi para FIIs retornam valores que distorcem o Graham para baixo, empurrando-o para ser sistematicamente o menor dos 3 e assim "carregando" a mediana para perto de si quando os outros dois ficam acima dele.

## Conclusões diretas (respondendo ao formato pedido)

1. **A UI está de fato consumindo `getAssetValuation`** — confirmado, sem segunda implementação (hipótese 2 descartada).
2. **Não foi possível confirmar com dado real se "repete o menor valor" é coincidência matemática ou sintoma da hipótese 3** — a fórmula da mediana está correta; a causa mais provável remanescente é a hipótese 3 (Graham usando `eps`/`bvps` que podem não ser conceitualmente válidos para FII), mas isso exige os dados reais do Item 2 (não executado aqui) para confirmar.
3. **O `eps`/`bvps` usado no Graham para FIIs vem dos mesmos campos que a Brapi usa para ações** (`earningsPerShare`, `defaultKeyStatistics.bookValue`) — não há nenhum campo específico de fundo nem nenhum guard por `type` no pipeline. Se esses campos vierem nulos da Brapi para FIIs, o Graham simplesmente não entra no consenso (comportamento seguro); se vierem com algum valor (mesmo que conceitualmente questionável), o Graham entra no consenso como se fosse uma ação normal — **decisão de modelagem financeira reservada a Paulo, não decidida aqui.**

## Proibições respeitadas
`calculations.ts` e nenhuma fórmula foram alterados. Nenhuma mudança de comportamento do Graham para FIIs foi feita — a questão de modelagem do item 3 permanece em aberto para decisão explícita de Paulo.
