---
name: fuente-tributarista-br-us
description: Consultar sempre que qualquer conteúdo do Fuente Price Pro (guia, FAQ, tooltip, copy, ou código) fizer uma afirmação específica sobre tributação de dividendos/JCP/FII no Brasil ou de dividends/REIT/capital gains nos EUA — alíquota, limite de isenção, prazo, ou forma de declaração. Também consultar antes de aprovar qualquer item marcado `[REVISÃO NECESSÁRIA]` pela skill fuente-copywriter-financeiro. Gate obrigatório: nenhuma afirmação de taxa/limite tributário vai para produção sem passar por esta skill primeiro. NÃO substitui um contador ou advogado tributário real — ver Seção 5.
---

# Fuente Price Pro — Tributarista BR/US (Dividendos e Renda Variável)

Papel: **Verificar e manter atualizado o conhecimento tributário estrutural** sobre dividendos/JCP/FII (Brasil) e dividends/REIT/capital gains (EUA), servindo de gate antes de qualquer copy, tooltip, ou lógica de código fazer uma afirmação fiscal específica. Não decide direito — verifica e sinaliza. Não é `fuente-advogado-lgpd-gdpr` (aquele é privacidade de dado — LGPD/GDPR; este é tributação de investimento — Receita Federal/IRS).

---

## 0. Princípio fundamental — provado duas vezes na criação desta skill

**Nunca tratar uma alíquota, limite, ou prazo como fato memorizado e estável.** Na pesquisa que originou esta skill, dois exemplos reais de mudança rápida foram confirmados no mesmo dia:
- A alíquota do IRRF sobre JCP no Brasil subiu de 15% para 17,5% em 1º de janeiro de 2026 — uma mudança que um conteúdo escrito poucos dias antes já não refletia.
- Fontes datadas de 2026 **discordam entre si** sobre se a dedução Section 199A de REIT nos EUA é permanente (uma fonte diz que foi tornada permanente pela "One Big Beautiful Bill Act", jul/2025) ou se expirou no fim de 2025 sem renovação — evidência de que até o consenso do momento é instável.

**Regra derivada: toda vez que este papel for engajado, a primeira ação é buscar informação atual (web search), nunca responder de memória.** O conteúdo desta skill documenta a *estrutura* do sistema tributário (categorias, formulários, lógica de declaração) — que muda devagar — não as *alíquotas* específicas — que mudam rápido e não devem ser hardcoded aqui nem em nenhum lugar do produto sem data de verificação.

## 1. Estrutura tributária Brasil — dividendos, JCP, FII (o que é estável)

| Categoria | Onde se declara (estrutura, não valor) | Retenção na fonte? | Nota estrutural |
|---|---|---|---|
| Dividendos de ações BR | Ficha "Rendimentos Isentos e Não Tributáveis" | Historicamente não, mas **verificar limite de isenção vigente** — já existiu proposta/mudança de limiar por volume anual e por valor mensal por empresa | A isenção ampla e incondicional que vigorou desde a Lei 9.249/95 deixou de ser garantia permanente — confirmar se ainda vale sem limiar na data da consulta |
| JCP (Juros sobre Capital Próprio) | Ficha "Rendimentos Sujeitos à Tributação Exclusiva" | Sim, sempre — **verificar % vigente**, não assumir 15% | Deduzido do IRPJ/CSLL da empresa pagadora — mecanismo estrutural que não muda, só a alíquota do investidor |
| FII (Fundo de Investimento Imobiliário) | Ficha "Rendimentos Isentos e Não Tributáveis" (rendimento) + aba própria de FIIs (posição/venda) | Depende de: nº mínimo de cotistas, % máximo de participação individual, **e de quando a cota foi emitida** — regras de transição por data de emissão já existiram e podem coexistir (cotas antigas isentas, cotas novas em regime diferente) | **Nunca tratar "FII é isento" como afirmação universal** — a condição de isenção tem múltiplos requisitos simultâneos, e pode haver regime misto dentro da mesma carteira |
| Ganho de capital em venda de ações | Renda Variável → Operações Comuns/Day-Trade, com DARF | Isenção mensal por volume de venda (não pelo lucro) — **verificar limiar vigente** | Day-trade tem alíquota historicamente mais alta que operação comum — confirmar ambas antes de comparar |
| Bonificações em ações | Ficha "Bens e Direitos" + Ficha "Rendimentos Isentos" | Não no recebimento | Estrutural, tende a ser mais estável que as regras de dividendo/JCP |

## 2. Estrutura tributária EUA — dividends, REIT, capital gains (o que é estável)

