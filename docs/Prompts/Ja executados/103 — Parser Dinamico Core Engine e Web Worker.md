# PROMPT 103 — Parser Dinâmico: Core Engine & Web Worker
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Fase 1 de 3 (ver `RESULTADO - 102 — Discovery Parser Dinamico Import CSV-XLSX.md`
> para o desenho completo já aprovado). Este prompt só constrói o motor
> de parsing — sem UI ainda (Prompt 104) e sem integração com carteira
> (Prompt 105).

---

## Contexto e Decisão Já Tomada

Discovery do Prompt 102 aprovado: parsing 100% client-side via Web
Worker (privacidade LGPD — dado financeiro nunca sai do dispositivo,
zero custo de servidor). Esta fase constrói:
1. A lib de parsing pura (`src/lib/dynamicCsvParser.ts`).
2. O Web Worker que a executa em background
   (`src/workers/importParser.worker.ts`).
3. Testes com fixtures de arquivos reais de múltiplas corretoras.

**Decisão adicional, tomada nesta conversa (não estava no discovery
original):** os cabeçalhos canônicos que este parser reconhece via
correspondência EXATA (primeira e mais confiável camada do algoritmo,
antes de qualquer heurística/fuzzy matching) devem ser os mesmos que o
**nosso próprio export** vai usar (Prompt 105, que absorve o Item 3
pendente do Prompt 98). Ou seja: o dicionário de aliases não é só
"o que reconhecemos de terceiros" — a primeira entrada de cada
categoria em `COLUMN_SEMANTIC_ALIASES` é, por definição, o cabeçalho
que nosso export vai gerar. Ter isso em mente ao definir a ordem dos
aliases dentro de cada array (o primeiro item da lista deve ser o
nome canônico "nosso", os demais são os aliases de terceiros).

## Tarefas

### 1. Instalar dependência de planilha
- Adicionar `xlsx` (SheetJS) ao `package.json` — biblioteca já
  recomendada no discovery. Confirmar licença compatível (Apache 2.0)
  antes de instalar.
- Não adicionar `papaparse` também só para CSV — avaliar se `xlsx`
  sozinho já lida bem com CSV (SheetJS lê CSV nativamente) antes de
  duplicar dependência para o mesmo propósito (Regra 1).

### 2. `src/lib/dynamicCsvParser.ts` — funções puras, testáveis sem DOM/Worker

Seguindo a estrutura do discovery (Seção 3):

- `COLUMN_SEMANTIC_ALIASES`: dicionário de aliases por categoria
  (`ticker`, `operationType`, `quantity`, `price`, `costs`, `date`),
  com o primeiro item de cada array sendo o cabeçalho canônico do
  nosso export (ver Decisão acima).
- `normalizeHeader(header: string): string` — remove acento, espaço,
  pontuação, lowercase.
- `matchColumn(normalizedHeaders: string[]): ColumnMapping` — algoritmo
  de matching em 3 camadas: exato → alias/sinônimo → substring.
  Retornar também um `confidence` por coluna mapeada (exato = alta,
  substring = baixa) — a UI do Prompt 104 vai precisar disso para
  mostrar ao usuário quais colunas foram identificadas com certeza vs.
  quais merecem revisão manual.
- `parseOperationType(raw: string): "BUY" | "SELL"` — conforme Seção
  3.2 do discovery, com fallback documentado para `"BUY"` quando a
  coluna não existe (retornar também um flag indicando que foi
  fallback, não valor real do arquivo, para o log humanizado poder
  avisar o usuário).
- `parseNumericValue(raw: string): number | null` — detecção BR vs.
  internacional (Seção 3.3), limpeza de símbolo monetário. Retornar
  `null` (não lançar exceção) para valores não parseáveis — quem
  chama decide se isso vira "linha ignorada" ou erro bloqueante.
