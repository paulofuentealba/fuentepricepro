# PROMPT — Simulador "Se Você Tivesse Investido..."
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior + Consultor de UX. Apresente PLANO
(Regra 8) antes de qualquer código, incluindo mobile explícito.

CONTEXTO:
Benchmark contra Investidor10 identificou este simulador como alto valor
emocional/simplicidade para o investidor iniciante: usuário escolhe um
valor (ou período) e vê quanto teria hoje se tivesse investido naquele
ativo no passado, considerando reinvestimento de dividendos.

ESCOPO:
1. Investigar se já temos série de preço histórico suficiente (Brapi/
   Yahoo) e histórico de proventos por ativo para calcular isso com
   precisão em janelas de 1 ano / 5 anos / 10 anos (adaptar as janelas
   disponíveis à profundidade real do dado que temos — não prometer 10
   anos se só temos 5).
2. Cálculo (backend, nunca no cliente): dado um valor investido e uma
   data de início, aplicar variação de preço no período + reinvestir cada
   provento recebido no preço da data de pagamento (aproximação razoável,
   documentar a simplificação assumida no plano).
3. UI: seletor de período (chips: 1 ano, 5 anos, "desde que listado" se
   aplicável) + input de valor (ex: R$ 1.000, com valor-padrão sugerido) →
   resultado "Hoje você teria: R$ X" + breakdown pequeno (valorização vs.
   dividendos reinvestidos).
4. Zero jargão — linguagem direta, sem "CAGR" ou "TIR" nessa seção
   específica (isso é modo iniciante por natureza, mesmo que o usuário
   esteja em Modo Avançado no resto da tela).
5. Disclaimer: "Rentabilidade passada não garante resultados futuros" —
   reaproveitar componente de disclaimer já existente, texto consistente
   com o resto do produto.

PROIBIDO:
- Calcular no frontend — toda a simulação é backend, componente só exibe
  resultado.
- Prometer janela de tempo maior do que o dado histórico real suporta.
- Omitir a hipótese simplificadora do reinvestimento (documentar
  claramente no plano e, se relevante, num tooltip pequeno na UI).

ENTREGA:
Plano (com a profundidade real de histórico disponível confirmada antes
de prometer janelas) → aprovação → implementação → tsc/test/build reais
colados → captura de tela mobile e desktop com um exemplo real.
```
