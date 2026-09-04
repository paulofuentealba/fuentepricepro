# Design: Peter Lynch para STOCK_BR + pirâmide de consenso em losango (4 métodos)

**Data:** 2026-09-04
**Status:** Aprovado para plano de implementação

## Contexto

O Fuente Consensus usa mediana de métodos de valuation por classe de ativo. Hoje:

| Classe     | Bazin | Graham | Gordon | Lynch |
|------------|:-----:|:------:|:------:|:-----:|
| STOCK_US   | ✅    | ❌ (null, mas "graham" carrega o Lynch por compat) | ✅ | ✅ |
| STOCK_BR   | ✅    | ✅     | ✅     | ❌ (não existe) |
| FII        | ✅    | ❌ (proibido) | ✅ | ❌ (não existe) |
| REIT       | ✅    | ❌ (proibido) | ✅ | ❌ (não existe) |
| ETF        | ✅    | ❌ (proibido) | ❌ (proibido) | ❌ (não existe) |

Dois problemas motivam esta mudança:

1. **Lacuna real**: STOCK_BR tem EPS/LPA disponível (mesma base de dados que Graham já usa) mas não calcula Lynch. É o único caso onde adicionar um 4º método faz sentido financeiro imediato.
2. **Dívida técnica de rotulagem**: em STOCK_US, o valor do Lynch é hoje empurrado para dentro do campo `graham` "por compatibilidade retroativa" (comentário em `calculations.ts:453-456`). Isso significa que a UI atual, ao ler `.graham` para STOCK_US, está na verdade mostrando o Lynch rotulado como Graham — um bug de rotulagem silencioso.

O usuário quer os 4 modelos (Bazin, Graham, Gordon, Lynch) considerados para todas as classes de ativo, com explicação textual nos casos em que um modelo não se aplica estruturalmente, e quer isso visível na pirâmide de consenso (`ConsensusPyramid`), hoje fixa em 3 vértices (triângulo).

## Por que Graham e Lynch não fazem sentido para FII, REIT e ETF

Graham (`√(22,5 × LPA × VPA)`) e Lynch (`LPA × (crescimento + dividend yield)`) dependem estruturalmente de **LPA (lucro por ação/cota)** — uma métrica de lucro contábil de empresa operacional.

- **FIIs e REITs** são veículos de propriedade de ativos (imóveis), não empresas operacionais no sentido societário: não reportam LPA da forma que uma ação faz. O código já proíbe Graham explicitamente para essas classes (`graham: null, // Corporate Graham explicitly forbidden for funds/REITs`); o mesmo racional se aplica a Lynch.
- **ETFs** são cestas de ativos (replicam um índice ou uma estratégia); não têm lucro por cota algum — o próprio Gordon já é proibido para ETFs pelo mesmo motivo.

Conclusão: para essas 3 classes, Graham e Lynch continuam `null` — mas cada `null` ganha um comentário/tooltip explicando o motivo estrutural, em vez de simplesmente omitir. Não haverá tentativa de criar um "proxy" (ex: FFO por cota) porque isso forçaria um modelo em um contexto onde ele não tem fundamento financeiro — decisão já validada com o usuário.

## Mudanças de dados (`src/lib/calculations.ts`)

### 1. `valuateStockBR` — adicionar Lynch
- Reutilizar a mesma fórmula de Lynch modificado já usada em `valuateStockUS` (linha ~708-714): `lynchMultiplier = clamp(effectiveGrowth + dividendYield, 5, 25)`, `lynchPrice = eps * lynchMultiplier`.
- Usar os inputs de crescimento/dividendos já disponíveis para STOCK_BR (mesmos usados por Gordon: `dividendCagr`/`roe`/`payoutRatio` conforme já calculado nessa função).
- Incluir no consenso: `medianConsensus([bazin, graham, gordon, lynch])`.
- Popular `methods.lynch` e o novo campo de topo `lynch` (ver tipo abaixo).

### 2. `valuateStockUS` — corrigir rotulagem
- `graham` (campo de topo e `methods.graham`) passa a ser sempre `null` (não há modelo Graham para US).
- `lynch` (campo de topo, novo) recebe `lynchPrice`. `methods.lynch` já existe no tipo — apenas passa a ser a única fonte de verdade.
- Remover o comentário `// backward compat: STOCK_US has no Graham LPA/VPA model, see lynch` e a atribuição correspondente.

