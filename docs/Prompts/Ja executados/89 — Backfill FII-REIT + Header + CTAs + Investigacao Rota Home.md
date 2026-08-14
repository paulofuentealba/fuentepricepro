# PROMPT 89 — Backfill FII/REIT + Limpeza do Header + CTAs + Investigação de Rota Home
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Este prompt tem 4 itens independentes. Execute na ordem abaixo, um de
cada vez, com gate de saída próprio por item — não misture os diffs.
O Item 1 é **investigação, não correção** — não altere código nele,
só reporte o que encontrar.

---

## ITEM 1 — Investigação: rota "home" apontando para `/app/myportfolio`

**Contexto:** Paulo reportou ver comportamento onde a home antiga
(`/app/myportfolio`) ainda é tratada como destino principal em algum
lugar da aplicação, mesmo após a criação da página FI (`Horizonte`) em
`/app`. Uma varredura prévia já confirmou que os pontos óbvios estão
corretos:
- `Header.tsx:149,235` (`goToTerminal`) → `/app` ✅
- `routes/index.tsx:121,130` (`ctaTerminal`) → `/app` ✅
- `Sidebar.tsx:62-63` e `MobileBottomNav.tsx` já tratam `home` (`/app/`)
  e `myportfolio` (`/app/myportfolio`) como abas distintas ✅

**Tarefa:** Varrer especificamente os pontos que a varredura anterior
NÃO cobriu — são os candidatos mais prováveis de esconder o bug:
1. Redirect pós-login / pós-signup (onde o usuário cai depois de
   autenticar pela primeira vez).
2. Redirect ao final do fluxo de onboarding (`src/components/onboarding/`
   e qualquer `navigate()`/`router.navigate()` associado).
3. Fallback de rota protegida (o que acontece se um usuário deslogado
   tenta acessar uma rota `/app/*` — para onde ele é mandado de volta
   depois de logar).
4. Botão de logo/marca (clique no ícone/nome do app no Header) — para
   onde ele leva quando o usuário já está dentro do app.
5. Qualquer `beforeLoad` ou guard de rota em `src/routes/app.tsx`
   (rota-pai) que redirecione para um path fixo.
6. Deep links salvos em emails transacionais/notificações (se
   existirem no repo — buscar por templates de email).

**Saída esperada:** Não altere nada. Reporte, para cada um dos 6
pontos acima: o arquivo/linha, o path atual de destino, e se está
correto (`/app`) ou desatualizado (`/app/myportfolio` como se fosse
home). Se nenhum dos 6 pontos existir no projeto ainda (ex: não há
fluxo de onboarding com redirect), diga isso explicitamente em vez de
omitir o item.

---

## ITEM 2 — Backfill de Classificação FII/REIT (Correção de Dado, não de Código)

**Contexto:** O bug de ordem em `classifyYahoo` (Prompt 86) já foi
corrigido no código — toda classificação NOVA está correta. Mas o
campo `type` de um ativo é calculado uma única vez, no momento em que
é adicionado à watchlist (`apiService.functions.ts`,
`brapi.server.ts`, `yahoo.server.ts`, todos chamando
`classifyYahoo`/`classifyBr` só no momento do add/import), e depois
persiste no Firestore. Ativos adicionados ANTES do fix do Prompt 86
ficaram com `type: "REIT"` gravado incorretamente (deveria ser `FII`)
e continuam errados até o dado em si ser corrigido — reclassificar o
código não conserta dado já salvo.

### 2.1 Script de backfill (fora da aplicação, uso único)
- Criar `scripts/backfill-fii-reit-classification.ts`, seguindo o
  padrão de scripts existentes (`scripts/seed-feature-gates.ts`),
  usando Admin SDK.
- Lógica:
  1. Percorrer todos os documentos de ativos que tenham `type: "REIT"`
     (em todas as coleções relevantes — watchlist de cada usuário,
     `portfolio/`, e qualquer outra coleção que armazene `AssetType`
     por ativo — mapear todas antes de rodar, não assumir só uma).
  2. Para cada documento, verificar se o ticker é brasileiro (termina
     em `.SA` ou não tem sufixo de mercado US) e se `classifyBr(ticker)`
     retornaria `"FII"` para ele.
  3. Se sim, é um falso-REIT — atualizar o campo `type` para `"FII"`.
  4. Rodar primeiro em modo `--dry-run` (flag de linha de comando)
     que apenas LISTA os documentos que seriam alterados, sem gravar
     nada. Paulo revisa a lista antes de rodar de verdade.
  5. Só com `--execute` explícito o script grava as mudanças.
- Logar no console: total de documentos verificados, total de
  documentos corrigidos, e a lista de tickers afetados (para o
  relatório de execução).
- **Não** rodar em modo `--execute` nesta rodada sem aprovação — a
  saída deste item é o script pronto + o resultado do `--dry-run`,
  reportado para Paulo revisar antes de autorizar a escrita real.

