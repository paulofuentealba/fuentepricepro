---
name: fuente-architecture-review
description: Gate obrigatório para revisar qualquer plano de implementação, código, ou mudança proposta no Fuente Price Pro antes de aprovação para execução ou push. Use sempre que Paulo compartilhar um plano, diff, componente novo, ou pedir "revisa isso" / "pode aprovar?" / "confere esse código". Também use proativamente antes de aprovar qualquer PR ou sugestão de arquitetura — a revisão contra estas 9 regras é o padrão mínimo de qualidade, não opcional.
---

# Fuente Price Pro — Gate de Revisão Arquitetural (World-Class)

Este skill consolida as **9 regras de governança** do AGENTS.md. Toda proposta de código, plano, ou diff deve passar por este checklist **na íntegra** antes de qualquer aprovação. A revisão não é burocracia — é o que impede dívida técnica silenciosa, bugs em produção, e retrabalho.

**Regra de precedência (Regra 7):** Este documento vence qualquer instrução de prompt específico que conflite com ele. Se um pedido contradiz uma das 9 regras: **pare, sinalize o conflito explicitamente, aguarde decisão de Paulo** — nunca resolva a ambiguidade sozinho.

---

## O Checklist de 9 Pontos (Ordem Obrigatória)

### 1. Reusabilidade Primeiro (Regra 1)
**Pergunta obrigatória:** "Essa lógica/componente/hook já existe em outro lugar do projeto sob outro nome?"

- **Antes de criar:** Busque no codebase (Glob/Grep/Read) por equivalentes. Componentes: `src/components/**`, hooks: `src/hooks/**` ou `src/lib/use*.ts`, utils: `src/lib/utils.ts` ou `src/lib/formatters.ts`.
- **Se existir mais de uma versão:** A proposta **deve consolidar em uma só ANTES** de adicionar funcionalidade nova — não depois, não "no próximo sprint".
- **Sinal vermelho:** Novo componente `ButtonPrimary` quando já existe `Button` com variant `primary` via CVA. Novo hook `useAssetData` quando `useValuedPortfolio` já expõe o mesmo.
- **Validação:** `���` só se busca real confirmar inexistência; `���` se duplicação clara; `������` se existe similar mas com API diferente e consolidação precisa de decisão.

### 2. Zero Hardcode de Texto — i18n Enforcement (Regra 2)
**Regra absoluta:** Qualquer string visível ao usuário final em componente React = **falha crítica de compilação**, não nitpick.

- **Verificação:** Toda string de UI passa pelo sistema `t()` / `useTranslation()`? Se o diff contém `<div>Texto</div>`, `<span>{'Texto'}</span>`, ou JSX equivalente com texto solto → **reprovar**.
- **Exceção zero:** Nenhuma. Nem para "textos óbvios", "placeholders temporários", ou "só interno".
- **Validação:** `���` = 100% i18n; `���` = qualquer hardcode; `������` = keys i18n novas propostas mas não validadas no `src/lib/i18n/`.

### 3. Isolamento de Dados de Dev/Mock (Regra 3)
- **Proibido commit:** Massa de dados local/mockada no repositório principal.
- **Proibido sync:** Dados de dev com Firebase de produção.
- **Limpeza obrigatória:** Arquivos de dado de dev sem import ativo → **remover**, não deixar "por via das dúvidas".
- **Validação:** `���` = zero mocks commitados, zero sync prod; `���` = mock commitado ou sync configurado; `������` = arquivo órfão detectado, pedir remoção.

### 4. Single Source of Truth Financeiro (Regra 4) — **A Regra Mais Crítica**
`getAssetValuation` (em `src/lib/calculations.ts`) é a **única fonte de verdade** para Bazin, Graham, Gordon, Consenso. **Nenhuma tela reimplementa essas fórmulas.**

| Tipo de Tela | Regra Obrigatória |
|--------------|-------------------|
| **Estado SALVO da carteira** (MyPortfolio, PortfolioDetail, etc.) | Consome **exclusivamente** `useValuedPortfolio` (hook que já usa `getAssetValuation` internamente). Qualquer desvio = **bloqueante**. |
| **SIMULAÇÃO / Exploração** (Screener, Comparador, SmartAllocation) | Pode chamar `getAssetValuation` **diretamente**, mas **obrigatoriamente**: (a) busca dividendo-base pela **mesma função canônica** (nunca fonte paralela); (b) rotula **visualmente** qualquer parâmetro alterado pelo usuário como "cenário/simulação". |

