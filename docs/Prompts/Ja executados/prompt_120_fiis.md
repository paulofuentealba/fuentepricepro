# PROMPT 120 — Item 1, Fase 2.3: FIIs / Fi-Infra / Fi-Agro
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior especializado em modelagem financeira.
Apresente PLANO (Regra 8) antes de qualquer código.

CONTEXTO:
Fases 2.1 e 2.2 concluídas. Esta é a Fase 2.3: valuateFundoImobiliario,
cobrindo FII, FII_INFRA, FIAGRO.

ESCOPO:
- Bazin com Spread sobre NTN-B (usar curva BACEN já integrada): Fi-Infra
  isento 1,5%-2,5%, FIIs de Papel/Fi-Agro 2,5%-4,0%, FIIs de Tijolo
  1,5%-3,0%. Faixas como suggestedRange em assumptions[], nunca fixas.
- Gordon com Repasse Inflacionário (IPCA/IGP-M conforme contrato do fundo —
  ver nota de gap abaixo).
- Cap Rate Reverso para FIIs de Tijolo (NOI / valor de mercado).
- P/VP Dinâmico Ancorado em Risco de Crédito para Papel/Fi-Agro (sinalizar
  quando P/VP > 1,00-1,02 como alerta, não bloqueio).

GAP CONHECIDO (Gap 2 — NOI/vacância):
Se a segregação limpa de NOI por fundo não estiver disponível via
CVM INF_TRIMESTRAL de forma confiável, o Cap Rate Reverso deve:
(a) usar o valor disponível E marcar confidenceBadge mais baixo (●●○○), OU
(b) retornar null explícito com um motivo textual, se o dado for
    insuficiente para qualquer estimativa razoável.
NUNCA estimar silenciosamente sem o badge refletir isso.

GAP DE METADADO (índice de repasse contratual por ativo):
Se o índice de repasse (IPCA vs IGP-M) não estiver estruturado em nenhuma
fonte automatizável, isso é entrada manual PONTUAL de metadado do ativo
(não é premissa de valuation, é dado cadastral) — sinalizar essa
necessidade no plano e aguardar decisão de Paulo sobre onde/como capturar
esse dado antes de implementar, não decidir sozinho.

PROIBIDO:
- Aplicar LPA/VPA/ROE de ações a FIIs — são fórmulas incompatíveis com a
  estrutura de fundo, isso já foi identificado como erro conceitual a
  evitar.
- Prosseguir com Cap Rate Reverso "estimado" sem badge refletindo isso.

ENTREGA:
Plano (incluindo a decisão pendente do gap de metadado, para eu confirmar
antes de codar) → aprovação → implementação → tsc/test/build limpos →
exemplos reais de FII de tijolo, FII de papel e Fi-Infra.
```
