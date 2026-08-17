# PROMPT 122 — Item 1, Fase 2.4: REITs (AFFO + Treasury 10Y)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend Sênior. Apresente PLANO (Regra 8) antes de
qualquer código — esta fase inclui integração de fonte de dado NOVA,
detalhar isso explicitamente no plano.

CONTEXTO:
Fases 2.1-2.3 concluídas. Esta é a Fase 2.4: valuateREIT. Requer resolver
o Gap 1 (US Treasury 10Y) antes de implementar a fórmula.

ESCOPO:
1. Nova fonte de dados: src/lib/api/fred.server.ts — integração com a FRED
   API (St. Louis Fed, gratuita e pública) para taxa de US Treasury 10Y.
   Seguir o MESMO padrão de tratamento de erro/taxonomia (PASSED/FAILED/
   ERROR/INVALID/WARNING/SKIPPED) já usado nas 8 fontes existentes — não
   criar um padrão de erro novo e diferente.
2. valuateREIT com:
   - AFFO Yield Model (Bazin adaptado, usando AFFO real reportado via SEC
     EDGAR quando disponível, marcando confidenceBadge menor se precisar
     estimar a partir de FFO ajustado por capex de manutenção).
   - DDM baseado em crescimento de AFFO (g_AFFO dos últimos 3-5 anos).
   - NAV Discount Model (desconto de 5%-15% como suggestedRange, nunca
     fixo).
   - Spread sobre US Treasury 10Y (Data Centers/Industrial 1,5%-2,5%,
     Residencial/Office/Retail 2,5%-4,5% — por subsegmento do REIT, se o
     dado de subsegmento existir; senão, usar a faixa mais conservadora e
     marcar confidenceBadge menor).

PROIBIDO:
- Prosseguir para a fórmula de valuation sem a fonte FRED funcionando e
  testada isoladamente primeiro (ordem: fonte de dado → fórmula, não o
  contrário).
- Adicionar a FRED API sem seguir o padrão de taxonomia de erro já
  estabelecido no projeto — isso quebraria a consistência de observability
  entre as 9 fontes agora existentes.

ENTREGA:
Plano → aprovação → implementação (fonte + fórmula) → tsc/test/build
limpos → exemplos reais de 2-3 REITs de subsegmentos diferentes.
```