**Pergunta de verificação:** "Essa tela está recalculando algo que já existe em `getAssetValuation`, mesmo que de forma ligeiramente diferente?" → Se sim, **bloquear**.

### 5. Mobile-First Sustentável (Regra 5)
- **Classes base Tailwind = mobile.** Desktop = expansão via `md:`/`lg:`, nunca o inverso.
- **Layout não "esmaga":** Transição correta = scroll horizontal (tabs, chips) ou colunas empilhadas (cards, tabelas) — preservando elegância no desktop.
- **Requisito de plano:** Se o plano não menciona **explicitamente** comportamento em viewport estreito (≤375px), **pedir esclarecimento antes de aprovar**. (Isso evitou o bug de overflow de tabs no `AssetDetailSheet`).
- **Teste mental:** "Funciona com uma mão, no ônibus, sob sol?"

### 6. Qualidade Visual Premium — "WOW Effect" (Regra 6)
**MVP simplificado não é entrega final.** Padrão = design moderno, microinterações refinadas, glassmorphism elegante, confiança financeira absoluta.

- **Rejeitar:** Componente de biblioteca sem customização (Radix nu), espaçamento genérico (`p-4` sem contexto), ausência de microinteração em ações-chave (adicionar ativo, confirmar transação, toggle Pro).
- **Números financeiros:** Sempre legíveis em qualquer fundo — glassmorphism **nunca** prejudica legibilidade de valor monetário.
- **Hierarquia visual:** Dado mais importante (Fuente Consensus, P&L total) = maior peso visual. Cor = funcional (verde/vermelho = acima/abaixo preço-teto), nunca decorativa.
- **Benchmark:** "Pelo menos tão claro quanto StatusInvest, mais bonito que Simply Safe Dividends."

### 7. AGENTS.md Tem Precedência — Governança (Regra 7)
- Este skill (e o AGENTS.md) **devem ser considerados lidos e aplicados** antes de propor/executar qualquer mudança — por qualquer agente.
- **Nenhum prompt específico dispensa esta checagem**, mesmo que pareça urgente/trivial.
- **Conflito = parar + sinalizar + aguardar Paulo.** Nunca decidir sozinho.

### 8. Plano de Implementação Obrigatório Antes de Executar (Regra 8)
**Antigravity NUNCA pula direto para código.** Plano escrito + aprovação prévia = obrigatório, mesmo para tarefas "pequenas/óbvias".

**Plano VÁLIDO = 3 elementos obrigatórios:**
| Elemento | O que deve conter |
|----------|-------------------|
| **(a) Arquivos** | Lista explícita de TODOS os arquivos a criar/alterar/deletar (paths relativos à raiz) |
| **(b) Lógica central** | Descrição técnica do que cada arquivo fará — algoritmos, fluxos de dados, hooks, queries, mutações |
| **(c) Pontos de Atenção & Decisões de Arquitetura** | Formato **risco → decisão**, cobrindo: trade-offs, ambiguidade, dependências, dados assumidos/decididos sozinho (ex: algoritmo para não-convergência, multi-moeda, idempotência, cache invalidation, race conditions) |

**Plano que só lista arquivos sem (c) = VIOLAÇÃO** → reprovar e pedir reformulação. O plano existe para **correção ANTES do trabalho**, não documentação depois.

**Gates de verificação final (obrigatórios no relatório de conclusão):**
```bash
npx tsc --noEmit        # 0 erros
npm run test            # 0 falhas
npm run build           # 0 erros
```
**Os 3 obrigatórios** — não só 2.

### 9. Governança de Roles (Regra 9)
Em **toda atividade substantiva** (revisão, plano, roadmap, desenho, copy, UX), Claude deve considerar **explicitamente** os 9 papéis instalados:

