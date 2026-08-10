### 43 — Rebalanceamento por Meta (VS3, capability "Risk & Allocation") — Prompts A/B/C 🟡 IMPLEMENTADO DIRETO NO CÓDIGO POR CLAUDE, AGUARDANDO VALIDAÇÃO VISUAL AO VIVO

Contexto: o Antigravity (rodando Gemini 3.1 Pro) perdeu o fio da conversa
repetidamente nesta frente de trabalho — reportou "sucesso" em tarefas que
nunca implementou, misturou contexto de outra tarefa (scroll mobile do
AssetDetailSheet) com esta por 3 respostas seguidas, e mesmo depois de um
reset de contexto guiado (git status/diff real antes de agir) voltou a
repetir pergunta já respondida. Diante disso, Claude implementou os prompts
restantes diretamente via acesso de filesystem local, sem intermediação do
Antigravity.

**Prompt A — Alocação-Alvo por classe + Teto de Concentração por ativo**
✅ Implementado (rodada anterior, pelo Antigravity) e ✅ validado ao vivo por
Claude via Claude in Chrome: painel sem bloqueio Pro, todos os 8 tipos de
ativo presentes, persistência confirmada após reload (Total: 100%, valores
30/50/20/5 mantidos). `FEATURE_GATES.targetAllocation = false` e
`FEATURE_GATES.maxConcentration = false` deixam tudo liberado por padrão,
com estrutura pronta pra reativar via toggle quando o Painel Admin existir.

**Prompt B — Cálculo de desvio + violação de teto (visual)**
✅ Implementado diretamente por Claude, via acesso direto ao filesystem
(`Filesystem:edit_file`), depois que 3 rodadas seguidas do Antigravity
falharam em sequer tocar nos arquivos certos:
- `ALLOCATION_TOLERANCE_PCT = 2` adicionada como constante isolada e
  documentada em `src/lib/allocation.ts` (reuso futuro no Prompt D/Alertas).
- `TargetAllocationPanel.tsx` ganhou a prop `currentAllocationPct` (que já
  vinha sendo passada por `SmartAllocation.tsx` sem estar declarada na
  interface — provável causa de erro de build silencioso) e a exibição de
  "Atual: X%" / "Desvio: ±X%" abaixo de cada input, com cor de alerta
  (`text-danger`) quando o desvio ultrapassa a margem de tolerância.
- `Watchlist.tsx` ganhou o cálculo de `concentrationViolators` (Set de
  tickers cujo % do portfólio consolidado em BRL ultrapassa
  `maxConcentrationPerAsset`), propagado por `WatchlistAssetGrid.tsx` até
  `AssetCard.tsx`, que agora mostra borda vermelha + badge "Above ceiling"
  no card do ativo violador.
- i18n: as chaves `currentAllocationPct`, `allocationDeviation`,
  `concentrationViolation`, `beforeCurrent`, `afterProjected` já existiam
  nos 3 dicionários (resíduo de uma rodada confusa anterior do Antigravity,
  nunca consumido) — reaproveitadas, nenhuma string nova hardcoded.

**Prompt C — Motor de sugestão de aporte ("Aporte Inteligente")**
✅ Já estava implementado, sem que ninguém tivesse percebido — descoberto
por Claude relendo `allocation.ts` com atenção: `computeSmartAllocation`
já tinha o boost de score pra ativos sub-alocados em relação ao alvo
(`Target Allocation Boost/Penalty`) e o cap rígido `getMaxSharesAllowed`
que nunca deixa a sugestão ultrapassar o Teto de Concentração — construído
junto da Tarefa/Prompt A sem ter sido rotulado como tal. Nunca sugere
venda, só compra. O botão "Generate allocation" já existente é a interface
desse motor — nenhum código novo necessário.

**Prompt D — Alertas/gatilho de notificação**
⏸️ Continua propositalmente parado, depende da capacidade de Alertas
(29.5/30) ainda não construída. Registrado como pendência, não prompt.

**PENDENTE**: validação visual ao vivo do Prompt B (desvio + violação de
teto) — não foi possível concluir na sessão porque nem `localhost:5173`
nem `localhost:5174` estavam respondendo no momento (nenhum `npm run dev`
rodando). Assim que o Paulo subir o dev server, Claude retoma a validação
via Claude in Chrome (mesma ferramenta já usada com sucesso pra validar o
Prompt A). `npm run test`/`npm run build` também não puderam ser rodados
por Claude (sem acesso de execução de comando na máquina do Paulo, só
leitura/escrita de arquivo) — pendente de confirmação do Paulo ou retomada
do Antigravity depois de resolvido o problema de contexto perdido.

---