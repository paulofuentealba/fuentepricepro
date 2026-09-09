# Prompt para Antigravity — Teste Empírico: GORDON_MAX_GROWTH_VOLATILITY 25% vs 35% (Item 4)

## Modo de operação

`[REVISÃO]`. Script de análise read-only — não altera `calculations.ts` nem nenhum arquivo de produção. Objetivo: gerar dado real para Paulo decidir o limiar, em vez de decidir no escuro por benchmark genérico.

## Contexto

`GORDON_MAX_GROWTH_VOLATILITY` (hoje `0.35`, 35%) controla quando `resolveGordonConfidence` marca a confiança do modelo Gordon como `"low"` — usa `calculateDividendGrowthVolatility(dividendHistory)` (desvio-padrão amostral do crescimento YoY de dividendos) comparado contra esse limiar. Claude propôs dois valores candidatos para comparação empírica: **35% (atual)** vs **25% (mais rigoroso, alinhado a padrão de analista institucional)**.

## Escopo técnico

1. Escrever um script standalone (`scripts/audit-gordon-volatility.ts` ou local temporário — não precisa virar parte permanente do repo) que:
   - Carrega o `dividendHistory` de todos os ativos disponíveis na base atual (via a mesma fonte que os testes/fixtures já usam — checar `src/__fixtures__/devMockData.ts` primeiro; se for necessário dado real de produção, usar o Firestore de **dev**, nunca produção, e confirmar isolamento antes de rodar — Regra 3 do AGENTS.md é inegociável aqui).
   - Para cada ativo com `dividendHistory.length >= 3`, calcula `calculateDividendGrowthVolatility(dividendHistory)` (importar direto de `@/lib/calculations`, não reimplementar).
   - Classifica cada ativo em 3 grupos: `confiança alta nos dois limiares`, `confiança alta em 35% mas baixa em 25%` (a zona de divergência que importa), `confiança baixa nos dois`.
2. Reportar uma tabela: ticker, tipo de ativo, volatilidade calculada, status em 35%, status em 25%.
3. Reportar contagem agregada: quantos ativos mudam de "alta" para "baixa" confiança se o limiar cair de 35% para 25%.

## Pontos de Atenção & Decisões de Arquitetura

| Risco | Decisão |
|---|---|
| Rodar contra Firestore de produção violaria a Regra 3 (isolamento dev/prod) | Usar exclusivamente `src/__fixtures__/devMockData.ts` ou o ambiente de dev do Firestore — nunca produção. Se a base de dev não tiver histórico de dividendos suficiente pra uma amostra representativa, reportar isso explicitamente em vez de forçar contra produção |
| O script é ferramenta de análise, não funcionalidade do produto | Não commitar como parte de `src/lib/` nem de qualquer rota — manter em `scripts/` (já existe `scripts/check.py` como precedente) ou deletar após reportar o resultado, à sua escolha |

## Proibido

- Alterar `GORDON_MAX_GROWTH_VOLATILITY` ou qualquer constante em `calculations.ts` nesta passada — é só coleta de dado.
- Rodar contra Firestore de produção.
- Commit de mudança em `calculations.ts` (um eventual commit do script em `scripts/`, se você optar por mantê-lo, é aceitável e separado).

## Governança de roles (Regra 9)

| Role | Usado? | Motivo |
|---|---|---|
| `fuente-architecture-review` | ✅ | Gate obrigatório |
| `fuente-investidor-profissional` | ✅ | O limiar mais rigoroso (25%) é o que um analista institucional aplicaria — dado empírico valida ou refuta essa hipótese |
| Demais 7 roles | ❌ | Análise puramente numérica, sem UI/negócio/dado pessoal envolvido |

## Saída esperada

Tabela completa + contagem agregada de divergência entre os dois limiares, para eu levar de volta pra Paulo decidir com número na mão.
