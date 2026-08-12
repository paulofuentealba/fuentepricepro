# Horizonte FI v2 — Triage: lixo vs reaproveitável

> Análise da tentativa de "nova versão" de frontend (Horizonte FI / v2), feita em
> 2026-08-11. Determina o que ficou de lixo e o que pode ser reaproveitado na
> expansão em andamento (prompts 55-64).
>
> Base: `git log` (prompts 46-58, `b3186b4`, `4ca916a`, `b8b7537`), leitura de
> `src/components/horizonte/`, `src/styles.css` e `docs/Prompts/`.

---

## 1. Histórico (o que foi a tentativa v2)

| Fase | Commits | O que foi feito |
|---|---|---|
| Prompts 46-52 | `32174e3`…`6a7783a` | v2 **paralela** (`/app-v2` + `horizonte-tokens.css` + `layout-v2/SidebarHorizonte`): design tokens, hero canvas, dashboard, tabela de carteira |
| Prompts 55-58 | `d1adc12`, `e655d42`, `9703571`, `5fc3344` | Mais rotas `/app-v2/*` (Screener, Comparador, Global Radar, Risk Radar) |
| **`b3186b4`** | Remoção | **Removeu `/app-v2` inteiro** (9 arquivos, 883 linhas) + `horizonte-tokens.css` + `SidebarHorizonte.tsx`. Mensagem do commit: *"app-v2 foi um engano de escopo... eram cascas finas em torno dos mesmos componentes já usados pelas rotas de produção (AssetComparator, DividendRadar, RiskRadar, AssetForm) — nada de funcional a portar"* |
| `4ca916a` | Promoção | Home Horizonte FI vira **a home real de `/app`** |
| `b8b7537` | Merge | Tokens `--h-*` **remapeados para os tokens reais** de `styles.css`; extrai `useRealizedIncomeSummary` |
| `389d8db` → `eac866d` | Correções | Canvas em branco, modal de aporte unificado, a11y, lint de tokens |

**Estado atual do código** (verificado): `src/styles/` está **vazio**; os `@font-face`
Fraunces/Inter e `--font-serif: Fraunces` vivem no topo de `styles.css`; **não existe**
nenhum `app-v2`, `layout-v2`, `horizonte-tokens.css` ou token `--h-*` em `src/`.

---

## 2. 🗑️ LIXO — o que é para descartar

| Item | Status |
|---|---|
| Rotas `/app-v2/*` (index, myportfolio, screener, comparator, globalradar, riskradar) + layout `SidebarHorizonte` | ✅ **já removido** (`b3186b4`) — eram cascas finas, nada funcional a portar |
| `horizonte-tokens.css` (tokens `--h-*` duplicados/conflitantes com os nomes reais) | ✅ **já removido** — fundido em `styles.css` |
| Deps `@fontsource-variable/fraunces` + `@fontsource-variable/inter` (resíduo de prototipagem, nunca usadas) | ✅ **já removido** do `package.json` (SSOT as citava; verificado ausentes) |
| **Docs `docs/Prompts/55…64`** — todos ainda miram `/app-v2`, que não existe mais | ⚠️ **lixo real restante** — qualquer agente que seguir esses prompts vai recriar a rota paralela que foi decididamente enterrada em `b3186b4` |
| RESULTADO dos prompts 55-58 (descrevem rotas deletadas) | ⚠️ enganoso — marcar como superados |
| Sufixo **"V2"** no `PortfolioTableV2` | ⚠️ dívida de nomenclatura — é hoje **a** tabela canônica |
| `docs/SSOT.md` Seção 5 + pendência #12 — ainda descrevem `/app-v2` como atual | ⚠️ desatualizado relativo a `b3186b4`/`4ca916a` |
| `src/styles/` (diretório vazio) + `dist/` (build stale, gitignored) | 🧹 cosmético, ignorável |

---

## 3. ♻️ REAPROVEITÁVEL — o que fica e alimenta a expansão

