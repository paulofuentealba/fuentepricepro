# PROMPT — Atualizar Massa de Dados com as Últimas Modificações
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro de Dados Sênior. Esta tarefa toca dado real de
produção (dev e prod compartilham o mesmo Firebase) — apresente PLANO
(Regra 8) e NÃO execute nenhuma escrita antes da minha aprovação explícita
por escrito, mesmo que o plano pareça óbvio.

CONTEXTO:
As últimas mudanças (Prompts 115-125 + correções) introduziram campos
novos no motor de valuation que ativos já cadastrados/cacheados não têm:
usTreasury10Y e affo (REITs), os métodos especializados por classe
(shareholderYield, assumptions[], etc.) e o cache /assets/{ticker}. Além
disso, o dispatcher agora exige type/assetClass corretamente preenchido
por ativo para cair na fórmula certa.

ESCOPO — INVESTIGAÇÃO PRIMEIRO:
1. Levante, sem alterar nada, quais ativos hoje em /assets/{ticker} (ou
   equivalente) estão com cache desatualizado em relação ao novo
   dispatcher — ou seja, foram calculados antes das especializações por
   classe existirem.
2. Levante quantos usuários/posições seriam afetados por um
   recálculo (estimativa de volume, não precisa ser exato).
3. Confirme se existe algum script de ingestão em lote já preparado
   (scripts/ingest-cvm.ts e afins) que possa ser reaproveitado, ou se
   precisa de um script novo de "refresh" que force o TTL do cache de
   /assets a expirar e o próximo acesso recalcular.

DECISÃO QUE PRECISA DE APROVAÇÃO ANTES DE EXECUTAR:
Apresente as opções e não escolha sozinho:
(a) Invalidar o cache /assets inteiro (forçar TTL expirado) e deixar o
    tráfego orgânico de usuários repopular sob demanda — mais lento,
    zero pico de custo, zero downtime.
(b) Rodar um script de refresh em lote que recalcula todos os ativos de
    uma vez — mais rápido, mas gera um pico de leitura/escrita no
    Firestore e nas 9 fontes externas (rate limit é um risco real aqui,
    veja se alguma fonte tem limite agressivo, ex: FRED/Brapi free tier).
(c) Refresh em lote, mas só para os ativos das classes que mudaram de
    fato (REIT e ETF, que ganharam campos novos) — meio-termo.

PROIBIDO:
- Rodar qualquer escrita em lote em produção sem eu confirmar
  explicitamente qual das 3 opções acima, por escrito, nesta conversa.
- Rodar teste de volume contra o Firebase de produção sem eu confirmar
  que é leitura, não escrita de teste — dev e prod compartilham projeto
  (Regra 3).
- Estimar custo "no chute" — se não souber o preço de leitura/escrita do
  plano atual do Firestore, marque como pendente de confirmação em vez de
  inventar número.

ENTREGA:
Relatório de investigação (volume de ativos afetados, opção recomendada
com trade-off, estimativa de custo se possível) → aguardar minha decisão
→ só então planejar a execução em si como um próximo prompt separado.
```
