# PROMPT — CRÍTICO: dado de provento incorreto exibido em produção (não é só campo vazio)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.
> Prioridade máxima — isso é confiança do usuário no produto, trate como
> P0.

---

## 🛑 MODO DE OPERAÇÃO

Investigação primeiro, com evidência literal e cruzada contra dado real de
mercado — não contra o que o sistema acha que está certo. Nenhuma correção
de código nesta rodada até a causa raiz ser confirmada com evidência (Regra
7 do `AGENTS.md`: investigar antes de agir). Depois de identificada a causa,
retorne com plano de correção (Regra 8) antes de codar — não implemente
direto.

---

## 1. O problema real (não é o que foi reportado antes)

O diagnóstico anterior tratou isso como "campo `Payment` vazio" — parcialmente
verdade, mas **incompleta e mais grave**. Comparei o AFHI11 (print de
produção, tela "Ex-Date/Payment/Type/Amount") contra dado real de mercado
(StatusInvest, FundsExplorer, Fiis.com.br — todas as fontes batem entre si):

**Dado real do AFHI11 (confirmado, meses recentes):**
| Data-com | Pagamento | Valor |
|---|---|---|
| 14/07/2026 | 21/07/2026 | R$ 1,03 |
| 15/06/2026 | 22/06/2026 | R$ 1,03 |
| 15/05/2026 | 22/05/2026 | R$ 1,03 |
| 15/04/2026 | 23/04/2026 | R$ 0,98 |
| 13/03/2026 | 20/03/2026 | R$ 0,97 |
| 13/02/2026 | 24/02/2026 | R$ 0,97 |

**Dado exibido no app (produção, print do usuário):** `R$ 1,15` repetido
várias vezes seguidas, depois `R$ 1,00` repetido várias vezes seguidas,
`Payment` sempre `-`, datas de `Ex-Date` que não correspondem a nenhuma
data-com real do ativo.

**Isso não é dado desatualizado — é dado que nunca existiu para esse
ativo.** O padrão de valor idêntico repetindo em sequência é característico
de fallback sintético/estimado sendo exibido como se fosse dado real, OU de
mapeamento de ticker incorreto (proventos de outro fundo/ativo aparecendo
sob o cadastro do AFHI11). Não decida qual das duas hipóteses é a certa sem
evidência — investigue e reporte com prova.

---

## 2. Investigação obrigatória — nesta ordem

### 2.1 Confirme a fonte real do dado exibido para AFHI11 em produção

Leia o documento `assets/AFHI11` no Firestore de produção (ou o cache
equivalente) e cole o conteúdo bruto e completo do array de
`dividendEvents`/proventos armazenado. Confirme:
- Os valores `1.15`/`1.00` batem com o que está persistido, ou a UI está
  aplicando alguma transformação/agregação que distorce o valor exibido?
- Existe algum campo indicando a origem do dado (`source`, `estimated`,
  `paymentDateEstimated` — vi essa flag em `dadosDeMercadoScraper.server.ts`)
  marcado como estimado/sintético nesse documento?

### 2.2 Confirme se não é erro de mapeamento de ticker

Ainda no mesmo documento, confirme se o `ticker`/`symbol` interno bate com
`AFHI11` de fato, ou se há alguma normalização de ticker
(`classify.server.ts`, ou lógica de resolução de ticker BR) que possa estar
resolvendo `AFHI11` para o código de outro ativo por engano.

### 2.3 Rode o script de validação para AFHI11 especificamente e compare

```bash
npx tsx scripts/validate-bolsai-hgbrasil.ts
```

Cole o "Raw Response" completo de `AFHI11` (não resumido) e compare campo a
campo com a tabela da Seção 1. Se a API HG Brasil já devolve o dado
CORRETO (que deveria bater com a tabela real), mas o app mostra o dado
ERRADO, a causa é no pipeline de ingestão/cache/persistência — não na fonte.
Se a própria API já devolver dado divergente da tabela real, é outra
investigação (comparar contra Brapi e Dados de Mercado para esse ticker
também).

### 2.4 Confira se existe lógica de estimativa/projeção sendo exibida como se fosse real

Procure por qualquer lógica de "próximo pagamento estimado" ou "projeção"
que possa estar gerando os valores `1.15`/`1.00` repetidos (padrão típico
de projeção linear baseada em média, não de dado real evento a evento).
Se existir, confirme se há alguma falha de UI/label que apresenta essa
estimativa sem indicar visualmente que é estimativa — isso sozinho já seria
uma falha grave de confiança, mesmo que a lógica de estimativa em si esteja
correta.

---

## 3. Escopo da correção — depois da causa confirmada

**Não é para corrigir só o AFHI11.** O AFHI11 é usado como exemplo/prova,
mas o problema é sistêmico. A correção final deve cobrir:

1. **Primeiro: todos os ativos nacionais (BR)** — ações, FIIs, FIAGROs.
2. **Depois: ativos internacionais (US)** — que usam pipeline de dados
   diferente (não passam pela HG Brasil), então precisam de investigação
   própria antes de assumir que a mesma causa raiz se aplica lá.

Não implemente a correção de internacional nesta rodada — foque em
confirmar e corrigir a causa raiz para BR primeiro, com verificação real
contra pelo menos 3 tickers BR de tipos diferentes (ação, FII, FIAGRO) antes
de declarar concluído.

---

## 4. Padrão de verificação obrigatório antes de declarar "corrigido"

Isso já causou retrabalho múltiplas vezes neste projeto — desta vez, antes
de qualquer relatório de "corrigido", faça o seguinte para pelo menos 3
tickers BR de categorias diferentes:

1. Busque o dado real do ativo em uma fonte pública (StatusInvest, Fiis.com.br,
   FundsExplorer, ou InvestSite/InvestNews para ações) e cole a tabela real.
2. Cole o dado que o sistema está prestes a exibir para o mesmo ticker,
   lado a lado.
3. Confirme visualmente, célula por célula, que batem — data-com, data de
   pagamento, valor. Não aceite "está no formato certo" como prova de que
   está correto — formato certo com valor errado é exatamente o bug atual.

Sem essa comparação explícita e colada no relatório, o "corrigido" não é
aceito.

---

## 5. O que NÃO fazer nesta rodada

- Não corrija nada até confirmar a causa raiz com evidência da Seção 2.
- Não implemente nada para ativos internacionais ainda.
- Não faça commit nem push sem aprovação explícita — e depois do episódio
  recente do push não autorizado de `main`/`dev`, isso vale ainda mais:
  qualquer push nesta tarefa, mesmo que pareça pequeno, espera aprovação
  explícita minha e de Paulo antes de acontecer.

---

## 6. Entrega final

1. Conteúdo bruto de `assets/AFHI11` (Seção 2.1/2.2).
2. Raw Response da HG Brasil para AFHI11 via script (Seção 2.3), comparado
   célula a célula com a tabela real da Seção 1.
3. Confirmação ou descarte da hipótese de estimativa/projeção sendo exibida
   como dado real (Seção 2.4).
4. Causa raiz identificada, com evidência — não com suposição.
5. Plano de correção proposto (não implementado ainda) cobrindo todos os
   ativos BR primeiro, com o padrão de verificação da Seção 4 já desenhado
   para a próxima rodada.