| Ativo | Onde vive | Como reaproveitar |
|---|---|---|
| **Identidade visual** — fontes locais Fraunces/Inter + paleta petróleo (`--primary`), `--font-serif: "Fraunces"` | `src/styles.css` (global agora) | **É a fundação.** As demais rotas já herdam tudo sem importar nada |
| **`HorizonteHero`** — hero canvas com linha de horizonte animada | `src/components/horizonte/HorizonteHero.tsx`, vivo em `/app` | Padrão visual de assinatura. Extrair o canvas como primitivo reutilizável para headers de outras rotas |
| **`PortfolioTableV2`** — tabela de carteira (sort por teclado, contraste AA, `overflow-x` próprio) | `src/components/horizonte/PortfolioTableV2.tsx`, vivo em `/app` | **Tabela canônica** → renomear para `PortfolioTable` e usar em `myportfolio` |
| **`NewContributionDialog`** — modal de aporte unificado (único `Dialog` persistente) | `src/components/horizonte/NewContributionDialog.tsx` | Reusar em `myportfolio`/`cashflow` |
| **`useFIProgress`** + **`useRealizedIncomeSummary`** — lógica extraída e testada | `src/lib/useFIProgress.ts`, `src/lib/useRealizedIncomeSummary.ts` | Lógica compartilhada; v1 (`FIProgressCard`) e v2 usam as mesmas. Continuar como única fonte |
| **Correções a11y** — `SortableHeader` com `tabIndex`/`role="button"`/`onKeyDown`/`aria-sort` | `PortfolioTableV2` | Padrões a carregar para novos componentes da expansão |
| **Os próprios componentes v1** — `AssetComparator`, `DividendRadar`, `RiskRadar`, `AssetForm`, Screener, CashFlowChart | `src/components/ceiling/` | **São a mesma coisa da v2.** A lição do `b3186b4` é que a expansão não reescreve nada disso — é **re-skin** |

---

## 4. 🔑 Insight estratégico

O experimento v2 provou que **as rotas não precisam de uma segunda versão — precisam de
re-skin**. Os componentes de negócio (`AssetComparator`, `DividendRadar`, `RiskRadar`,
`AssetForm`) foram confirmados por investigação como **idênticos** entre v1 e v2; o que
mudou foi só a camada visual (tokens, tipografia) + primitivos compartilhados (hero,
tabela, modal). Portanto a expansão para todas as rotas (prompts 59-64: Smart Allocation,
Snowball, Cash Flow, Docs, Settings) é:

1. **Reescrever os prompts 55-64** apontando para `/app` (não `/app-v2`) — caso contrário
   a expansão recria o erro que `b3186b4` enterrou.
2. **Re-skin** das rotas v1 com o design system já global + os primitivos acima.
3. Renomear `PortfolioTableV2` → `PortfolioTable` e trazê-la para `myportfolio`.

⚠️ **Cuidado ao reusar:** a home promovida (`/app`) carrega dívida i18n (strings pt-BR
hardcoded, ver `docs/AUDITORIA_2026-08-11.md` §4.1). Se a expansão copiar o padrão dela,
propaga o mesmo problema. Corrigir a i18n faz parte da padronização, não é pós-it.

---

## 5. Próximos passos recomendados

1. **Reescrever `docs/Prompts/55…64`** — alvo `/app`, plano de re-skin rota a rota
   (registrar que as rotas `/app-v2` 55-58 foram removidas e não devem ser recriadas).
2. **Limpeza de nomenclatura** — `PortfolioTableV2` → `PortfolioTable`; mover para o
   lugar canônico; atualizar import em `app/index.tsx` e teste.
3. **Remover/marcar RESULTADO stale** dos prompts 55-58 e atualizar a Seção 5 do
   `docs/SSOT.md` (o estado real pós-`b3186b4` é "v2 absorvida em `/app`", não "`/app-v2`
   fora de produção").
4. **Extrair primitivo de canvas/hero** de `HorizonteHero` para reuso em headers.
5. **Corrigir i18n da home promovida** (parte da padronização, antes de escalar o padrão
   para as outras rotas).

---

*Gerado em 2026-08-11. Cruzado com `docs/AUDITORIA_2026-08-11.md`.*
