# Prompt para Claude Code — Proteção Contra Duplicata em Lançamento Manual de Transação

## Contexto e diagnóstico confirmado

`TransactionFormFields.tsx` gera `id: crypto.randomUUID()` pra cada
transação nova — diferente do import CSV/PDF, que usa ID determinístico
(`ticker-data-quantidade-preço`) e por isso é idempotente. Isso por si só
não é o problema real: **o botão Salvar não desabilita durante o
`await onSave(tx)`** — nenhum estado de `isSaving`/`isSubmitting` existe
no componente. Um duplo-clique (ou rede lenta seguida de novo clique)
dispara 2 chamadas de `upsertTransaction`, cada uma com um `randomUUID()`
diferente, criando 2 transações genuinamente duplicadas.

## Decisão de produto já tomada (não reabrir)

**Não usar ID determinístico com sobrescrita silenciosa aqui**, ao
contrário do CSV/PDF. Diferença importante: reimportar o mesmo arquivo
CSV é sempre "a mesma informação de novo" (correto colapsar). Mas um
lançamento manual com ticker/data/quantidade/preço idênticos **pode ser
uma segunda compra real e intencional** (ex: comprou o mesmo lote 2x no
mesmo dia, coincidência de valores) — sobrescrever silenciosamente
arriscaria apagar dado real do usuário. A solução é **prevenir o clique
duplo** (causa mais provável) e **avisar, sem bloquear**, quando detectar
uma transação já idêntica (deixando o usuário decidir).

## Escopo técnico

### 1. Travar o botão durante o salvamento (correção principal)

Em `TransactionFormFields.tsx`:
- Adicionar estado `const [isSaving, setIsSaving] = useState(false)`.
- `handleSubmit` (async agora, já que precisa aguardar `onSave`): setar
  `isSaving(true)` antes de chamar `onSave`, `isSaving(false)` no
  `finally` (mesmo em caso de erro, pra não travar o botão pra sempre se
  `onSave` falhar).
- Botão Save: `disabled={disabled || isSaving || !date || !quantity || !pricePerShare}`,
  mostrar um spinner/texto "Salvando..." enquanto `isSaving` (mesmo padrão
  visual já usado em outros lugares do app pra estado de loading — ex:
  `BrokerNoteUploader.tsx`/`CsvImportUploader.tsx`, verificar convenção
  antes de inventar uma nova).
- `onSave` (a prop) hoje é síncrona (`(tx: Transaction) => void`) em
  alguns callers e implicitamente assíncrona em outros (`NewContributionDialog.tsx`
  já usa `async function handleSaveTransaction`) — ajustar a assinatura do
  tipo pra `onSave: (tx: Transaction) => void | Promise<void>` e usar
  `await onSave(tx)` dentro do `handleSubmit`, funcionando pros dois casos.

### 2. Aviso de possível duplicata (sem bloquear, sem sobrescrever)

Antes de chamar `onSave`, verificar em `existingTransactions` (prop já
recebida) se já existe uma transação com o mesmo `ticker`+`type`+`date`
(mesmo dia, comparar só a data, não o timestamp exato)+`quantity`+`pricePerShare`.
Se existir:
- Mostrar um `AlertDialog`/confirmação (não um simples `alert()` do
  browser — usar o componente de dialog de confirmação já existente no
  app, se houver um padrão, ex: verificar se `AlertDialog` do shadcn/ui já
  está em uso em algum lugar) com o texto: algo como "Já existe uma
  transação idêntica registrada para {ticker} em {data}. Deseja salvar
  mesmo assim?" (criar chave i18n nos 3 idiomas).
- Só prosseguir com `onSave` se o usuário confirmar explicitamente.
- Essa checagem é client-side, contra os dados já carregados
  (`existingTransactions`), sem chamada extra ao servidor.

## Regras obrigatórias

- Não implementar ID determinístico com sobrescrita silenciosa para
  transações manuais — essa decisão já foi tomada, não reabrir.
- Não alterar o comportamento de idempotência do CSV/PDF (esses
  continuam com ID determinístico e sobrescrita silenciosa, é o
  comportamento correto pra eles).
- Aplicar a correção em `TransactionFormFields.tsx` — como já é o
  componente compartilhado por `TransactionForm.tsx`,
  `NewContributionDialog.tsx`, é automaticamente aplicado aos 3 pontos de
  entrada (Registrar Aporte, Adicionar Renda Variável, edição de
  transação existente via `TransactionsPanel`).

## Testes obrigatórios

1. Simular duplo-clique rápido no botão Save (ex: disparar `handleSubmit`
   duas vezes em sequência síncrona) → confirmar que só 1 transação é
   criada (a segunda chamada é bloqueada pelo `disabled`/`isSaving`).
2. Salvar uma transação com valores idênticos a uma já existente →
   confirmar que o aviso aparece antes de salvar.
3. Confirmar no aviso → transação salva normalmente (2 transações
   distintas no histórico, ambas preservadas — não vira 1).
4. Cancelar no aviso → nenhuma transação nova criada.
5. Salvar uma transação com valores diferentes de qualquer existente →
   confirma que salva direto, sem aviso nenhum.

## Verificação obrigatória (evidência real)

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Evidência do teste de duplo-clique (cenário 1) confirmando só 1
   transação criada
3. Screenshot do aviso de possível duplicata

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
