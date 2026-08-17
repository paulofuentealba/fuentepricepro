# PROMPT — Painel de Indicadores Fundamentalistas Categorizados
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
Benchmark contra StatusInvest (statusinvest.com.br/acoes/bbse3) mostrou um
painel de indicadores fundamentalistas categorizado que o Fuente não tem
hoje — a aba Highlights só exibe DY Atual e CAGR Div (5A). Investidores
profissionais esperam ver o conjunto completo agrupado por categoria.

ESCOPO — INVESTIGAR PRIMEIRO:
1. Mapear, indicador por indicador, o que já é calculado/disponível no
   pipeline (calculations.ts, CVM, SEC EDGAR) vs. o que precisaria de
   cálculo novo. Categorias de referência (adaptar por classe de ativo —
   nem tudo se aplica a FII/REIT/ETF):
   - Valuation: P/L, P/VP, PEG, EV/EBITDA, EV/EBIT, VPA, LPA, P/Ativo
   - Endividamento: Dív.Líq/PL, Dív.Líq/EBITDA, PL/Ativos, Liq.Corrente
   - Rentabilidade: ROE, ROA, ROIC
   - Eficiência: Margem Bruta, Margem EBITDA, Margem Líquida
   - Crescimento: CAGR Receitas 5A, CAGR Lucros 5A
2. Para FIIs/REITs, adaptar: substituir indicadores de lucro/margem por
   equivalentes de fundo (P/VP, Vacância, Cap Rate, já existentes no
   dispatcher de valuation).
3. Para ETFs, reduzir a lista drasticamente (não tem LPA/ROE/margem de
   empresa individual) — usar o que já existe (expenseRatio, DY).

ESCOPO — IMPLEMENTAÇÃO (após aprovação do mapeamento):
1. Painel categorizado na aba Highlights, agrupado por seção (Valuation/
   Endividamento/Rentabilidade/Eficiência/Crescimento), só mostrando
   indicadores aplicáveis à classe do ativo — sem categoria vazia.
2. Cada indicador com tooltip de 1 frase explicando fórmula/significado
   (reaproveitar qualquer conteúdo já escrito, não duplicar).
3. Indicador ausente (dado não disponível) mostra "—", nunca 0 ou
   travessão que pareça erro.
4. NÃO implementar "Histórico do Indicador" (gráfico linha/barra ao longo
   do tempo) nem "Média Mercado" nesta rodada — são escopos maiores,
   ficam para prompt futuro depois que o painel base estiver validado.

PROIBIDO:
- Mostrar indicador de empresa (ROE, margem, LPA) para FII/ETF.
- Inventar cálculo sem confirmar a fonte de dado no plano primeiro.
- Poluir a tela com todos os 27 indicadores de uma vez sem hierarquia —
  agrupar por categoria com colapse/expand, seguindo o padrão de
  densidade já usado no Modo Avançado.

ENTREGA:
Plano (com tabela de indicador → fonte de dado → aplicável a quais
classes) → aprovação → implementação → tsc/test/build reais colados →
captura de tela mobile e desktop.
```
