# PROMPT 98 — Backlog da Auditoria de Verificação (Tokens CSS, CTA de Meta, Export CSV, Sticky Column)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

4 itens independentes, execução em ordem de prioridade (não misturar
diffs). Cada item tem gate de saída próprio.

---

## ITEM 1 (🔴 Prioridade Alta) — Tokens CSS Ausentes no Cash Flow Chart

**Contexto:** Achado do Prompt 97 (item 2.3): `CashFlowChart.tsx:29,30`
referencia `var(--projected)` e `var(--chart-grid)`, que **não existem**
em `src/styles.css` — confirmado ao vivo que a linha de grade do
gráfico renderiza com `stroke: none` (invisível). Não é questão de
paleta/contraste — é token indefinido quebrando a renderização.

**Tarefa:**
- Adicionar os 2 tokens ausentes em `src/styles.css`, seguindo
  exatamente o padrão já usado pelos tokens existentes (ex: `--chart-1`
  a `--chart-5`, `--success`, `--comparison`, `--realized`):
  1. Definir em `:root` (valor claro) e em `.dark` (valor escuro),
     ambos em formato `oklch(...)`.
  2. Registrar em `@theme inline` como
     `--color-projected: var(--projected)` e
     `--color-chart-grid: var(--chart-grid)`.
- Escolha de cor:
  - `--chart-grid`: deve ser uma cor neutra, discreta, baixo contraste
    contra o fundo do card (é linha de grade, não dado) — coerente com
    o papel de `--muted-foreground` ou similar já existente, mas como
    token próprio (não reaproveitar `--muted-foreground` diretamente,
    pois o semantic naming do projeto já separa tokens de gráfico dos
    tokens de UI geral — ver comentário em `styles.css:42-51`).
  - `--projected`: deve ser visualmente distinguível de `--realized` e
    `--comparison` (já existentes, usados no mesmo gráfico) — cor que
    comunique "projeção/estimativa" (ex: tom mais claro/dessaturado do
    que `--realized`, ou um padrão tracejado se o componente já suportar
    `strokeDasharray` — checar `CashFlowChart.tsx` antes de decidir).
- Depois de definir os tokens, rodar o validador do skill `dataviz`
  (se disponível no projeto) para confirmar que a paleta resultante é
  colorblind-safe — essa é a pergunta original da Auditoria UX que só
  pôde ser respondida depois deste fix.

### Gate de saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual: abrir `/app/cashflow`, inspecionar o elemento `<line>`
  de grade via DevTools, confirmar `stroke` computado ≠ `"none"`.
  Testar em light e dark mode.
- Reportar os valores `oklch()` escolhidos e o resultado do validador
  `dataviz`, se rodado.

---

## ITEM 2 (🟡) — CTA "Configurar Meta" Sem Link (Home)

**Contexto:** Achado do Prompt 97 (item 2.4): `HorizonteHero.tsx:351-357`
renderiza `t.home.accumulatedConfigure` como `<span>` de texto puro —
sem `onClick`, sem `<Link>`, sem `<button>`. Usuário sem meta configurada
não tem nenhuma pista de como configurar uma.

**Tarefa:**
- Identificar a tela/rota real onde a meta de renda é configurada hoje
  (a Auditoria UX menciona "Configurações/FI Mode" como hipótese — CONFIRMAR
  o path exato antes de codar, não assumir).
- Envolver o texto (`t.home.accumulatedConfigure`) num `<Link>` (TanStack
  Router) apontando para essa rota, mantendo o estilo visual atual
  (não precisa parecer botão se isso quebrar o design da seção — pode
  ser link sutil com underline no hover, current pattern do projeto).
- Adicionar `aria-label` explicativo via i18n se o texto sozinho não
  deixar claro que é clicável.

### Gate de saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual: usuário sem meta configurada, clicar no texto, confirmar
  que chega na tela certa de configuração.

---

## ITEM 3 (🟠) — Export CSV Incompleto (Minha Carteira)

**Contexto:** Achado do Prompt 97 (item 2.1): `buildWatchlistCsv`
(`src/lib/csv.ts:27-33`) exporta só 4 colunas (`Ticker, Type, Quantity,
AveragePrice`) de 24 campos disponíveis em `WatchlistItem`.

