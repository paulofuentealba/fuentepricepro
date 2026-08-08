---
name: fuente-architecture-review
description: Gate obrigatório para revisar qualquer plano de implementação, código, ou mudança proposta pelo Antigravity (ou por qualquer agente) no projeto Fuente Price Pro, antes de aprovação para execução ou push. Use sempre que Paulo compartilhar um plano de implementação, um diff, um componente novo, ou pedir "revisa isso" / "pode aprovar?" / "confere esse código" no contexto do Fuente Price Pro. Também use proativamente antes de aprovar qualquer PR ou sugestão de arquitetura, mesmo que Paulo não peça explicitamente — a revisão contra estas 9 regras é o padrão mínimo de qualidade do projeto, não uma opção.
---

# Fuente Price Pro — Gate de Revisão Arquitetural

Este skill consolida as 9 regras de governança do AGENTS.md do projeto Fuente Price Pro. Toda proposta de código, plano de implementação, ou diff deve passar por este checklist antes de qualquer aprovação de push.

**Regra de precedência (Regra 7 do AGENTS.md):** este documento vence qualquer instrução de prompt específico que conflite com ele. Se um pedido do Paulo ou um plano do Antigravity contradiz uma das 9 regras abaixo, o Claude deve **parar e sinalizar o conflito explicitamente** — nunca decidir sozinho qual seguir.

## O checklist de 9 pontos

Ao revisar qualquer proposta, percorra os 9 pontos nesta ordem. Não aprove nada que falhe em qualquer um deles sem que Paulo confirme explicitamente que aceita a exceção.

### 1. Reusabilidade primeiro
- Antes de aceitar um componente/hook/função novo: buscar no projeto (via MCP Filesystem ou GitHub) se já existe algo equivalente.
- Se existir mais de uma versão do mesmo componente, a proposta deve consolidar em uma só ANTES de adicionar funcionalidade nova — não depois, não "num próximo sprint".
- Pergunta de verificação: "Essa lógica já existe em algum outro lugar do projeto sob outro nome?"

### 2. Zero hardcode de texto (i18n)
- Qualquer string visível ao usuário final em um componente React é falha crítica, não um nitpick.
- Verificar: toda string de UI passa pelo sistema de i18n existente? Se o plano/diff contém `<div>Algum texto</div>` ou JSX equivalente com texto solto, reprovar.

### 3. Isolamento de dados de dev/mock
- Nenhuma massa de dados local/mockada pode ser commitada no repositório principal.
- Nenhuma sincronização de dados de dev com o Firebase de produção.
- Arquivos de dado de dev sem import ativo devem ser removidos, nunca deixados "por via das dúvidas". Se o diff introduz um arquivo assim, sinalizar para remoção antes de aprovar.

### 4. Single Source of Truth financeiro
- `getAssetValuation` é a única fonte de verdade para Bazin/Graham/Gordon/Consenso. Nenhuma tela pode reimplementar essas fórmulas por conta própria.
- Telas de estado SALVO da carteira: devem consumir exclusivamente `useValuedPortfolio`. Qualquer desvio disso é bloqueante.
- Telas de SIMULAÇÃO/exploração: podem chamar `getAssetValuation` diretamente, mas só se (a) buscarem o dividendo-base pela mesma função canônica (nunca uma fonte paralela), e (b) rotularem visualmente qualquer parâmetro alterado pelo usuário como "cenário/simulação".
- Pergunta de verificação: "Essa tela está recalculando algo que já existe em `getAssetValuation`, mesmo que de forma ligeiramente diferente?"

### 5. Mobile-first sustentável
- Classes base do Tailwind devem definir o layout mobile; desktop é expansão via `md:`/`lg:`, nunca o inverso.
- Layout não pode "esmagar" no mobile — a transição correta é scroll horizontal ou colunas empilhadas, preservando elegância no desktop.
- Se o plano não menciona explicitamente como o componente se comporta em viewport estreito, pedir esclarecimento antes de aprovar (isso é o que causou o bug de overflow de tabs no `AssetDetailSheet`).

### 6. Qualidade visual premium
- MVP simplificado não é aceitável como entrega final — o padrão é "WOW effect" imediato: design moderno, microinterações refinadas, glassmorphism elegante, confiança financeira absoluta.
- Se a proposta é visivelmente genérica (componente de biblioteca sem customização, "Bootstrap-like"), sinalizar como insuficiente para o padrão do projeto.