### 2.2 Teste de regressão (lacuna identificada anteriormente)
- Confirmar se já existe teste automatizado cobrindo a ordem correta
  de `classifyYahoo` (`.SA` antes do regex de REIT). Se não existir,
  criar em `src/lib/api/__tests__/classify.server.test.ts` (ou local
  equivalente) cobrindo pelo menos os casos:
  `HGLG11.SA` → `FII`, `KNCR11.SA` → `FII`, `O.SA` → `STOCK_BR`
  (via `classifyBr`), `O` (sem `.SA`) → `REIT`.

### Gate de saída do Item 2
- `npx tsc --noEmit`, `npx vitest run` (incluindo o teste novo do 2.2),
  `npm run build`.
- Resultado do `--dry-run` do script de backfill, com a lista completa
  de tickers/documentos que seriam alterados, no relatório de execução.

---

## ITEM 3 — Limpeza da Barra de Contexto do Header (Imagem 4)

**Direção aprovada por Paulo:** remover a tagline de apresentação
("Sua plataforma de Valuation de Ativos...") de dentro do app logado —
isso é copy de landing page, não deveria aparecer para quem já é
usuário. Tornar a cotação USD/BRL condicional.

### 3.1 Remover tagline do contexto logado
- Em `Header.tsx`, a tagline (`t.appTagline`, hoje renderizada como
  `<p>` truncada ao lado do título) deve aparecer **somente** quando
  `variant === "landing"`. Dentro do app (`variant === "app"`), não
  renderizar esse `<p>` — nem via `sr-only`, remover de fato do fluxo
  visual (mas preservar acessibilidade: se o `<h1>` sozinho não for
  suficiente para leitor de tela entender o contexto da página, avaliar
  se precisa de outro `aria-label` mais curto em vez da tagline
  inteira).

### 3.2 Cotação USD/BRL condicional
- A cotação (`exchangeRateQueryOptions()`, hoje sempre visível no
  Header) deve só renderizar se o usuário tiver pelo menos 1 ativo
  classificado como `STOCK_US`, `REIT`, ou `ETF` denominado em USD na
  carteira/watchlist.
- Verificar se já existe um hook ou seletor que responda "usuário tem
  ativo US?" (ex: algo usado por `useValuedPortfolio` ou pelo Cash
  Flow, que já lida com múltiplas moedas) antes de criar lógica nova
  (Regra 1). Se não existir, criar um hook pequeno e reusável
  (`useHasUSDAssets()` ou nome equivalente) em vez de inline no Header.
- Se o hook ainda está carregando (loading), não mostrar nem esconder
  abruptamente — usar o mesmo padrão de skeleton que a cotação já usa
  hoje enquanto isso é resolvido, para não gerar layout shift.

### Gate de saída do Item 3
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Teste manual: logar com um usuário sem ativos US — confirmar que a
  cotação não aparece. Logar com usuário com ativo US — confirmar que
  aparece normalmente. Confirmar visualmente (mobile 375px e desktop)
  que a barra não fica com espaço vazio estranho quando a cotação some
  — ajustar o layout/alinhamento se necessário.

---

## ITEM 4 — Novos Textos de CTA (Botões "Terminal")

Trocar as duas strings de CTA nos 3 dicionários de i18n. Direção
aprovada por Paulo:

| Chave i18n | Texto Atual (pt-BR) | Novo Texto (pt-BR) |
|---|---|---|
| `landing.ctaTerminal` (botão grande da landing, `routes/index.tsx`) | "Acessar o Terminal Pro" | **"Ver Minha Independência Financeira"** |
| `landing.goToTerminal` (botão pequeno do Header) | "Ir para o Terminal" | **"Meu Painel"** |

- Atualizar `dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts` com traduções
  equivalentes ao novo sentido (não traduzir literalmente do
  português — adaptar ao tom de cada idioma, mantendo o mesmo
  significado: "ver minha independência financeira" / "meu painel").
- Verificar visualmente se o texto maior ("Ver Minha Independência
  Financeira") ainda cabe bem no botão da landing em mobile (375px) —
  se quebrar layout ou ficar apertado, reportar e propor uma versão
  mais curta antes de finalizar (ex: "Ver Minha Jornada IF"), sem
  decidir sozinho qual usar — perguntar a Paulo nesse caso específico.

### Gate de saída do Item 4
- `npx tsc --noEmit`, `npx vitest run`, `npm run build`.
- Screenshot ou descrição do botão em mobile e desktop nos 3 idiomas.

---

## Proibido em Todos os Itens
- Item 1: não alterar nenhum código, só reportar.
- Item 2: não rodar o backfill em modo `--execute` sem aprovação
  explícita de Paulo após ver o resultado do `--dry-run`.
- Item 3: não remover a cotação USD/BRL completamente do produto — ela
  continua existindo em outras telas (ex: Cash Flow, Screener), só
  fica condicional aqui no Header.
- Item 4: não decidir sozinho um texto alternativo se o aprovado não
  couber no layout — voltar a Paulo com opções, não substituir por
  conta própria.