**Descoberta adicional, não estava no achado original — verificar
antes de decidir a abordagem:** este mesmo formato de 4 colunas é
consumido de volta por `useWatchlistCsvImport.ts` (`Ticker/Type/
Quantity/AveragePrice`) — ou seja, `buildWatchlistCsv` não é um export
solto, é a metade "escrita" de um par import/export simétrico usado
para reconstruir posições. Ampliar as colunas exportadas sem considerar
o import tem 2 caminhos possíveis, e a escolha entre eles é decisão de
produto, não técnica — **não decidir sozinho, apresentar as 2 opções e
esperar confirmação antes de codar:**

- **Opção A — Manter simetria:** ampliar tanto `buildWatchlistCsv`
  quanto `useWatchlistCsvImport.ts` para os mesmos campos extras (ex:
  `sector`, `targetYield`), mantendo os dois em sincronia. Mais
  trabalho, mas preserva "exportar → editar → reimportar" como fluxo
  válido.
- **Opção B — Dois exports distintos:** manter `buildWatchlistCsv`
  como está (é o formato de "posição rápida", compatível com reimport),
  e criar uma **segunda** função de export (ex: `buildWatchlistFullCsv`
  ou um botão "Exportar tudo" separado) com os campos adicionais, sem
  pretensão de ser reimportável. Menos risco de quebrar o fluxo de
  import existente, mas dois formatos CSV coexistindo pode confundir o
  usuário se não for bem rotulado na UI.

**Tarefa:**
- Apresentar as 2 opções acima para Paulo, com a lista exata de quais
  dos 24 campos de `WatchlistItem` fariam sentido em cada uma (nem
  todos os 24 campos precisam necessariamente estar no CSV — ex: campos
  internos/técnicos como `id` provavelmente não).
- Só prosseguir com a implementação após escolha explícita de Paulo
  entre Opção A e Opção B.

### Gate de saída (após escolha e implementação)
- `npx tsc --noEmit`, `npx vitest run` (incluindo teste de
  round-trip export→import se Opção A for escolhida), `npm run build`.
- Teste manual do fluxo de export (e import, se Opção A).

---

## ITEM 4 (🟡) — Migrar Sticky Column para Mais 2 Tabelas

**Contexto:** Achado do Prompt 95: `STICKY_FIRST_COLUMN_CLASS` (em
`src/components/ui/responsive-table.tsx`) já existe e está aplicado na
Home (`PortfolioTableV2.tsx`). O próprio Prompt 95 identificou 2
candidatas fortes ainda não migradas: `DividendRadar.tsx` (Radar
Global, 7 colunas) e `DividendsHistoryPanel.tsx` (Histórico de
Dividendos, dentro de `AssetDetailSheet`).

**Tarefa:**
- Aplicar `STICKY_FIRST_COLUMN_CLASS` na primeira coluna (ticker/ativo)
  de ambas as tabelas, seguindo exatamente o mesmo padrão já usado em
  `PortfolioTableV2.tsx` (prop `sticky?: boolean` no header, classe na
  primeira `<td>`).
- Medir em viewport 375px, mesmo protocolo do Prompt 95: capturar
  `left` da célula antes e depois de `scrollLeft = 300` (ou equivalente
  a 80% da largura da tabela), confirmar que a coluna fica fixa.
- Confirmar que `bg-card` (ou o token de fundo correspondente) está
  opaco na célula sticky, sem vazamento de conteúdo por trás
  (glassmorphism/translúcido) — mesmo cuidado do Prompt 95.

### Gate de saída
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Medição real (não estimada) em 375px para as 2 tabelas, reportada no
  mesmo formato JSON usado no relatório do Prompt 95.

---

## Proibido em Todos os Itens
- Item 1: não escolher tokens de cor sem seguir o padrão `oklch()` +
  `:root`/`.dark`/`@theme inline` já estabelecido.
- Item 3: não implementar Opção A ou B sem confirmação explícita de
  Paulo — apresentar e parar.
- Item 4: não generalizar as 3 tabelas (Home + as 2 novas) num único
  componente de tabela genérico nesta rodada — mesma cautela do Prompt
  95 (risco de regressão na tela de origem "para ganhar" a tela nova).
  Só o contrato de estilo (`STICKY_FIRST_COLUMN_CLASS`) é compartilhado.
