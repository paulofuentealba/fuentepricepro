# Design: Portfólio Global substituindo `/app/myportfolio`

**Data:** 2026-09-04
**Status:** Aprovado para plano de implementação
**Origem:** Protótipo interativo `fuente_price_pro_interactive_prototype (6).html`, seção "VIEW 2: PORTFÓLIO GLOBAL" (linhas 1294–1440), adaptado aos dados reais disponíveis no app.

## Contexto

`/app/myportfolio` hoje monta `FIProgressCard` + `Watchlist.tsx` — este último é uma interface grande e multifuncional (grid/tabela de ativos, dialogs de adicionar/editar, import CSV inline, FI wizard), além de conter o bloco `WatchlistKpiSection` (donut "Alocação por Tipo" + cards "Patrimônio Consolidado"/"Renda Passiva Projetada").

O protótipo propõe uma tela "Portfólio Global" mais enxuta e read-only: cards de custódia por corretora, um painel de decomposição cambial (ativo vs. câmbio) e uma tabela única de posições com colunas de performance e status de valuation.

Decisão do usuário: adotar essa estrutura **integralmente** para `/app/myportfolio`, mantendo apenas os 2 blocos herdados (donut + cards de patrimônio/renda) no topo, com edição de posição preservada via clique na linha (abre `AssetDetailSheet`, componente já existente e desacoplado).

## Gaps identificados e decisões de escopo

1. **Corretora (broker)**: não existe no modelo de dados hoje. Decisão: adicionar `broker?: string | null` em `WatchlistItem`, capturado automaticamente no import de nota (o parser já detecta a corretora via `SupportedBroker`, só não persiste) e manualmente no fluxo Add Asset / edição de posição. Ver seção "Modelo de dado" abaixo.
2. **Decomposição Cambial** (retorno do ativo em USD vs. ganho cambial): exige cotação do dólar na data de cada compra, dado não capturado hoje. Spike realizado confirmou que a HG Brasil (provedor já integrado) **ignora silenciosamente** o parâmetro `date` no endpoint de cotação — sempre retorna a cotação atual em cache, independente da data pedida (testado com 2015, 2020 e 2024, todas retornaram o mesmo valor). **Decisão: painel fora desta entrega.** Pesquisa de provedor alternativo (PTAX Banco Central, AwesomeAPI) foi delegada como tarefa separada (`task_188536ef`).

## Pareceres de arquitetura e UX (Regra 9 AGENTS.md)

- **fuente-solution-architect**: acoplamento 🟡 (fan-out ~7 arquivos, todos aditivos). `broker` vive na posição (`WatchlistItem`), não na transação — o modelo já trata `WatchlistItem` como registro único por ticker; segmentar por corretora dentro do mesmo ticker seria mudança de modelo maior, fora de escopo. Texto livre com sugestões (não enum fechado) — a lista `SupportedBroker` existe para detecção de layout de PDF, não é lista fechada de custódia (ex: "Avenue Securities" não tem parser mas é uma corretora real). Recomendação: prosseguir.
- **fuente-ux-designer**: aprovado com 3 ajustes — (1) tabela de posições precisa de comportamento mobile explícito via `responsive-table.tsx`, não scroll horizontal de 9 colunas; (2) cards de custódia devem agregar posições sem broker sob "Não informado" em vez de omitir (senão a soma visual não bate com o patrimônio total); (3) desenhar empty state dedicado, já que a tela perde os CTAs inline do `Watchlist.tsx` atual.
- **fuente-business-architect / fuente-product-marketing**: não se aplicam — consolidação de UI/dado existente, sem nova capacidade de negócio ou decisão de posicionamento.
- **fuente-product-manager**: não se aplica — priorização (corretora agora, câmbio depois) já decidida diretamente pelo usuário nesta conversa.
- **fuente-investidor-iniciante**: não se aplica — tela de gestão de carteira para usuário ativo, não fluxo de onboarding.
- **fuente-investidor-profissional**: coberto indiretamente pelo UX designer (StatusInvest é a régua desse perfil).
- **fuente-advogado-lgpd-gdpr**: campo novo (`broker`) é nome de instituição financeira, não é categoria sensível de dado pessoal, permanece no mesmo documento Firestore isolado por usuário — sem mudança material de superfície de dado pessoal.

## Arquitetura

### Arquivos novos
- `src/lib/brokers.ts` — promove `BROKER_LABELS`/`SupportedBroker` de `BrokerNoteImportPage.tsx` para módulo compartilhado (Regra 1: evitar duplicação).
- `src/components/portfolio/PortfolioSummaryHeader.tsx` — donut "Alocação por Tipo" + cards "Patrimônio Consolidado"/"Renda Passiva Projetada" (extraído de `WatchlistKpiSection.tsx`, sem o restante do bloco — USD/BRL breakdown e top/worst performer não migram).
- `src/components/portfolio/BrokerCustodyCards.tsx` — agrega `valuedItems` por `broker` (com bucket "Não informado" para `broker == null`).
- `src/components/portfolio/PortfolioPositionsTable.tsx` — tabela única (Ativo/Corretora/Qtd/Preço Médio/Cotação/Total/Lucro-Prejuízo/Yield on Cost/Status vs Teto), linha clicável abrindo `AssetDetailSheet`; colapsa para cards empilhados em mobile via `responsive-table.tsx`.
- `src/components/portfolio/PortfolioEmptyState.tsx` — estado vazio com CTAs para `/app/add-asset` e `/app/import-broker-note`.

