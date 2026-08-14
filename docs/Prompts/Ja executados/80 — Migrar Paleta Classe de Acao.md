# 80 — Migrar Paleta Categórica de Classe de Ação pra Tokens Dedicados (`classify.ts:96`)

## Contexto

Achado do prompt 72: `getShareClassBadge()` (`src/lib/classify.ts`) usa 5
cores de paleta Tailwind cruas pra badges de classe de ação (BDR=blue,
UNIT=purple, Fracionário=amber, ON=emerald, PN=indigo) — nenhuma delas é
token semântico do catálogo. Não é marca/CTA nem resultado positivo/
negativo, é categorização visual arbitrária — por isso ficou de fora da
correção anterior (que só migrava marca→`--primary`).

## Escopo técnico

### 1. Migrar as 5 cores pros tokens `--chart-1` a `--chart-5`

Esses tokens já existem no catálogo especificamente para "categorias
múltiplas sem semântica binária" (uso já estabelecido nesta sessão).

**Atenção ao mapear**: no tema escuro, `--chart-2` (hue ~160, verde) e
`--chart-5` (hue ~15, vermelho) ficam próximos de `--success`/`--danger`.
Evitar atribuir esses dois especificamente a categorias que não têm
nenhuma relação com "resultado positivo/negativo" (ex: não colocar ON
em `--chart-2` só porque coincidentemente já era emerald antes — isso
manteria a mesma ambiguidade visual que estamos tentando resolver, só
que via token em vez de classe crua). Escolher a atribuição pensando
em distinção visual clara entre os 5 badges, não em tentar preservar a
cor antiga de cada um. Reportar o mapeamento final escolhido.

### 2. Aplicar a mesma migração em qualquer outro consumidor

Confirmar se `getShareClassBadge()` é a única fonte dessas 5 cores, ou
se algum componente (`AssetForm.tsx`, `AssetComparator.tsx`, mencionados
na sessão anterior como consumidores dos badges) duplica a lógica de cor
em vez de só consumir o `className` retornado por essa função — se
houver duplicação, unificar.

### 3. Considerar (opcional, reportar decisão) expandir o escopo do gate

`design-tokens.test.ts` hoje só varre `src/components/` e `src/routes/`
— por isso essa ocorrência em `src/lib/classify.ts` nunca foi pega
automaticamente. Avaliar se faz sentido expandir a 5ª regra (bloqueio de
paleta Tailwind crua) pra cobrir `src/lib/` também, evitando que esse
tipo de achado dependa de auditoria manual de novo no futuro. Se a
expansão gerar muitos falsos positivos em `src/lib/` (ex: arquivos de
teste, ou código que não é UI), avaliar escopo mais cirúrgico (ex: só
`src/lib/classify.ts` e arquivos irmãos que geram className pra UI) em
vez de `src/lib/` inteiro.

## Regras obrigatórias

- Não alterar a lógica de classificação de ticker (as regex de
  BDR/UNIT/Fracionário/ON/PN) — só a cor.
- Manter `design-tokens.test.ts` passando (e se expandir o escopo dele,
  confirmar que passa com o escopo novo também).

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot dos 5 badges lado a lado (ex: no dropdown de busca do
   Screener, onde já aparecem) confirmando distinção visual clara entre
   os 5

## Ao terminar

Atualizar `docs/SSOT.md`, item 5/nota sobre `classify.ts:96` — marcar
como resolvido. Trabalhar em `dev`.