| Role | Quando Usa | Declaração Obrigatória |
|------|------------|------------------------|
| `fuente-architecture-review` | Sempre (este gate) | �� Sempre |
| `fuente-solution-architect` | Decisão de desenho/arquitetura técnica | Sim/Não + motivo |
| `fuente-business-architect` | Mapeamento de capacidade, jornada, modelo negócio | Sim/Não + motivo |
| `fuente-product-manager` | Priorização, triagem, classificação backlog | Sim/Não + motivo |
| `fuente-product-marketing` | Posicionamento, copy, comparação competitiva | Sim/Não + motivo |
| `fuente-ux-designer` | Tela, fluxo, componente visual, mobile-first | Sim/Não + motivo |
| `fuente-investidor-profissional` | Rigor de cálculo, credibilidade institucional | Sim/Não + motivo |
| `fuente-investidor-iniciante` | Onboarding, simplicidade, jargão, ansiedade | Sim/Não + motivo |
| `fuente-advogado-lgpd-gdpr` | Dado pessoal, consentimento, exportação, exclusão | Sim/Não + motivo |

**Formato de declaração (aparecer ANTES ou JUNTO do corpo da resposta):**
```markdown
| Role | Usado? | Motivo |
|------|--------|--------|
| fuente-architecture-review | �� | Gate obrigatório de toda revisão |
| fuente-solution-architect | �� | Decisão de onde colocar lógica nova |
| fuente-business-architect | ��� | Não há mudança de capacidade/processo |
| ... | ... | ... |
```
**Nunca omitido silenciosamente.** Ausência = decisão visível, não esquecimento.

---

## Formato de Saída da Revisão (Obrigatório)

```markdown
## Revisão Arquitetural — [nome da feature/mudança]

| # | Regra | Status | Observação |
|---|-------|--------|------------|
| 1 | Reusabilidade | ��/������/��� | [detalhe: o que existe, o que foi consolidado, ou o que falta buscar] |
| 2 | i18n | ��/������/��� | [100% i18n? keys novas validadas?] |
| 3 | Isolamento de dados | ��/������/��� | [mocks? sync? arquivos órfãos?] |
| 4 | SSOT financeiro | ��/������/��� | [useValuedPortfolio? getAssetValuation direto com regras?] |
| 5 | Mobile-first | ��/������/��� | [comportamento ≤375px descrito?] |
| 6 | Qualidade visual | ��/������/��� | [WOW effect? microinterações? hierarquia?] |
| 7 | Precedência AGENTS.md | ��/������/��� | [conflito identificado?] |
| 8 | Plano implementação | ��/������/��� | [tem (a)(b)(c)? gates 3 passam?] |
| 9 | Governança roles | ��/������/��� | [tabela de 9 roles presente?] |

**Veredito**: Aprovado / Aprovado com ressalvas / Bloqueado — [motivo específico]

---

## Princípios de Aplicação (Não Negociáveis)

1. **Static analysis �� behavioral proof.** Mesmo com 9 ��, não substitui verificação comportamental: relatório de conclusão **deve comprovar** os 3 gates (`tsc`, `test`, `build`) antes de aprovar push.
2. **Never trust agent-reported success at face value.** `���` só com checagem real contra arquivos (MCP Filesystem/GitHub) — revisão estática não prova comportamento.
3. **������ = parcialmente atendido OU requer confirmação de Paulo.** `���` = violação clara e bloqueante. Nunca marcar `���` sem evidência.
4. **Regra 4 (SSOT) é a mais comum de violar silenciosamente.** Sempre perguntar: "Onde mais esse cálculo poderia estar?" — buscar `Bazin`, `Graham`, `Gordon`, `Consenso`, `calculateFairValue` no codebase inteiro.
5. **Regra 8 (Plano) é a mais pulada.** Se não há plano com (c), **não revisar código** — pedir plano primeiro. Revisar código sem plano aprovado = violar a governança.

---

## Lembrete Final para o Revisor (Você)

> "O custo de uma revisão rigorosa agora é ordens de magnitude menor que o custo de um bug financeiro em produção, uma inconsistência de valuation entre telas, ou um retrabalho de arquitetura daqui a 3 meses. Sua assinatura neste checklist é a garantia de que o padrão Fuente Price Pro não foi negociado."