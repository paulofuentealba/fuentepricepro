# PROMPT 116 — Item 2, Fase 1: Cache `/assets/{ticker}`
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior. Antes de qualquer código, apresente um
PLANO (Regra 8: arquivos a criar/alterar, lógica central, riscos→decisão) e
aguarde minha aprovação explícita.

CONTEXTO:
ADR-001 já aprovado (docs/architecture/adrs/ADR-001-...). Esta é a Fase 1:
introduzir /assets/{ticker} como cache server-side, SEM desligar o caminho
atual de busca direta às 8 fontes externas.

ESCOPO:
- Novo serviço server-side que lê/grava /assets/{ticker} no Firestore,
  populado pelo pipeline de ingestão já existente (brapi/yahoo/cvm/secEdgar/
  bcb/nasdaq).
- O código que hoje busca cotação/metadado diretamente das 8 fontes passa a
  CONSULTAR /assets primeiro; se ausente ou expirado (TTL), cai no
  comportamento atual como fallback.
- Definir TTL como constante nomeada e documentada (ex:
  ASSET_CACHE_TTL_MS) — não número mágico solto no código.

PROIBIDO:
- Alterar o contrato de saída de useValuedPortfolio ou getAssetValuation.
- Remover qualquer chamada direta às fontes externas — isso só acontece na
  Fase 4, muito depois.
- Escrever em /assets a partir do ambiente DEV apontando para o Firebase de
  produção sem confirmação explícita de que dev/prod compartilham projeto
  (Regra 3 — isso já é fato conhecido do projeto, mas trate leitura/escrita
  de teste com cautela extra).
- Feature ativa por padrão em produção sem feature flag.

ENTREGA:
Plano primeiro. Após aprovação: código + tsc --noEmit + npm run test +
npm run build, todos limpos, antes de reportar conclusão.
```
