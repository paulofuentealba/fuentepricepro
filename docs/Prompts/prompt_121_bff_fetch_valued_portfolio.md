# PROMPT 121 — Item 2, Fase 3: BFF `fetchValuedPortfolioFn`
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Arquiteto Backend Sênior. Apresente PLANO (Regra 8) antes de
qualquer código — esta fase tem risco de regressão mais alto do que as
anteriores, então o plano precisa ser especialmente detalhado na seção (c)
Riscos→Decisão.

CONTEXTO:
ADR-001 aprovado. /assets (Fase 1) e /positions (Fase 2) já implementados e
validados. Fases 2.1, 2.2 e 2.3 do dispatcher de valuation (Ações BR,
Stocks US, FIIs) já concluídas — portanto o ValuationResult já inclui
assumptions[] e métodos além de bazin/graham/gordon para essas classes.

ESCOPO:
- Implementar fetchValuedPortfolioFn como server function (TanStack Start)
  que: lê /positions, lê /assets (com cache curto em memória, TTL
  documentado), lê câmbio, chama getAssetValuation internamente, e monta
  ValuedPortfolioDTO.
- ATUALIZAR o contrato ValuedPositionDTO.valuation para refletir o
  ValuationResult real do ADR-002 (incluir os métodos específicos por
  classe já implementados — shareholderYield, e o array assumptions[] —
  não deixar o DTO com o formato antigo {consensus, bazin, graham, gordon}
  apenas).
- Ativar via Feature Gate (useFeatureGate) — useValuedPortfolio só passa a
  consumir este endpoint para usuários com a flag ativa.
- Critério de aceite: usuários com flag ativa veem carteira com valores
  IDÊNTICOS à versão client-side atual (comparação lado a lado, não só
  visual — comparar os números).

PROIBIDO:
- Remover ou desativar o caminho client-side atual — isso é Fase 4, não
  agora.
- Deixar o DTO desatualizado em relação ao ValuationResult real (isso foi
  identificado como risco explícito nesta revisão — corrigir aqui).
- Recalcular valuation no cliente para "conferir" o BFF — a comparação de
  paridade deve ser feita em teste automatizado/log, não duplicando lógica
  no frontend.

ENTREGA:
Plano → aprovação → implementação → tsc/test/build limpos → relatório de
paridade (N usuários/portfolios testados, divergências encontradas).
```
