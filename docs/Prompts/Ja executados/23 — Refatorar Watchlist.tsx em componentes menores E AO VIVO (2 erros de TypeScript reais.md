### 23 — Refatorar Watchlist.tsx em componentes menores ✅ CONCLUÍDO E CONFIRMADO AO VIVO (2 erros de TypeScript reais encontrados e corrigidos: tipo errado de typeFilters/counts no WatchlistToolbar, chave i18n inexistente no AddAssetDropdown; mais 1 regressão visual corrigida: botão Restore Mock Data sumindo do estado vazio da carteira)

```
23 — Refatorar Watchlist.tsx em componentes menores

Contexto: Watchlist.tsx (src/components/ceiling/Watchlist.tsx) é o maior
arquivo do projeto e o que mais quebrou ao longo de toda essa auditoria:
import duplicado do MetricBox, tipo editing/detail mal tipado, bug do
OppFilter, e o cálculo duplicado da Tarefa 14.3 (que causava a grade de
ativos vazia). Concentra hoje, num único componente: KPIs herói (net worth,
renda consolidada, top/worst performer), gráfico de alocação, barra de
filtros + toolbar de ações, grid/lista de ativos, e orquestração de 5
diálogos. Além disso, o dropdown "+ Add Asset" (Add Equity / Add Fixed
Income / Import Broker Note) está DUPLICADO no arquivo — uma cópia dentro
do card de estado vazio (quando items.length === 0) e outra na toolbar
principal, violando a Golden Rule 1 (reusabilidade).

TAREFA: extrair 5 componentes novos em src/components/ceiling/watchlist/,
cada um com responsabilidade única. Watchlist.tsx continua sendo o dono do
estado (useState) e do useValuedPortfolio() — os componentes novos recebem
tudo via props, não buscam dados por conta própria.

1. AddAssetDropdown.tsx
   Extrai o dropdown "+ Add Asset" (as 3 opções: Add Equity, Add Fixed
   Income, Import Broker Note) num componente único e reutilizável,
   substituindo as DUAS cópias hoje existentes no arquivo (a do card de
   estado vazio e a da toolbar principal).
   Props: onNavigateToScreener, onOpenFIWizard, onOpenBrokerUploader, e um
   variant opcional (ex: "compact" | "default") apenas se o estilo do
   botão realmente precisar diferir entre os dois locais — se o visual for
   idêntico nos dois usos, nem precisa de variant, um único componente
   basta.

2. WatchlistKpiSection.tsx
   Extrai: o bloco "mb-4 grid gap-3 lg:grid-cols-2" inteiro — AllocationChart,
   NextPaymentBanner, card de Patrimônio Consolidado, e o grid de MetricBox
   (renda consolidada, USD/BRL, top/worst performer).
   Props: valuedItems, meta, totals, locale, typeFilter, onSelectType,
   topAndWorst (JÁ CALCULADO pelo pai, não recalcular aqui).
   ATENÇÃO CRÍTICA: o cálculo de `topAndWorst` (best/worst performer) deve
   continuar sendo feito UMA ÚNICA VEZ no Watchlist.tsx (ou num hook
   compartilhado) e passado como prop pronto para este componente — nunca
   recalculado de forma independente dentro dele. Essa duplicação de
   cálculo é exatamente o bug que causou a Tarefa 14.3 (grade vazia por
   cálculo duplicado divergente do useValuedPortfolio). Mesma regra vale
   pro contextStats usado no aviso "over/under valued" logo abaixo.

3. WatchlistToolbar.tsx
   Extrai: o bloco "flex flex-col sm:flex-row items-start... mb-4" —
   WatchlistFilterBar, o AddAssetDropdown (componente novo do passo 1),
   DataManagement, e os botões de toggle grid/tabela.
   Props: typeFilters, counts, typeFilter, oppFilter, sortOption, os 3
   setters correspondentes, viewMode, setViewMode, e os mesmos callbacks
   onNavigateToScreener/onOpenFIWizard/onOpenBrokerUploader repassados pro
   AddAssetDropdown.

4. WatchlistAssetGrid.tsx
   Extrai: o bloco condicional que decide entre "nenhum ativo encontrado
   após filtro" / grid de AssetCard / WatchlistTable.
   Props: filteredAndSorted, valuedItemsLength (pra distinguir "vazio por
   filtro" de "vazio de verdade"), quotes, meta, viewMode, onEdit, onRemove,
   onOpenDetail, onClearFilters.

5. WatchlistDialogs.tsx
   Extrai: os 5 diálogos no fim do JSX — EditItemDialog, AssetDetailSheet,
   PaywallDialog, FixedIncomeWizardSheet, BrokerNoteUploader.
   Props: editing, detail, showPaywall, showFIWizard, showBrokerNoteUploader
   e todos os handlers de close/save correspondentes (onCloseDialog, onSave,
   onCloseDetail, onPaywallOpenChange, onFIWizardOpenChange,
   onBrokerUploaderOpenChange). Este componente é puramente apresentacional
   — todo o estado continua no Watchlist.tsx.

Além disso, atualizar o card de estado vazio (items.length === 0) pra usar
o AddAssetDropdown novo em vez de manter sua cópia própria do dropdown.

NÃO TOCAR:
- Nenhuma lógica de negócio muda — nem cálculo de valuation, nem filtros,
  nem ordenação. É refatoração pura de estrutura/apresentação.
- Não alterar as props/assinaturas de AssetCard, WatchlistTable,
  WatchlistFilterBar, AllocationChart — só como eles são chamados a partir
  do novo local.
- O bloco de "empty state total" (card tracejado "Comece adicionando um
  ativo") pode continuar dentro do Watchlist.tsx — só o dropdown interno
  dele precisa virar o AddAssetDropdown compartilhado, o resto do card não
  precisa ser extraído.

CRITÉRIO DE SUCESSO:
- Watchlist.tsx vira um componente "casca" que só monta estado + os 5
  componentes novos, nenhuma mudança visual.
- O dropdown "+ Add Asset" não existe mais duplicado no código-fonte — só
  uma implementação, usada nos dois locais.
- tsc limpo, testes passando.
- Confirmar ao vivo no navegador (não só compilação): grid de ativos
  renderiza igual a antes, alternância grid/tabela funciona, filtros e
  ordenação funcionam, abrir e salvar o diálogo de edição funciona, abrir o
  sheet de detalhe funciona, dropdown "+ Add Asset" com as 3 opções
  continua funcionando tanto no estado vazio quanto na toolbar principal,
  top/worst performer e KPIs mostram os mesmos valores de antes da
  refatoração.
```

---