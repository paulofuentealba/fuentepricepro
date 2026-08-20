# PROMPT [N+1] — Execução: Redesign "My Position" (Proposta 1 — Metas & Extrato)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Diferente do último prompt (auditoria), **esta rodada autoriza execução real de código**,
mas apenas depois de você declarar o plano completo na Seção 3 e eu (Paulo) confirmar.

1. **Não pule para código.** Primeiro responda com o plano no formato exigido (Seção 3:
   arquivos + lógica central + pontos de atenção/decisões). Regra 8 do `AGENTS.md`.
2. **Branch:** trabalhar em `dev`. Antes de tocar em qualquer arquivo, rode
   `git fetch origin dev:dev && git checkout dev && git pull origin dev` e confirme
   que está na branch certa (`git branch --show-current`).
3. **Nenhum `git push` sem minha confirmação explícita** depois de ver os 3 gates
   passando com output literal (não resumo).
4. Se em algum momento este prompt conflitar com o `AGENTS.md` — pare e sinalize.
   Não decida sozinho.

---

## 1. Contexto & Decisão Já Tomada

Já revisamos 3 propostas de redesign da aba **"My Position"** dentro de
`AssetDetailSheet.tsx`. **Proposta 1 foi aprovada.** Não reabrir a discussão de
qual proposta usar — o escopo desta rodada é implementação, não desenho.

**Problema original que estamos resolvendo:**
1. `Investing Since` duplicado (aparece no cabeçalho `MY PORTFOLIO` **e** dentro
   do formulário do accordion).
2. Coluna `PREVIEW` do accordion repete 100% dos cards já visíveis no painel
   `MY PORTFOLIO` acima — zero informação nova, só ocupa espaço.
3. Campos `Quantity owned` / `Average price` aparecem desabilitados no
   formulário para usuários com ledger de transações, ocupando espaço sem
   função.

**Especificação visual de referência:** ver protótipo `proposta_1_metas_e_extrato.jpg`
(anexo na conversa original com Claude — solicite se precisar).

---

## 2. O Que Muda (Especificação Funcional)

1. **Renomear o accordion** de `Update Holdings` / `Atualizar Posição e Metas`
   para **"Metas & Premissas"** (`Asset Goals & Assumptions`).
2. **Accordion passa a conter apenas 2 campos:**
   - `Target Dividend Yield (%)` — calibra o Preço-Teto Ativo (rótulo deixa
     claro que é premissa/simulação, nunca dado de mercado — Regra 4).
   - `Meta de Renda Mensal (R$)` — calibra a meta de renda e nº de cotas
     necessárias.
3. **Remover 100% da coluna `PREVIEW`** do accordion (Total Cost, Projected
   Annual Income, Yield on Cost, Goal Progress já vivem no painel `MY PORTFOLIO`
   acima — não duplicar).
4. **Remover `Investing Since` do formulário do accordion.** Mantém-se
   **exclusivamente** no seletor de data já existente no cabeçalho de
   `MY PORTFOLIO`.
5. **Gestão de Quantidade e Preço Médio:**
   - Usuário **com** transações lançadas (ledger): não aparece mais como campo
     de formulário desabilitado. A edição passa a acontecer via botão
     `+ Nova Transação` no painel `Transações e Extrato`, que já fica
     posicionado logo abaixo do accordion.
   - Usuário **sem** transações (saldo manual): exibir um link/botão discreto
     *"Ajuste manual de saldo"* que abre o fluxo de edição manual já existente
     (localizar componente atual de "ajuste de saldo manual" — não recriar,
     ver Regra 1).
6. **Botão de salvar do accordion** passa a se chamar "Salvar Metas" e só
   persiste os 2 campos de premissa (não há mais quantidade/preço para
   salvar por esse form).

---

## 3. Formato de Plano Obrigatório — Responda ANTES de tocar em código

