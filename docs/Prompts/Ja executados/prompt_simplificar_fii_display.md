# PROMPT — Simplificação de Exibição: FII_INFRA/FIAGRO aparecem como "FII" no Frontend
> Copiar e colar no chat `[EXECUÇÃO]` do Antigravity.

## 🛑 MODO DE OPERAÇÃO
Modo de EXECUÇÃO. Decisão de produto já tomada por Paulo: o cálculo financeiro interno continua
distinguindo `FII`/`FII_INFRA`/`FIAGRO` (o spread de risco sobre a NTN-B no modelo Bazin é
diferente pra cada subtipo em `valuateFundoImobiliario`, `calculations.ts` — 2,5%/2,0%/3,0%
respectivamente, e isso **não muda**). O que muda é só a camada de exibição: em nenhum lugar da
interface o usuário deve ver ou poder escolher "FII-Infra"/"FIAGRO" — tudo aparece como "FII".
Sem usuários em produção hoje, então não há risco de migração de dado a considerar.

**Princípio orientador:** a inteligência de subtipo fica 100% no backend/classificação automática
(HG Brasil, heurística `classify.ts`) — o frontend nunca decide nem exibe o subtipo.

## ITEM 1 — Remover subtipos do dropdown manual de edição de tipo

**Arquivo:** `src/components/ceiling/AssetForm.tsx`

**Problema:** `ALL_TYPES` inclui `"FII_INFRA"` e `"FIAGRO"` como opções selecionáveis no dropdown
manual (`Select` renderizado quando o usuário clica em "Editar tipo").

**Plano:**
- Remover `"FII_INFRA"` e `"FIAGRO"` do array `ALL_TYPES`.
- **Comportamento aceito quando o usuário faz override manual:** se o usuário manualmente
  seleciona "FII" no dropdown (não deixa a auto-classificação decidir), o ativo passa a usar o
  spread padrão de FII (2,5%) no cálculo — isso é uma perda aceita de precisão apenas no caminho de
  override manual, não no caminho automático. Não tente preservar o subtipo nesse caso; é
  intencional que o override manual simplifique.

## ITEM 2 — Criar função de mapeamento de exibição (single source of truth)

**Arquivo:** `src/lib/formatters.ts` (ou `src/lib/domain.ts` — investigue qual já é o padrão do
projeto para funções de mapeamento de tipo antes de decidir o arquivo; `classify.ts` também é
candidato razoável já que lida com `AssetType`).

**Plano:**
- Criar `getDisplayAssetType(type: AssetType): AssetType`, que retorna `"FII"` quando o input for
  `"FII_INFRA"` ou `"FIAGRO"`, e retorna o próprio `type` inalterado em qualquer outro caso.
- Esta função é usada **apenas na camada de exibição** (para escolher qual chave de tradução
  buscar em `t.types[...]`, qual badge mostrar, qual filtro exibir) — nunca deve ser aplicada antes
  de passar o `type` pro motor de valuation (`getAssetValuation`) ou pra qualquer lógica de
  `realizedIncome.ts`/`fiiPaymentRules.ts`, que devem continuar recebendo o `type` real/preciso.

## ITEM 3 — Aplicar o mapeamento em todo consumidor de exibição de tipo

**Investigar e atualizar** (Rule 7 — confirme a lista completa antes de considerar concluído; esta
lista é o que já identifiquei, mas pode haver mais consumidores que não vi):

- `AssetForm.tsx` — o badge que mostra `t.types[activeType]` (não o dropdown, que já foi tratado no
  Item 1) deve usar `t.types[getDisplayAssetType(activeType)]`.
- Qualquer componente de card/tag de ativo que renderize `t.types[item.type]` diretamente (busque
  por `t.types[` no projeto inteiro — provavelmente aparece em componentes de watchlist, tabela de
  portfólio (`PortfolioTableV2.tsx`), radar, comparador, screener).
- Filtros de tipo de ativo na UI (ex.: `WatchlistFilterBar.tsx` se ele tiver filtro por tipo) —
  confirme se há necessidade de um filtro "FII" que agrupa os 3 tipos reais na consulta, ou se o
  filtro já opera sobre o campo bruto e precisa ser ajustado pra também casar `FII_INFRA`/`FIAGRO`
  quando o usuário filtra por "FII".
- `RiskRadar.tsx` (exposição por classe de ativo) — se ele agrupa por `type` bruto pra montar o
  gráfico de exposição, os 3 tipos devem ser somados sob um único grupo "FII" na exibição.
- `SmartAllocation.tsx` — mesma lógica se houver agrupamento/filtro visual por tipo.

**Não altere:** `classify.ts`, `classify.server.ts`, `hgBrasilClassification.server.ts`,
`calculations.ts`, `fiiPaymentRules.ts`, `realizedIncome.ts` — esses continuam operando com o tipo
real/preciso. Se durante a investigação você achar algum lugar onde não está claro se é "camada de
cálculo" (não mexer) ou "camada de exibição" (aplicar o mapeamento), pare e pergunte antes de
decidir sozinho.

## ITEM 4 — Testes

- Adicionar teste para `getDisplayAssetType` cobrindo os 3 casos (`FII` → `FII`, `FII_INFRA` →
  `FII`, `FIAGRO` → `FII`, e um tipo não-fundo como `STOCK_BR` → `STOCK_BR` inalterado).
- Adicionar/atualizar teste em `AssetForm.tsx` (ou equivalente) confirmando que o dropdown manual
  não lista mais `FII_INFRA`/`FIAGRO` como opções.
- **Não é necessário** criar teste novo pra `valuateFundoImobiliario` — o comportamento dele não
  muda neste prompt, os testes existentes que já cobrem os 3 spreads devem continuar passando sem
  alteração.

## Roles Governança (Rule 9)

| Role | Engajado? | Justificativa |
|---|---|---|
| fuente-architecture-review | SIM | Gate obrigatório — decisão explícita de manter inteligência de subtipo isolada no backend, camada de exibição separada |
| fuente-solution-architect | SIM | É decisão arquitetural real: single source of truth de mapeamento de exibição, evitando duplicar a lógica de "achatar tipo" em múltiplos componentes |
| fuente-ux-designer | SIM | Simplificação direta de UX — menos opção no formulário, menos ruído visual |
| fuente-investidor-iniciante | SIM | Menos categoria pra decidir = menos fricção cognitiva, alinhado ao perfil de investidor iniciante |
| fuente-advogado-lgpd-gdpr | NÃO | Sem dado pessoal envolvido |
| fuente-product-marketing | NÃO | Mudança interna de UX, sem impacto em posicionamento externo |
| fuente-investidor-profissional | NÃO | O rigor de cálculo é preservado integralmente no backend — nada muda pra esse perfil |

## Gates de Verificação (obrigatórios, output literal)

1. `npx tsc --noEmit`
2. `npm run test`
3. `npm run build`

Traga o diff completo (`git diff src/`), a lista final de todos os arquivos tocados no Item 3 (com
confirmação de que nenhum arquivo de cálculo/classificação foi alterado), e os 3 gates antes de eu
aprovar o commit.
