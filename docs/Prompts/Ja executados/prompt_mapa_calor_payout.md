# PROMPT — Mapa de Calor de Proventos + Payout Histórico (Aba Dividendos)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Frontend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
Benchmark contra StatusInvest identificou dois módulos visuais de alto
valor para a aba Dividendos que o Fuente não tem: (1) Mapa de calor de
proventos — grade mês × ano mostrando recorrência/valor de distribuição;
(2) gráfico de Payout histórico.

ESCOPO 1 — Mapa de Calor:
- Grade com meses (JAN-DEZ) nas colunas e anos nas linhas, célula colorida
  por intensidade quando houve provento naquele mês/ano (usar tokens do
  design system, não cor genérica).
- Resumo por mês: % de recorrência (em quantos dos últimos N anos aquele
  mês teve pagamento) — ajuda a visualizar "este ativo historicamente paga
  em Fevereiro e Agosto", por exemplo.
- Dado já existe (histórico de dividendos por ativo já é exibido na
  tabela da aba) — este é um novo agrupamento visual do MESMO dado, não
  fonte nova.

ESCOPO 2 — Payout Histórico:
- Gráfico de linha/barra do payout ratio ao longo do tempo (últimos 5/10
  anos, conforme profundidade real de dado disponível — confirmar antes
  de prometer).
- Só aplicável a STOCK_BR/STOCK_US (FIIs têm payout mandatório ~95%, não
  é indicador útil para eles — omitir ou substituir por indicador mais
  relevante da classe, decidir no plano).

PROIBIDO:
- Buscar dado novo de fonte externa para o mapa de calor — é reagregação
  do que já é exibido na tabela de dividendos.
- Mostrar Payout Histórico para FIIs sem adaptação — não faz sentido
  como indicador para essa classe.

ENTREGA:
Plano (confirmando profundidade real de histórico disponível por ativo) →
aprovação → implementação → tsc/test/build reais colados → captura de
tela mobile e desktop com um ativo com histórico rico (ex: BBSE3-like).
```
