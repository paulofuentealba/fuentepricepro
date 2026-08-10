### Prompt 23 — Correção de Seleção Determinística do Lucro Líquido no DRE (`ingest-cvm.ts`) ✅

- **Problema Diagnosticado**:
  - Em `scripts/ingest-cvm.ts`, a busca pela conta de Lucro Líquido no DRE tratava `3.11` (Lucro Líquido Consolidado do Período) e `3.09` (Resultado Líquido das Operações Continuadas) como equivalentes num único `if (cdConta === '3.11' || cdConta === '3.09')`.
  - Como o loop interrompia no primeiro match encontrado pela ordem das linhas do CSV da CVM, para a `BBSE3` a conta `3.09` aparecia antes da `3.11`, gerando um LPA incorreto de `5.6358` (divergência de ~21% em relação ao valor de referência `4.6452` validado na Fase 1).

- **Solução Implementada**:
  - Refatorada a busca no DRE para ter prioridade determinística estrita:
    1. Primeira varredura buscando exclusivamente a conta `3.11` (Lucro Líquido Consolidado do Período).
    2. Segunda varredura buscando `3.09` apenas se nenhuma linha `3.11` for encontrada.

- **Resultados e Recálculo Confirmado**:
  - Re-executado `npm run ingest:cvm`.
  - **`BBSE3`**: LPA recalculado para **`4.6448`** (bate exata e perfeitamente com a referência da Fase 1, corrigindo o desvio).
  - **`PETR4`**: LPAmantido em `8.5815` (bate com referência).
  - **`TAEE11`**: LPA mantido em `1.5287` (bate com referência).
  - Demais ativos do cache (`VALE3`, `BBAS3`, `ITUB4`, `BBDC4`, `WEGE3`): LPAs preservados e consistentes com o Lucro Líquido Consolidado.
  - Arquivo `src/lib/api/data/cvm_enriched.json` atualizado com o novo valor de `BBSE3` (`4.644755...`).
  - Suíte de testes (`npm run test`): 53/53 testes aprovados. Build (`npm run build`) 100% limpo.


---