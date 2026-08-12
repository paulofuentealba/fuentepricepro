# RESULTADO - 72 — Unificar Cor de CTA F3

## Contexto

F1/F2 (commit `aa83d3b`, sessão anterior) já haviam migrado 19 arquivos
de `emerald-*` hardcoded para `text-primary`/`bg-primary`/etc. Este
prompt (F3) tinha como objetivo varrer o restante (~22 arquivos
estimados na auditoria original) e classificar cada ocorrência
remanescente como "marca/CTA" (deve virar `--primary`) ou
"resultado/ganho" (deve continuar `--success`/emerald).

## Varredura realizada

Busca por `emerald-` em todo `src/` (regex `emerald-\d+`, cobrindo
`text-`, `bg-`, `border-`, `ring-`). Resultado: **apenas 2 arquivos**
com ocorrências remanescentes — a estimativa de "~22 arquivos" da
auditoria original já havia sido consumida quase inteiramente por
F1/F2.

### Lista completa classificada

| Arquivo | Linha(s) | Contexto | Classificação | Ação |
|---|---|---|---|---|
| `src/routes/index.tsx` | 196, 235, 236, 241, 242, 504 | Mockup decorativo da landing page pública: "7.2%", "+ R$ 150.40", "thisMonthGrowth" — valores de rentabilidade/ganho exibidos num preview de dashboard fake | **Resultado/ganho** | Mantido (emerald correto) |
| `src/lib/classify.ts` | 96 | `bg-emerald-500/15 text-emerald-400 border-emerald-500/30` — cor do badge "ON" (ação ordinária) dentro de uma paleta categórica arbitrária para tipos de ativo B3 (BDR=azul, UNIT=roxo, Fracionário=âmbar, ON=emerald, PN=índigo) | **Ambíguo** (não é marca/CTA nem resultado positivo — é categorização visual arbitrária de tipo de instrumento) | Mantido sem alteração — ver nota abaixo |

Nenhuma ocorrência classificada como "marca/CTA" foi encontrada. Logo,
**nenhum arquivo precisou ser alterado** nesta fase.

## Caso ambíguo para decisão do Paulo

`src/lib/classify.ts:96` usa `emerald` como uma de cinco cores
categóricas para diferenciar tipos de instrumento B3 (BDR/UNIT/
Fracionário/ON/PN), não para indicar marca/CTA nem ganho financeiro.
Trocar para `--primary` misturaria a cor de marca com uma paleta que é
puramente decorativa/categórica (junto com blue/purple/amber/indigo,
nenhum dos quais é token semântico do catálogo). Deixado como está.
Decisão sugerida: se este arquivo entrar em escopo futuro, o ideal é
migrar as 5 cores da paleta categórica para uma escala neutra de tags
(ex.: `--chart-1` a `--chart-5` ou equivalente), não misturar com
`--primary`/`--success`.

Nota adicional: `classify.ts` está em `src/lib/`, fora do escopo
verificado por `design-tokens.test.ts` (que só varre
`src/components/` e `src/routes/`), então esta ocorrência não bloqueia
o gate atual.

## Por que index.tsx não foi tocado

`src/routes/index.tsx` já está explicitamente excluído do gate em
`design-tokens.test.ts` (linha 135: `"marketing e documentação"`), e
as 6 ocorrências ali representam claramente resultado/ganho positivo
num mockup ilustrativo — não CTA/marca.

## Verificação

- `npx tsc --noEmit` — limpo, 0 erros
- `npm run test -- --run` — 38 arquivos de teste passaram (1 skip),
  248 testes passaram (4 skips), incluindo `design-tokens.test.ts`
  (todas as 6 regras, inclusive a que bloqueia classe de paleta
  Tailwind crua)
- `npm run build` — build de produção concluído com sucesso

## Resumo

- Arquivos alterados: **0** (código já estava conforme após F1/F2)
- Casos mantidos como `--success`/emerald por serem resultado/ganho: **6** ocorrências em 1 arquivo (`src/routes/index.tsx`)
- Casos ambíguos deixados para decisão do Paulo: **1** ocorrência em 1 arquivo (`src/lib/classify.ts:96`)
- `docs/SSOT.md` item 5 da tabela de pendências atualizado para ✅ Resolvido
