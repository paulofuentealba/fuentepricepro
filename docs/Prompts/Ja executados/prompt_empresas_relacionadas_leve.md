# PROMPT — Empresas Relacionadas (Versão Leve, Sem Catálogo Novo)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior. Apresente PLANO (Regra 8) antes de
qualquer código.

CONTEXTO:
A investigação anterior confirmou que Comparativo Setorial completo (com
médias de mercado) exige catálogo novo e é trabalho maior (possível ADR).
Mas "Empresas Relacionadas" no StatusInvest, na versão mais simples, é só
uma lista de tickers do mesmo segmento — isso dá para fazer em escopo
MENOR, sem catálogo de mercado inteiro: usar o campo `sector` (string já
existente via Brapi/Yahoo) para agrupar, dentro do universo de ativos que
o PRÓPRIO Fuente já conhece (ativos que algum usuário já pesquisou ou tem
na watchlist), não o mercado inteiro.

ESCOPO:
1. Investigar se há como consultar, de forma barata, "outros tickers com
   o mesmo valor de `sector`" dentro do que já está cacheado em /assets
   (Fase 1 do Prompt 116) — sem varrer o mercado externo.
2. Se o cache de /assets hoje só contém os ativos ativamente consultados
   recentemente (TTL de 5 min, conforme já confirmado), a lista de
   "relacionados" será necessariamente pequena/instável — reportar essa
   limitação no plano antes de implementar, não prometer uma lista rica
   como a do concorrente.
3. Implementar como card simples na aba Highlights: até 4-5 tickers do
   mesmo `sector`, com nome e cotação atual, clicável para abrir o
   detalhe daquele ativo. Sem comparação de indicadores nesta rodada —
   é só descoberta lateral, não análise comparativa.
4. Se a investigação mostrar que o resultado seria pobre demais (poucos
   ativos com sector preenchido dentro do cache atual) para valer a pena,
   reportar isso como conclusão do plano e não implementar — não force
   uma feature fraca só para preencher o pedido.

PROIBIDO:
- Buscar ativamente na Brapi/Yahoo todos os tickers de um setor para
  popular a lista — isso seria o catálogo novo que já decidimos adiar.
- Prometer lista rica se os dados internos não sustentarem isso.

ENTREGA:
Plano (com avaliação honesta se vale a pena nesta escala reduzida) →
aprovação → implementação SE viável, ou relatório de "não vale a pena
ainda" SE não for → tsc/test/build reais colados se implementado.
```