### 7. AGENTS.md tem precedência (governança)
- Este arquivo (e por extensão este skill) deve ser considerado lido e aplicado antes de propor ou executar qualquer mudança de código — por qualquer agente, incluindo Claude e Antigravity.
- Nenhum prompt de tarefa específico dispensa esta checagem, mesmo que pareça urgente ou trivial.
- Em caso de conflito entre uma instrução pontual e uma destas regras: **parar, sinalizar o conflito, e aguardar decisão explícita de Paulo** — não resolver a ambiguidade por conta própria.

### 8. Plano de implementação obrigatório antes de executar
Antes de qualquer alteração de código, o Antigravity deve apresentar um plano escrito e aguardar aprovação — nunca pular direto para execução, mesmo em tarefas que pareçam pequenas ou óbvias.

O plano é considerado válido **somente** se contiver todos os três elementos:
- (a) Lista explícita dos arquivos que serão criados/alterados
- (b) A lógica central de cada mudança
- (c) Uma seção de **"Pontos de Atenção & Decisões de Arquitetura"** no formato **risco → decisão**, cobrindo qualquer trade-off, ambiguidade, dependência, ou dado que o Antigravity precisou assumir/decidir sozinho durante a leitura do código (ex: qual algoritmo usar em caso de não convergência, como tratar multi-moeda, como garantir idempotência)

**Um plano que só lista arquivos sem os pontos de atenção é uma violação desta regra**, mesmo que o resultado final esteja correto. Reprovar e pedir reformulação do plano — não deixar passar "porque no fim vai dar certo".

O plano existe para permitir correção ANTES do trabalho ser feito, não para documentar depois. Portanto: revisar o plano é sempre anterior a revisar o código já escrito.

### 9. Governança de roles (Regra 9)
Em toda atividade substantiva do projeto — revisão, plano, roadmap, desenho de solução, copy, UX — Claude deve considerar explicitamente os seis papéis instalados: `fuente-architecture-review`, `fuente-solution-architect`, `fuente-business-architect`, `fuente-product-manager`, `fuente-product-marketing`, `fuente-ux-designer`.

- Se um papel não se aplica à atividade em questão, isso deve ser **declarado explicitamente**, com o motivo — nunca omitido silenciosamente.
- Esta declaração deve aparecer antes ou junto do corpo principal da resposta, tipicamente como uma tabela `Role | Usado? | Motivo`.
- Regra 9 é meta-governança: ela garante que a ausência de um papel numa atividade seja uma decisão visível, não um esquecimento.

## Formato de saída da revisão

Ao aplicar este checklist, estruturar a resposta assim:

```
## Revisão Arquitetural — [nome da feature/mudança]

| # | Regra | Status | Observação |
|---|-------|--------|------------|
| 1 | Reusabilidade | ✅/⚠️/❌ | ... |
| 2 | i18n | ✅/⚠️/❌ | ... |
| 3 | Isolamento de dados | ✅/⚠️/❌ | ... |
| 4 | SSOT financeiro | ✅/⚠️/❌ | ... |
| 5 | Mobile-first | ✅/⚠️/❌ | ... |
| 6 | Qualidade visual | ✅/⚠️/❌ | ... |
| 7 | Precedência AGENTS.md | ✅/⚠️/❌ | ... |
| 8 | Plano de implementação | ✅/⚠️/❌ | ... |
| 9 | Governança de roles | ✅/⚠️/❌ | ... |

**Veredito**: Aprovado / Aprovado com ressalvas / Bloqueado — motivo
```

Usar ⚠️ quando a regra é parcialmente atendida ou requer confirmação de Paulo; ❌ apenas para violação clara e bloqueante. Nunca marcar ✅ em uma regra sem checar contra os arquivos reais do projeto (via MCP Filesystem ou GitHub) — revisão de código estático não é prova comportamental (ver princípio geral já estabelecido: "Never trust agent-reported success at face value").

## Lembrete final

Static code analysis ≠ behavioral proof. Mesmo que todas as 9 regras deste checklist estejam ✅, isso não substitui a verificação comportamental: todo relatório de conclusão de tarefa deve comprovar obrigatoriamente a aprovação dos 3 gates de verificação (`npx tsc --noEmit` limpo sem 0 erros, `npm run test` sem falhas, e `npm run build` limpo) antes de aprovar push para produção.
