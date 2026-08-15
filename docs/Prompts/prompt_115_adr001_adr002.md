# PROMPT 115 — ADR-001 (BFF) + ADR-002 (Dispatcher de Valuation)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

```
Você vai atuar como Arquiteto de Software Sênior. Esta é uma tarefa de
DOCUMENTAÇÃO APENAS — nenhum código de produção deve ser criado ou alterado
nesta rodada.

CONTEXTO:
Duas discoveries arquiteturais já foram aprovadas por Paulo e Claude:
(1) Migração de arquitetura de dados para BFF + normalização Firestore
    (/assets, /users/{uid}/transactions, /users/{uid}/positions).
(2) Especialização do motor de valuation por classe de ativo via dispatcher
    centralizado em src/lib/calculations.ts.

TAREFA:
Criar DOIS ADRs formais em docs/architecture/adrs/:

1. ADR-001-bff-e-normalizacao-firestore.md
   - Contexto, decisão, alternativas consideradas (API Gateway, GraphQL —
     e por que foram rejeitadas), consequências, contrato ValuedPortfolioDTO
     completo (incluir MoneyDTO com amountCents).
   - Registrar explicitamente: /users/{uid}/positions tem DONO ÚNICO de
     escrita (Cloud Function onWrite em transactions). Nenhum outro caminho
     escreve nesta coleção — sinalizar isso como regra arquitetural, não
     sugestão.

2. ADR-002-dispatcher-valuation-por-classe.md
   - Contexto (limitação do Bazin/Graham/Gordon genérico para FIIs/REITs/
     Stocks US/ETFs), decisão (dispatcher único dentro de getAssetValuation,
     PROIBIDO criar calculationsBR.ts/calculationsUS.ts etc.), contrato
     completo de ValuationResult e ValuationAssumption (ver histórico desta
     conversa — reproduzir os dois interfaces TypeScript exatamente).
   - Registrar explicitamente: o array `assumptions[]` já deve conter label,
     helperText e confidenceBadge RESOLVIDOS pelo backend — o frontend nunca
     decide isso (princípio "frontend burro" já aprovado).

PROIBIDO:
- Criar, alterar ou deletar qualquer arquivo em src/.
- Definir valores numéricos finais de spread/taxa/yield — isso é decisão de
  cada fase de implementação futura, não do ADR.
- Decidir sozinho qualquer ambiguidade entre os dois ADRs — se notar
  conflito, PARE e liste o conflito para decisão de Paulo/Claude.

ENTREGA:
Os dois arquivos ADR completos, mais um resumo de 3-5 linhas de cada um no
chat. Aguardar aprovação antes de qualquer prompt seguinte.
```
