# RESULTADO — 93 — Corrigir classificação de ETF/BDR (família BIVB39) + fechar dívida de teste de regressão do Prompt 86

## 1. Localização (não presumida — confirmada via grep)

Função canônica: `classifyBr()` em `src/lib/classify.ts:41`. Chamada real que exibia o bug: `src/components/ceiling/DividendRadar.tsx:68,91` (o componente por trás da rota `/app/globalradar`), que chama `classifyBr(asset.ticker)` **sem** `apiType` sempre que `asset.type` (vindo do backend) está ausente. Confirmado: a Brapi não retorna um `type` utilizável para BIVB39 no endpoint consumido pelo Radar Global, então a chamada cai no fallback puramente heurístico da função — sem sufixo `39` reconhecido, caía no `return "STOCK_BR"` genérico (exibido como "Ação" na UI).

**Duplicação (Regra 1):** não há. `classifyBr` é a única função de classificação BR no projeto — usada também por `brapi.server.ts`, `apiService.functions.ts`, `BrokerNoteUploader.tsx`. Nenhuma segunda cópia da lógica foi encontrada.

## 2. O que foi corrigido

Em `src/lib/classify.ts`, adicionado o caso do sufixo `39` (BDR de ETF, ex: BIVB39 = BDR do IVV) **antes** do fallback genérico:

```diff
+  if (s.endsWith("39")) {
+    return "ETF";
+  }
+
   if (s.endsWith("11")) {
     const prefix = s.slice(0, -2);
     ...
```

A tabela de sufixos B3 reconhecidos foi documentada explicitamente em comentário no topo da função (pedido do item (b) do prompt), incluindo os sufixos **não** cobertos por este fix (`34`/`35`, e `11` sem `apiType` para ETFs/fundos genuínos) — para que o próximo caso desta família seja fácil de localizar sem repetir a investigação do zero.

## 3. Snapshot de classificação — antes/depois (item (c), risco 1)

Todos os tickers testados chamando `classifyBr(ticker)` **sem** `apiType` (reproduzindo exatamente a chamada real de `DividendRadar.tsx`):

| Ticker | Antes | Depois | Mudou? |
|---|---|---|---|
| **BIVB39** | STOCK_BR | **ETF** | ✅ Intencional (o fix) |
| IVVB11 | FII | FII | Não |
| BOVA11 | FII | FII | Não |
| AAPL34 | STOCK_BR | STOCK_BR | Não |
| AAPL35 | STOCK_BR | STOCK_BR | Não |
| PETR4 | STOCK_BR | STOCK_BR | Não |
| VALE3 | STOCK_BR | STOCK_BR | Não |
| HGLG11 | FII | FII | Não |
| TAEE11 | STOCK_BR | STOCK_BR | Não |
| MXRF11 | FII | FII | Não |
| O | STOCK_BR | STOCK_BR | Não |
| DIVO11 | FII | FII | Não |
| NDIV11 | FII | FII | Não |

**Nenhuma reclassificação não-intencional.** Apenas BIVB39 mudou, exatamente o alvo do fix.

## 4. Tabela de cobertura — verificado vs. não testado (item (c), risco 2)

| Sufixo/Padrão | Status | Observação |
|---|---|---|
| `.SA` antes de REIT (`classifyYahoo`) | ✅ Verificado, já corrigido (Prompt 86) e testado (Prompt 89) | `src/lib/api/__tests__/classify.server.test.ts` |
| `11` (FII vs. Stock Unit) | ✅ Verificado correto | Coberto por `classify.test.ts` já existente |
| `39` (BDR de ETF) | ✅ Verificado, **corrigido nesta rodada** | Novo teste em `classify.test.ts` |
| `34`/`35` (BDR de ação) sem `apiType` | ⚠️ Verificado como gap conhecido, **não corrigido** | Cai em STOCK_BR sem `apiType`; só funciona hoje via `apiType === "bdr"` vindo da API. Fora do escopo deste prompt (era só sufixo 39) — documentado em comentário no código e em teste dedicado que trava esse comportamento atual |
| `11` genuíno de ETF/fundo sem `apiType` (ex: IVVB11, BOVA11) | ⚠️ Verificado como gap conhecido, **não corrigido** | Tradeoff aceito da heurística "termina em 11 → FII" já documentado no JSDoc original da função; fora do escopo deste prompt |
| Outros sufixos B3 raros (ex: `12`/BDR-Unit) | ❌ Não testado | Não investigado nesta rodada — não é escopo caçar todos, conforme o prompt |

## 5. Dívida de teste do Prompt 86 — já fechada no Prompt 89, confirmado (não duplicado)

O prompt pedia para "fechar a dívida do Prompt 86: escrever teste de regressão cobrindo explicitamente a ordem de checagem". **Essa dívida já havia sido fechada** na sessão anterior (Prompt 89, item 2.2): `src/lib/api/__tests__/classify.server.test.ts` cobre explicitamente a ordem `.SA`-antes-do-regex-REIT em `classifyYahoo` (casos `HGLG11.SA`→FII, `KNCR11.SA`→FII, `O.SA`→STOCK_BR, `O`→REIT). Confirmado o arquivo ainda existe e os testes ainda passam (ver Seção 6). Não recriei o mesmo teste — apenas adicionei os 3 novos testes de `classifyBr`/sufixo 39 em `classify.test.ts` (arquivo irmão, função irmã).

**Nota sobre `BACKLOG_V2.md`/`PROMPTS_LOG.md`:** o prompt pede para atualizar esses arquivos. Neste branch/worktree, ambos só existem em `docs/_archive/` (arquivados) — não encontrei uma versão ativa para atualizar. Reportando isso explicitamente em vez de editar um arquivo arquivado ou inventar um novo, para Paulo confirmar onde esse log deveria viver hoje.

## 6. Gates de Verificação Final — output literal

```
$ npx tsc --noEmit
src/components/horizonte/HorizonteHero.tsx(262,66): error TS2554: ...
src/components/layout/MobileBottomNav.tsx(18,61): error TS2339: ...
```
2 erros pré-existentes, não relacionados (arquivos não tocados nesta rodada).

```
$ npm run test
 Test Files  50 passed | 1 skipped (51)
      Tests  343 passed | 12 skipped (355)
```
(343 = 340 da sessão anterior + 3 novos testes de sufixo 39/gaps conhecidos.)

```
$ npm run build
✓ built in 1.12s
```

## 7. Governança de Roles (Regra 9)

Aplicado exatamente como o prompt definiu: `fuente-architecture-review`, `fuente-solution-architect` (confirmação de não-duplicação), `fuente-investidor-profissional` (classificação incorreta mina credibilidade), `fuente-product-manager`. Não aplicados, pelos motivos já listados no prompt: `fuente-ux-designer`, `fuente-investidor-iniciante`, `fuente-advogado-lgpd-gdpr`, `fuente-business-architect`, `fuente-product-marketing`.

## 8. Entregável

Commit `fix(classification): recognize BDR ETF suffix 39 + regression tests [Auditoria UX 1.3 + dívida Prompt 86]`, push para `dev`.
