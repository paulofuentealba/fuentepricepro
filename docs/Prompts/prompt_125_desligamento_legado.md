# PROMPT 125 — Item 2, Fase 4: Desligamento do Caminho Legado
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Atue como Engenheiro Backend/Frontend Sênior. Apresente PLANO (Regra 8)
antes de qualquer código — esta é a fase de MAIOR risco de regressão de
toda a migração, o plano precisa detalhar o critério de rollback.

CONTEXTO:
BFF (fetchValuedPortfolioFn, Fase 3/Prompt 121) já em produção, validado
por paridade, já carregando o contrato COMPLETO de ValuationResult
(incluindo todas as classes das Fases 2.1-2.5 e assumptions[] usado pela UI
da Fase 2.6). Esta é a última fase: remover o caminho client-side legado.

ESCOPO:
- Migrar useValuedPortfolio para consumir EXCLUSIVAMENTE
  fetchValuedPortfolioFn, removendo o merge pesado no cliente (as 6-7
  chamadas concorrentes mapeadas na discovery original).
- Remover código morto: lógica de merge client-side, chamadas diretas
  redundantes a useWatchlist/useTransactions/useLiveQuotesAndMeta/
  useSelic/exchangeRateQueryOptions que hoje alimentam o cálculo local
  (mantendo apenas o que ainda for necessário para outras telas que não
  sejam a carteira valuada).
- Confirmar que o Feature Gate está 100% migrado (não fica meio-flag,
  meio-hardcoded) antes de remover o código antigo.

PROIBIDO:
- Remover o caminho legado sem um período de flag em 100% dos usuários
  estável (definir esse período no plano, sujeito à aprovação de Paulo).
- Remover qualquer hook que outras telas (não-carteira) ainda usem
  diretamente — verificar todos os usos antes de deletar (Regra 1,
  invertida: não remover reusável ainda em uso).
- Fazer isso como "limpeza incidental" dentro de outro prompt — esta fase é
  isolada e precisa de commit próprio, rastreável.

ENTREGA:
Plano (com critério de rollback explícito) → aprovação → implementação →
tsc/test/build limpos → relatório de redução de bundle/chamadas de rede
medida antes/depois.
```
