# PROMPT 123 — Item 1, Fase 2.5: ETFs (Bogle + Shiller CAPE)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior. Apresente PLANO (Regra 8) antes de
qualquer código — esta é a fase de maior complexidade de dado, detalhar a
estratégia de série histórica no plano antes de codar.

CONTEXTO:
Fases 2.1-2.4 concluídas. Esta é a Fase 2.5: valuateETF. Requer resolver o
Gap 3 (série histórica de P/L de índice para Shiller CAPE).

ESCOPO:
- Investigar e propor no plano (não decidir sozinho) a fonte para série
  histórica de P/L de S&P500/IBOV — se não houver fonte gratuita
  confiável e simples de manter, PARAR e apresentar essa limitação a
  Paulo/Claude como decisão pendente, em vez de implementar Shiller CAPE
  com dado de qualidade duvidosa.
- Equação de Retorno Total de Bogle (Dividend Yield + Earnings Growth do
  índice).
- Bazin de Dividend Yield Histórico para ETFs de dividendo (SCHD, VYM,
  DIVO11) — comparar DY atual vs. média histórica do próprio ETF (dado já
  disponível via brapi/yahoo, sem gap).
- Earnings Yield Gap / Equity Risk Premium para ETFs amplos (IVVB11, VOO,
  VT, BOVA11).
- Shiller CAPE — SOMENTE se a fonte de série histórica for viabilizada no
  plano aprovado; caso contrário, marcar este método específico como não
  implementado nesta rodada (não bloqueia os outros 3 métodos da classe).

PROIBIDO:
- Implementar Shiller CAPE com série histórica curta ou de fonte não
  confiável só para "entregar completo" — pior ter 3 de 4 métodos
  corretos do que 4 métodos com um deles em base de dado fraca sem avisar.
- Aplicar Bazin/Graham/Gordon individuais de empresa a um ETF — é erro
  conceitual, ETF não tem LPA/VPA de empresa única.

ENTREGA:
Plano (incluindo decisão explícita sobre viabilidade do Gap 3) → aprovação
→ implementação → tsc/test/build limpos → exemplos reais de 2-3 ETFs
(BR e US).
```
