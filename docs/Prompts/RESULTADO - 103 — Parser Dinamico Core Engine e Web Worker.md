# RESULTADO — 103 — Parser Dinâmico: Core Engine & Web Worker

## 1. Contexto e Objetivos
- **Objetivo**: Construir a biblioteca de parsing pura (`src/lib/dynamicCsvParser.ts`) e o Web Worker (`src/workers/importParser.worker.ts`) para ingestão client-side de arquivos `.csv`, `.tsv`, `.xls` e `.xlsx` com zero custo de servidor e 100% de conformidade com a LGPD.
- **Dependência**: Instalada a biblioteca `xlsx` (SheetJS) com suporte nativo a planilhas Excel e CSV.

## 2. Ações Realizadas

### 2.1 Tabela Canônica de Aliases (`COLUMN_SEMANTIC_ALIASES`)
Conforme a diretriz do Prompt 103, a primeira entrada de cada categoria é o **cabeçalho canônico do nosso próprio export** (Prompt 105), e as demais são os aliases heurísticos de corretoras de terceiros:

| Categoria | Cabeçalho Canônico (Export) | Aliases Reconhecidos (Import Terceiros) |
| :--- | :--- | :--- |
| `ticker` | **Ticker** | Ativo, Papel, Código, Instrumento, Símbolo, Cod Negociação, Especificação do Ativo, Descrição, Asset, Symbol |
| `operationType` | **Tipo** | Operação, C/V, Natureza, Tipo Operação, Movimentação, Compra/Venda, Sentido, Side, Type, Operation |
| `quantity` | **Quantidade** | Qtd, Qtde, Volume, Posição, Shares, Quantity, Qty |
| `price` | **Preço** | Valor, PU, Preço Unitário, Valor Unitário, Cotação, Preço Médio, Price, UnitPrice, AvgPrice |
| `costs` | **Taxas** | Custos, Corretagem, Emolumentos, ISS, Total Taxas, Taxas B3, Taxas Liquidadas, Costs, Fees, Commission |
| `date` | **Data** | Data Pregão, Data Operação, Data Negociação, Data Liquidação, Negociação, Trade Date, Date |

### 2.2 Funções Puras do Motor (`dynamicCsvParser.ts`)
- `normalizeHeader`: Normalização robusta removendo acentuações, pontuações, espaços e notas parentéticas de moeda como `(R$)`.
- `matchColumn`: Algoritmo em 3 camadas de confiança:
  - **Tier 1 (Exact)**: Correspondência com cabeçalhos canônicos da plataforma.
  - **Tier 2 (Alias)**: Correspondência exata com termos de mercado conhecidos.
  - **Tier 3 (Substring)**: Correspondência por contenção semântica.
- `parseOperationType`: Reconhecimento de compras e vendas com fallback documentado para `"BUY"` (`isFallback: true`).
- `parseNumericValue`: Detecção automática de notação BR (`1.250,50`) vs. US (`1,250.50`), remoção de prefixos monetários (`R$`, `$`, `USD`, `BRL`).
- `parseDateValue`: Suporte a `DD/MM/YYYY`, `YYYY-MM-DD`, `MM/DD/YYYY` e números seriais de data do Excel (com tratamento agnóstico de fuso horário UTC).
- `isSupportedAsset`: Validação de ativos que descarta opções (ex: `PETRL300`), contratos futuros (`WIN...`, `WDO...`) e criptoativos avulsos (`BTC`), permitindo ativos B3, BDRs, ETFs e US Stocks.
- `parseFile`: Orquestrador em lote que retorna `{ transactions, ignored, columnMapping, headers, totalRows }`.

### 2.3 Web Worker Client-Side (`src/workers/importParser.worker.ts`)
- Executa a leitura via `XLSX.read` em thread isolada.
- Emite progresso incremental (`type: "PROGRESS"`) e mensagens formatadas para a interface.

### 2.4 Declaração de Risco e Compatibilidade com `classifyBr()`
- **Avaliação**: `isSupportedAsset()` foi configurado de forma permissiva para não rejeitar nenhum ticker válido suportado por `classifyBr()`. O filtro rejeita estritamente derivativos/opções (4 letras + série A-X + números), futuros (prefixos WIN/WDO/IND/DOL) e criptomoedas diretas. Tickers com 2 a 8 caracteres alfanuméricos são aceitos, mantendo 100% de coerência com o restante do sistema.

### 2.5 Fixtures e Testes Automatizados
- Criadas 3 fixtures reais em `src/lib/__tests__/fixtures/`:
  1. `corretora_br_semicolon.csv` (formato B3 com `;`, vírgula decimal e opção descartada `PETRL300`).
  2. `corretora_us_comma.csv` (formato US com `,`, ponto decimal e cripto descartada `BTC`).
  3. `planilha_caseira_pt.csv` (formato coloquial com "Papel", "Qtd", "Preço Pago" e futuro descartado `WINJ24`).
- Criada a suíte `src/lib/__tests__/dynamicCsvParser.test.ts` com 23 testes unitários e de integração (todos passando em 9ms).

## 3. Gates de Verificação
- `npx tsc --noEmit`: 0 erros
- `npx vitest run src/lib/__tests__/dynamicCsvParser.test.ts`: 23 testes passando
- `npm test`: 54 arquivos / 375 testes passando
- Commit: `8791355` — `feat(import): implement dynamic spreadsheet parser engine and web worker [Prompt 103]`
