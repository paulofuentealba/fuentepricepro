# PROMPT 118 — Item 2, Fase 2: Read Model `/users/{uid}/positions`
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior especializado em Firebase/Cloud
Functions. Apresente PLANO (Regra 8) antes de qualquer código.

CONTEXTO:
ADR-001 aprovado. Esta é a Fase 2: materializar /users/{uid}/positions/
{ticker} como read model derivado do ledger de transactions.

ESCOPO:
- Cloud Function transacional (onWrite em /users/{uid}/transactions/{txId})
  que recalcula e grava quantity, averageCost (custo médio ponderado),
  totalInvested, firstBuyDate, lastBuyDate em /users/{uid}/positions/
  {ticker}.
- Idempotência é requisito não-negociável: rodar a function 2x para a mesma
  escrita não pode alterar o resultado.
- Reaproveitar a lógica de recalculateHoldingFromTransactions já existente
  como base do cálculo — NÃO reimplementar custo médio ponderado do zero.
- Fase de validação: rodar em paralelo ao cálculo client-side atual por um
  período, logando divergências (não substituir a fonte usada pela UI
  ainda — isso é Fase 3/4).

PROIBIDO:
- Qualquer escrita em /positions vinda de outro caminho que não esta Cloud
  Function — dono único de escrita é regra do ADR-001, bloqueante.
- Rodar teste de reconciliação contra dados de produção reais sem
  confirmar com Paulo que é leitura, nunca escrita de teste, no projeto
  compartilhado dev/prod.
- Prosseguir sem teste de reconciliação de pelo menos 1.000 transações
  reais (ou amostra representativa) com 0 divergências antes de reportar
  conclusão.

ENTREGA:
Plano → aprovação → implementação → resultado do teste de reconciliação
(número de transações testadas, divergências encontradas, se houver) →
tsc/test/build limpos.
```
