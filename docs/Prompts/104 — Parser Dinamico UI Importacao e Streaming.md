# PROMPT 104 — Parser Dinâmico: UI de Importação & Streaming de Progresso
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Fase 2 de 3. PRÉ-REQUISITO: Prompt 103 aprovado e mergeado
> (`dynamicCsvParser.ts` + `importParser.worker.ts` já existem e
> testados).

---

## Contexto

Motor de parsing já existe e funciona isoladamente (Prompt 103). Esta
fase constrói a interface visual: drag-and-drop, preview de mapeamento
de colunas, feed humanizado de progresso, resumo final. **Ainda sem
gravar nada na carteira real** — isso é Prompt 105.

## Tarefas

### 1. `src/components/horizonte/DynamicImportModal.tsx`
Seguir o fluxo do diagrama do discovery (Seção 5):
`arquivo solto → detecção de formato → mapeamento de colunas →
preview → streaming linha a linha → resumo final`.

- **Estado 1 — Drop zone**: área de arrastar-e-soltar ou clique para
  selecionar arquivo (`.csv`, `.tsv`, `.xls`, `.xlsx`). Reaproveitar
  algum componente de upload/dropzone já existente no projeto
  (verificar `BrokerNoteUploader.tsx`, que já tem drag-and-drop para
  PDF — mesmo padrão visual, Regra 1) antes de criar um novo do zero.
- **Estado 2 — Preview de mapeamento**: depois que o Worker identifica
  os headers (antes de processar as linhas), mostrar ao usuário uma
  tabela pequena: "Coluna do arquivo → Campo identificado", com
  indicação visual de confiança (ex: ✓ verde para correspondência
  exata, ⚠ amarelo para correspondência por heurística/substring —
  usar o `confidence` que `matchColumn()` já retorna do Prompt 103).
  Se alguma coluna obrigatória (ticker, quantidade, preço) não foi
  identificada com confiança nenhuma, permitir que o usuário
  corrija manualmente via um `<select>` simples antes de prosseguir —
  não travar o fluxo, mas também não seguir adiante com um campo
  obrigatório sem mapeamento nenhum.
- **Estado 3 — Streaming de progresso**: barra de progresso (0-100%)
  + feed de mensagens humanizadas, uma linha por vez conforme o Worker
  processa (mensagens conforme Seção 5.1 do discovery: *"Importando
  linha 14: Compra de 100 ações de VALE3..."*, *"Linha 28 ignorada:
  ..."*). Usar um componente de lista com scroll automático para o
  item mais recente, sem travar a UI mesmo com centenas de linhas
  (virtualização se necessário, avaliar se o volume esperado justifica
  isso ou se é over-engineering para o caso de uso real — decidir com
  base no tamanho médio esperado de extrato, não assumir milhares de
  linhas sem necessidade).
- **Estado 4 — Resumo final**: total importado, ativos novos
  adicionados, lista de pendências com motivo (Seção 5.2 do
  discovery), botão de download do log de pendências em CSV.

### 2. Hook de integração com o Worker
- Criar `src/lib/useImportParser.ts` (ou nome equivalente) que
  encapsula o ciclo de vida do Web Worker (criar, enviar arquivo,
  escutar mensagens de progresso, terminar) como um hook React
  reutilizável, com estado (`idle | mapping | processing | done | error`).
- Tratar erro de parsing (arquivo corrompido, formato não suportado)
  com mensagem clara ao usuário, não travar em estado de loading
  infinito.

### 3. i18n e Design
- Todo texto do fluxo (labels dos 4 estados, mensagens humanizadas,
  resumo) via i18n nos 3 dicionários (Regra 2) — as mensagens
  humanizadas usam interpolação (ticker, quantidade, data, preço),
  seguir o padrão `{{variavel}}` já usado no resto do projeto.
- Tokens de design do projeto (Regra 6), mobile-first (Regra 5) — o
  modal precisa funcionar em 375px, mesmo que o preview de mapeamento
  vire uma lista empilhada em vez de tabela lado a lado nesse
  breakpoint.

## Gate de Saída
- `npx tsc --noEmit`, `npx vitest run` (testes do hook e do componente,
  incluindo o caso de coluna obrigatória não identificada
  automaticamente), `npm run build`.
- Teste manual com pelo menos 2 das fixtures criadas no Prompt 103
  (uma BR, uma internacional) rodando o fluxo visual completo do
  início ao fim.
- Teste manual em 375px confirmando que nenhum estado do modal quebra
  layout.

## Proibido
- Não gravar nada em `useTransactions`/`useWatchlist` nesta rodada —
  o resumo final mostra o resultado, mas não persiste. Isso é Prompt
  105.
- Não modificar `dynamicCsvParser.ts`/`importParser.worker.ts` além do
  estritamente necessário para conectar com a UI (ex: se faltar algum
  campo no formato de mensagem do Worker) — mudança de lógica de
  parsing em si não é escopo deste prompt.