### 3. `ValuationResult` (tipo)
```ts
export interface ValuationResult {
  // ...
  methods: {
    bazin: number | null;
    graham: number | null;
    gordon: number | null;
    lynch?: number | null; // já existe — deixa de ser opcional "extra" e vira populado também para STOCK_BR
    shareholderYield?: number | null;
    affoYield?: number | null;
    bogleModel?: number | null;
  };
  // Backward compatibility fields for existing UI consumers
  bazin: number | null;
  graham: number | null;
  gordon: number | null;
  lynch: number | null; // NOVO campo de topo, mesmo padrão de bazin/graham/gordon
  // ...
}
```

### 4. FII / REIT / ETF
- Nenhuma mudança de cálculo. Apenas garantir que os comentários explicativos de `graham: null` existentes sejam espelhados para `lynch: null` (novo campo), com o mesmo motivo.

### 5. Consumidores de `.graham` que hoje leem o valor do Lynch de STOCK_US
Arquivos a revisar e ajustar para ler `.lynch` quando a intenção é Lynch (verificar cada um individualmente durante a implementação, pois alguns podem já não depender de STOCK_US especificamente):
- `src/components/ceiling/AssetComparator.tsx`
- `src/components/shared/AssetCard.tsx`
- `src/components/ui/ValuationRadar.tsx`
- `src/components/portfolio/AddAssetPage.tsx`
- `src/components/ceiling/watchlist/TransactionsPanel.tsx`
- `src/components/guides/GuidesPage.tsx`

## Mudança visual (`ConsensusPyramid.tsx`)

### Layout: losango (diamante) dinâmico
- Vértices possíveis: topo, esquerda, direita, baixo — em vez do triângulo fixo atual (topo + 2 vértices na base).
- O componente recebe a lista de métodos aplicáveis àquela classe de ativo (os que têm valor OU são estruturalmente aplicáveis mas nulos por falta de dado pontual) e distribui nos 4 slots do losango. Quando a classe só tem 3 métodos aplicáveis (FII, REIT, ETF), usa-se apenas 3 dos 4 slots (o layout de triângulo atual dentro do losango, mantendo a estética existente).
- Métodos **estruturalmente inaplicáveis** (ex: Graham/Lynch para FII/REIT/ETF) não geram vértice — não aparecem no losango, nem como "N/A".
- Métodos aplicáveis mas nulos por dado faltante pontualmente mantêm o vértice esmaecido com "N/A" + tooltip explicativo, como já funciona hoje.
- O SVG de conexão (`<polygon>` + linhas internas) passa a ser gerado dinamicamente a partir da lista de vértices ativos, em vez de coordenadas fixas para 3 pontos.

### Novo tooltip/sheet para Lynch
- Mesma estrutura de `bazinTooltip`/`grahamTooltip`/`gordonTooltip`: monta a partir de `methodDetails.lynch` (novo, com formula/growth/dividendYield/source/date) ou cai no fallback `t.tooltips?.lynch`.
- Novo `MethodDetailSheet` para mobile, espelhando os existentes.
- Novo tooltip "não aplicável" (`t.tooltips?.lynchNotApplicable`) para quando Lynch existe estruturalmente mas está nulo por falta de dado (não usado para FII/REIT/ETF, que nem mostram o vértice).

## i18n
Adicionar em `dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` (grupo `tooltips` e `valuationAssumptions`):
- `lynch`, `lynchNotApplicable`
- `lynchTooltipTitle`, `lynchTooltipFormula`, `lynchTooltipGrowth`, `lynchTooltipDividendYield`, `lynchTooltipSource`

## Testes
- `src/lib/__tests__/calculations_stock_br.test.ts`: novo caso cobrindo o cálculo de Lynch e sua entrada na mediana do consenso.
- `src/lib/__tests__/calculations_stock_us.test.ts`: ajustar expectativas que hoje leem `.graham` esperando o valor do Lynch — devem passar a ler `.lynch`, e `.graham` deve ser `null`.
- `src/components/ceiling/watchlist/__tests__/ConsensusPyramid.test.tsx`: novo caso para 4 vértices (STOCK_BR/US) e manter cobertura do caso de 3 vértices (FII/REIT/ETF).
- Revisar `src/lib/audit/__tests__/buildDecisionLog.test.ts` e outros testes que montem `ValuationResult` mockado, caso dependam do campo `.graham` carregando Lynch.

## Fora de escopo
- Nenhum proxy/adaptação de Graham ou Lynch para FII/REIT/ETF (decisão já validada).
- Nenhuma mudança na fórmula de Bazin ou Gordon.
- Nenhuma mudança em ETF (permanece com 2 métodos: Bazin + Bogle).