### (a) Arquivos
Liste explicitamente todos os arquivos a criar/alterar/deletar, caminho
relativo à raiz. No mínimo, espera-se tocar em:
- `src/components/ceiling/watchlist/EditPositionFields.tsx`
- `src/components/ceiling/watchlist/AssetDetailSheet.tsx`
- `src/lib/i18n/dict.ptBR.ts`
- `src/lib/i18n/dict.en.ts`
- `src/lib/i18n/dict.es.ts`

Se identificar mais arquivos afetados (ex: tipos/props compartilhados,
testes existentes que quebram com a remoção de campos), liste todos antes
de começar — não descobrir no meio da execução.

### (b) Lógica Central
Para cada arquivo do item (a), descreva:
- O que muda estruturalmente (JSX removido/adicionado, props que deixam de
  existir, novo estado local se houver).
- Como o componente decide entre "usuário com ledger" vs "usuário sem ledger"
  para mostrar `+ Nova Transação` vs `Ajuste manual de saldo` (qual fonte de
  dado/hook já existente resolve isso — buscar antes de inventar um novo).
- Quais chaves de i18n novas serão criadas e quais chaves antigas (referentes
  a `PREVIEW`, `Investing Since` no formulário, labels de quantidade/preço
  desabilitados) ficam órfãs e devem ser removidas dos 3 dicionários — não
  deixar chave morta.

### (c) Pontos de Atenção & Decisões de Arquitetura (risco → decisão)
Obrigatório cobrir, no mínimo:
- **Reusabilidade (Regra 1):** confirmar que o componente de "ajuste manual de
  saldo" já existe e será reaproveitado, não recriado. Se não existir, sinalizar
  antes de criar um novo.
- **i18n (Regra 2):** confirmar que nenhuma string nova fica hardcoded — todo
  label novo (`Metas & Premissas`, `Salvar Metas`, `Ajuste manual de saldo`)
  entra nos 3 dicionários antes do componente usar `t()`.
- **Mobile-first (Regra 5):** descrever explicitamente o comportamento do
  accordion + link de ajuste manual em viewport ≤375px — não deixar implícito.
- **Testes existentes:** se houver teste unitário/integração que hoje cobre
  `EditPositionFields.tsx` referenciando campos removidos (quantidade, preço
  médio, preview), este plano deve dizer como esses testes serão atualizados
  — não deletar teste para "fazer passar", ajustar a asserção para o novo
  comportamento.
- **Retrocompatibilidade de dado salvo:** confirmar que a remoção de
  quantidade/preço do formulário não afeta a função canônica de mutação
  (`recalculateHoldingFromTransactions`) — este form nunca deveria ter escrito
  diretamente nesses campos fora dela; se escrevia, isso é achado a reportar
  antes de prosseguir, não silenciar.

---

## 4. Gates de Verificação Final (Obrigatórios, com Output Literal)

Só reportar conclusão depois de rodar os 3 e colar o output real (não
paráfrase, não "passou tudo"):

```bash
npx tsc --noEmit
npm run test
npm run build
```

Além disso, validação visual manual: abrir `/app/myportfolio` em
`localhost:5173`, abrir `AssetDetailSheet` de um ativo com transações e de um
ativo sem transações (saldo manual), confirmar visualmente que:
- Accordion mostra só 2 campos (Target Yield, Meta Mensal).
- Não há coluna PREVIEW.
- Não há campo `Investing Since` dentro do accordion.
- `+ Nova Transação` aparece para ativo com ledger; `Ajuste manual de saldo`
  aparece para ativo sem ledger.

---

## 5. Governança & Registro

- Commit message: `feat(watchlist): redesign My Position accordion — Metas & Premissas [Item N]`
  (substituir N pelo número real do prompt na sequência).
- Atualizar `PROMPTS_LOG.md` (append-only) ao final com resumo do que foi feito.
- Atualizar `BACKLOG_V2.md` se este item estiver referenciado lá.
- **Não faça `git push`.** Deixe o diff pronto localmente e me avise que está
  pronto para revisão.

---

## 6. Lembrete Final

Comece pela Seção 3 (o plano). Eu e Claude revisamos antes de você tocar em
qualquer arquivo. Se o plano vier sem o item (c) completo, será devolvido
sem revisão de código — não é opcional.