- `parseDateValue(raw: string | number): Date | null` — suportar os 4
  formatos da Seção 3.4, incluindo serial numérico do Excel. Mesma
  regra: `null` em vez de exceção para entrada inválida.
- `isSupportedAsset(ticker: string): boolean` — reaproveitar
  `classifyBr()`/`isBrTicker()` de `src/lib/classify.ts` (Regra 1, já
  existe, não duplicar heurística de ticker) mais uma checagem
  adicional de padrão para descartar opções (ex: sufixos numéricos
  fora do padrão B3 conhecido) e futuros — documentar exatamente quais
  padrões são tratados como "não suportado" vs "não reconhecido, mas
  tentamos mesmo assim" (ver risco abaixo).
- `parseFile(rows: unknown[][], headers: string[]): ParseResult` —
  função orquestradora pura (recebe dados já extraídos da planilha,
  não lida com File/ArrayBuffer diretamente — isso fica no Worker),
  retorna `{ transactions: ParsedTransaction[], ignored: IgnoredRow[] }`.

**Risco a declarar explicitamente no relatório, não decidir sozinho:**
a lista de "sufixos B3 suportados" do discovery (Seção 4.1) é uma
heurística nova, não a mesma usada por `classifyBr()` hoje (que é mais
permissiva — qualquer coisa terminando em `11` sem estar na lista de
stock units vira FII, por exemplo). Se este parser aplicar uma
validação mais restritiva que `classifyBr()`, pode haver ativo que o
resto do sistema aceita mas o importador rejeita. Reportar essa
divergência se ela existir, não resolver silenciosamente.

### 3. `src/workers/importParser.worker.ts`
- Recebe `ArrayBuffer`/`File` via `postMessage`, usa `xlsx` para
  extrair `rows`/`headers`, chama `parseFile()` de `dynamicCsvParser.ts`.
- Emite progresso incremental via `postMessage` a cada N linhas
  processadas (não a cada linha individual se o arquivo for grande —
  throttle razoável, ex: a cada 1% ou a cada 50 linhas, o que for
  maior) — streaming real de progresso, não um único `postMessage` no
  final.
- Emite mensagem final com o resultado completo (`ParseResult`).

### 4. Testes com fixtures reais
- Criar fixtures de teste (`src/lib/__tests__/fixtures/`) simulando
  extratos de pelo menos: 1 corretora BR com formato de vírgula
  decimal e `;` como separador, 1 corretora US com ponto decimal e `,`
  como separador, 1 planilha "caseira" com nomes de coluna em
  português coloquial (ex: "Papel", "Qtd", "Preço Pago") — não precisa
  ser o layout exato de uma corretora real específica (evitar
  reproduzir formato proprietário sem necessidade), só representativo
  o suficiente para exercitar o matching heurístico.
- Testes unitários cobrindo cada função pura de `dynamicCsvParser.ts`
  isoladamente, mais um teste de integração rodando `parseFile()`
  contra cada fixture completa.
- Teste explícito de ativo não suportado (cripto, opção) sendo
  corretamente movido para `ignored`, sem interromper o parse do
  resto do arquivo.

## Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (novos testes de
  `dynamicCsvParser`), `npm run build`.
- Reportar a tabela de aliases final (`COLUMN_SEMANTIC_ALIASES`)
  completa no relatório de execução, já que o Prompt 105 (export) vai
  depender dela.
- Reportar a divergência entre a validação de ativo suportado deste
  parser vs. `classifyBr()`, se houver (ver Risco acima).

## Proibido
- Não construir nenhuma UI nesta rodada — isso é Prompt 104.
- Não integrar com `useTransactions`/`useWatchlist` ainda — isso é
  Prompt 105. O resultado do parser fica em memória, sem gravar nada.
- Não decidir sozinho a lista final de "sufixos B3 suportados" se ela
  divergir de `classifyBr()` — reportar e seguir com a mais permissiva
  (a de `classifyBr()`) como padrão, salvo instrução contrária.