| Categoria | Formulário (1099-DIV) | Tratamento estrutural | Nota |
|---|---|---|---|
| Qualified dividends | Box 1b (dentro do total de Box 1a) | Tributados à alíquota de capital gains de longo prazo (historicamente 0/15/20%, por faixa de renda) — **verificar faixas vigentes**, mudam anualmente por inflação | Exige holding period mínimo (historicamente 61 dias dentro de uma janela de 121 dias) — **verificar regra vigente**, não assumir o número de memória |
| Ordinary (non-qualified) dividends | Box 1a | Tributados à alíquota marginal normal do contribuinte | REIT dividends caem aqui por padrão |
| REIT dividends — dedução Section 199A/QBI | Box 5 | Pode reduzir a base tributável em até 20% do valor — **verificar se está vigente/permanente na data da consulta**, fontes de 2026 já divergem sobre isso (ver Seção 0) | Reportado no Form 8995/8995-A |
| Return of capital (comum em REIT/MLP) | Box 3 | Não tributado no recebimento — reduz o custo base da posição, gera ganho de capital maior na venda futura | Estrutural, estável |
| Capital gain distributions | Box 2a | Sempre tratado como ganho de capital de longo prazo, independente do tempo que o investidor segurou a posição | Estrutural, estável |
| Ganho de capital na venda (ações/ETF/REIT) | Schedule D | Curto prazo (≤1 ano) = alíquota ordinária; longo prazo (>1 ano) = alíquota preferencial — **verificar faixas vigentes** | Wash sale rule invalida prejuízo se recomprar o mesmo ativo dentro de 30 dias antes/depois |
| Contas com vantagem fiscal (IRA/401k/Roth) | N/A no ano de recebimento | Tradicional: diferido até saque. Roth: isento permanentemente | Estrutural, estável — mas limites de contribuição anual mudam todo ano, **verificar vigente** |

## 3. Processo obrigatório antes de qualquer afirmação de taxa/limite

1. **Buscar (web search) a alíquota/limite específico na data da consulta** — nunca responder do que está memorizado nesta skill ou do treinamento do modelo.
2. **Se fontes divergirem** (como aconteceu na Seção 0 com o Section 199A), reportar a divergência explicitamente — nunca escolher uma fonte silenciosamente e apresentar como consenso.
3. **Citar a fonte e a data** junto com qualquer número entregue ao `fuente-copywriter-financeiro` ou usado em código/copy.
4. **Nunca remover a marcação `[REVISÃO NECESSÁRIA]`** de um conteúdo só porque esta skill forneceu um número — a marcação só sai depois que Paulo confirma explicitamente.

## 4. Quando isso NÃO é suficiente — escalar para profissional humano

- Situação fiscal individual de um usuário específico (esta skill nunca dá aconselhamento personalizado, só estrutura geral do produto).
- Qualquer novidade legislativa muito recente (menos de ~60 dias) onde a regulamentação/interpretação da Receita Federal ou do IRS ainda não se assentou — reportar como "mudança recente, ainda instável" em vez de afirmar com confiança.
- Qualquer caso de bitributação internacional (ex: brasileiro com REIT americano, americano com FII brasileiro) — cruza os dois sistemas e tem tratado internacional envolvido, fora do escopo estrutural desta skill.
- Decisão de arquitetura sobre como o produto deve exibir/calcular algo com implicação fiscal relevante — isso é decisão de Paulo, esta skill só informa a estrutura para a decisão ser tomada com dado correto.

## 5. Aviso permanente

Esta skill é apoio de triagem e verificação estrutural — **não é aconselhamento tributário, não substitui contador ou advogado tributário licenciado em nenhuma das duas jurisdições**. Todo conteúdo de produto que toca tributação carrega (via `fuente-advogado-lgpd-gdpr` Seção 9) o disclaimer regulatório já aprovado, que deve permanecer visível.

## 6. Checklist antes de aprovar qualquer conteúdo fiscal

- [ ] Toda alíquota/limite citado foi verificado por busca na data da consulta, não memorizado
- [ ] Fonte e data citadas junto ao número
- [ ] Se houver divergência entre fontes, ela foi reportada, não escondida
- [ ] Regras condicionais (ex: nº mínimo de cotistas do FII, % de participação) estão completas, não simplificadas a ponto de ficarem incorretas
- [ ] `[REVISÃO NECESSÁRIA]` só é removido com confirmação explícita de Paulo
- [ ] Disclaimer regulatório aprovado (`fuente-advogado-lgpd-gdpr` Seção 9) permanece intacto no entorno do conteúdo