### Arquivo reescrito
- `src/routes/app/myportfolio.tsx` — orquestra os 4 componentes acima + `AssetDetailSheet` (aberto via clique na linha da tabela).

### Arquivos alterados
- `src/lib/watchlist.ts` — adiciona `broker?: string | null` a `WatchlistItem`.
- `src/lib/dataIngestion/brokerNoteImport.ts` (`consolidateTradesToWatchlistItems`) — passa a receber e persistir o `detectedBroker` já identificado pelo parser.
- `src/components/portfolio/AddAssetPage.tsx` — novo campo "Corretora" (select com sugestões de `src/lib/brokers.ts` + opção de texto livre).
- `src/components/ceiling/watchlist/EditPositionFields.tsx` — mesmo campo, editável para backfill de posições antigas.

### Arquivos removidos (dead code, Regra 3 AGENTS.md)
- `src/components/ceiling/Watchlist.tsx` e subcomponentes de uso exclusivo dele (grid/toolbar/dialogs específicos de add-asset inline, csv importer inline, FI wizard inline) — confirmado que `Watchlist.tsx` só é importado por `myportfolio.tsx` hoje. O plano de implementação deve mapear exatamente quais subcomponentes ficam sem nenhum import ativo antes de apagar (alguns, como `AssetDetailSheet`, `AllocationChart`, `useWatchlist`, continuam em uso).

### Não alterados
- `AssetDetailSheet.tsx` — reaproveitado como está (já desacoplado do `WatchlistActionsContext`, recebe tudo via props).
- `useValuedPortfolio`, `AllocationChart`, `getAssetValuation` — consumidos, não modificados (SSOT preservado, Regra 4).

## Modelo de dado — `broker`

```typescript
// src/lib/watchlist.ts
interface WatchlistItem {
  // ...campos existentes
  broker?: string | null;
}

// src/lib/brokers.ts (novo)
export const KNOWN_BROKER_LABELS: Record<SupportedBroker, string> = { /* promovido de BrokerNoteImportPage.tsx */ };
```

Limitação aceita e documentada: se o mesmo ticker existir em duas corretoras, apenas uma fica registrada (a última definida manualmente ou detectada na importação mais recente) — o modelo atual já trata `WatchlistItem` como um registro único por ticker, independente de corretora.

## Componentes — detalhamento

### `PortfolioSummaryHeader`
Props: `{ valuedItems, totals, isLoading }`. Reaproveita `AllocationChart` internamente; layout dos 2 cards de patrimônio/renda idêntico ao já existente em `WatchlistKpiSection`.

### `BrokerCustodyCards`
Props: `{ valuedItems, currency, isLoading }`. Agrupa por `item.broker ?? "unassigned"`, soma valor de posição (`getPositionValue`) por grupo, exibe um card por corretora + card "Não informado" se houver posições sem broker.

### `PortfolioPositionsTable`
Props: `{ valuedItems, onSelectItem, isLoading }`. Colunas: Ativo, Corretora (ou "—"), Qtd, Preço Médio, Cotação Atual, Total Atual, Lucro/Prejuízo (valor + %), Yield on Cost, Status vs Teto (badge, reaproveitando o mesmo padrão de `computeRecommendedAction` já criado para a Dashboard). `onSelectItem` abre o `AssetDetailSheet` do componente pai.

### `PortfolioEmptyState`
Props: nenhuma (estático + links). Exibido quando `valuedItems.length === 0`.

## i18n

Textos novos em `src/lib/i18n/dict.ptBR.ts`/`dict.en.ts`/`dict.es.ts`, namespace `portfolio.*` (evitar colidir com `watchlist.*` existente, que continua em uso por outras telas até a limpeza de dead code confirmar o que sobra).

## Testes

- `src/lib/brokers.ts`: nenhum teste unitário necessário (é só um mapa estático).
- `BrokerCustodyCards`: teste unitário de agregação (fixtures com posições com/sem broker, confirma bucket "Não informado").
- `PortfolioPositionsTable`: teste de render com fixtures (estados loading/empty/populado), clique na linha chama `onSelectItem`.
- `consolidateTradesToWatchlistItems`: teste existente atualizado para verificar que `broker` é persistido a partir do `detectedBroker`.
- Teste de integração leve de `myportfolio.tsx` garantindo que os 4 blocos renderizam sem crash com portfólio vazio e populado.

## Riscos / pontos de atenção

- **Fan-out do campo `broker`** (🟡, 7 arquivos) — mitigado por ser aditivo em cada ponto, sem alterar lógica existente.
- **Dead code sweep de `Watchlist.tsx`**: precisa de varredura cuidadosa (ex: `ts-prune`/`knip`, já usados no projeto via `ecc:refactor-clean`) antes de apagar, para não remover subcomponente ainda referenciado por outra tela.
- **Posições antigas sem broker**: aceito como limitação conhecida, sem migração retroativa automática.
- **Painel de Decomposição Cambial**: adiado; task de pesquisa de provedor já em andamento separadamente.
