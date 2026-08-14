# PROMPT 108 — Guard Automático: Impedir Vazamento de Enum Cru (SSOT) no Build
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## Contexto

Dois bugs reais recentes (Prompt 86, Prompt 107) tiveram a mesma causa
raiz: um campo de domínio (`item.type`, `currency`) foi lido/renderizado
direto em vez de passar pela função/dicionário canônico (`t.types[...]`,
`item.currency`). Isso só foi descoberto porque apareceu visível na
tela — não há nada hoje que pegue esse padrão automaticamente antes de
chegar em produção.

O projeto já tem o mecanismo certo pra isso:
`scripts/forbid-legacy-tagline.js`, rodado via `npm run build` (ver
`package.json`: `"build": "npm run check-tagline && vite build"`).
Este prompt generaliza esse padrão para os 2 tipos de vazamento de SSOT
já identificados.

## Tarefa

Criar `scripts/check-ssot-leaks.js`, seguindo **exatamente a mesma
estrutura** de `forbid-legacy-tagline.js` (mesmo `walk()`, mesmos
`EXCLUDED_DIRS`, mesma auto-exclusão do próprio script — reaproveitar
o máximo de código possível em vez de reescrever do zero, Regra 1;
extrair um helper compartilhado de "varrer `src/`" para os dois scripts
usarem, se isso não introduzir risco de quebrar o `forbid-legacy-tagline.js`
existente).

### Regra 1 — Enum de `type` renderizado cru em JSX
Detectar padrões como `{algumacoisa.type}` dentro de arquivos `.tsx`
**quando não estiver envolvido por `t.types[`** na mesma linha ou nas
2 linhas anteriores (heurística razoável via regex — não precisa ser
um parser AST completo, mas deve ser confiável o suficiente para não
gerar falso positivo constante). Casos como
`t.types[item.type as keyof typeof t.types] ?? item.type` são
**válidos** (o segundo `.type` ali é fallback, não vazamento) — o
detector precisa diferenciar isso do caso `<span>{item.type}</span>`
sozinho.

Usar como referência os 9 pontos já confirmados corretos nesta
conversa como "exemplos de uso correto que NÃO devem disparar o alerta"
(para calibrar/testar o regex antes de finalizar):
`AssetComparator.tsx:151`, `AssetForm.tsx:113,133`,
`DividendRadar.tsx:243`, `RiskRadar.tsx:139`, `SmartAllocation.tsx:239`,
`TargetAllocationPanel.tsx:113`, `AssetDataDisplay.tsx:27`,
`AllocationChart.tsx:49` — rodar o script contra o estado atual do
repo e confirmar que ele NÃO aponta nenhum desses como falso positivo
antes de considerar pronto.

### Regra 2 — Inferência de moeda fora do campo canônico
Detectar padrões que tentam determinar moeda a partir de `type` em vez
de ler `.currency` diretamente — ex: qualquer ocorrência de
`["Stock", "REIT"].includes(` ou variações textuais próximas
(`type === "STOCK_US" ? "USD"`, fora dos arquivos onde isso é
legitimamente parte da própria resolução da SSOT: `watchlist.ts`,
`brapi.server.ts`, `yahoo.server.ts` — esses 3 arquivos são onde a
inferência acontece de propósito, ver Prompt 107; qualquer OUTRO
arquivo fazendo esse tipo de comparação é suspeito e deve ser
reportado).

### Integração com o build
- Adicionar ao `package.json`, mesmo padrão de `check-tagline`:
  ```json
  "check-ssot-leaks": "node scripts/check-ssot-leaks.js",
  "build": "npm run check-tagline && npm run check-ssot-leaks && vite build"
  ```
- Mensagem de erro clara, no mesmo formato do script existente:
  arquivo + linha + trecho encontrado, com instrução do que fazer
  (`Use t.types[...] em vez de renderizar o enum direto` /
  `Use item.currency em vez de inferir moeda por type`).

## Gate de Saída
- Rodar `node scripts/check-ssot-leaks.js` manualmente contra o estado
  atual do repo — deve passar limpo (0 falsos positivos nos 9 pontos
  listados acima, 0 falsos negativos nos 2 bugs já corrigidos — se o
  script rodasse ANTES dos Prompts 86/107, ele deveria ter pego os
  bugs originais; testar isso revertendo temporariamente um dos fixes
  num branch local, confirmar que o script acusa, depois reverter de
  volta).
- `npx tsc --noEmit`, `npx vitest run`, `npm run build` (agora incluindo
  o novo check).
- Reportar quantos falsos positivos precisaram de ajuste no regex
  antes de zerar.

## Proibido
- Não usar um parser TypeScript/AST completo (ex: `ts-morph`) se regex
  bem calibrado resolver — não adicionar dependência pesada pra esse
  script utilitário simples, seguindo o espírito leve do script
  existente que serviu de modelo.
- Não fazer o check falhar o build por avisos — se algo for
  genuinamente ambíguo (não dá pra confirmar automaticamente se é
  vazamento ou uso legítimo), reportar como warning no console sem
  quebrar o build, e listar para revisão manual humana.
