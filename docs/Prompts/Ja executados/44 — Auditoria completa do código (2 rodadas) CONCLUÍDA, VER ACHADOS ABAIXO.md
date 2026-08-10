### 44 — Auditoria completa do código (2 rodadas) ✅ CONCLUÍDA, VER ACHADOS ABAIXO

Contexto: Paulo pediu uma auditoria completa de tudo que já foi pedido nas
3 sessões do projeto, pra garantir que nada regrediu e que o código segue
boas práticas, dado o crescimento do produto ("não podemos cair num caminho
sem volta"). Claude fez a auditoria lendo o código-fonte diretamente
(não só confiando no histórico do log), em duas rodadas.

**Rodada 1 — áreas de maior risco (dado financeiro/segurança):**
- ✅ Tarefa 38 (`USE_LOCAL_ONLY`) — confirmado correto em `watchlist.ts` e
  `transactions.ts`
- ✅ Paths do Firestore consistentes + `firestore.rules` cobrindo tudo
- ✅ Exclusão de conta (LGPD) — ordem correta, sem coleta órfã
- ✅ Crash `isBargain`, scroll mobile das abas, "Investing Since" editável
- ✅ Dividendo fantasma, "Minha Jornada", rótulo de ano, Best/Worst Month
  em `cashflow.ts`
- ✅ CSRF (`start.ts`) ativo
- 🔧 **Bug real encontrado e corrigido**: `.SA` aparecendo no ticker de
  alguns ativos BR — causa raiz era `cleanTicker()` em `formatters.ts` ser
  um no-op (não fazia nada apesar do nome). Corrigido pra limpar de
  verdade; como é chamada em todo carregamento (Firestore/localStorage),
  ativos já salvos com `.SA` se auto-corrigem sozinhos.
- 🔧 3 toasts de erro hardcoded em inglês (`settings.tsx`,
  `transactions.ts`) — corrigidos com chaves novas de i18n

**Rodada 2 — Wiki, parser de corretagem, Global Radar, Sprints de UX:**
- ✅ Global Radar — confirmado que é só um wrapper do `DividendRadar.tsx`,
  já coberto na auditoria
- ✅ Parser de corretagem (`b3Parser.ts`) — CNPJs conferidos um a um contra
  a Wiki, 100% consistentes, sem drift entre documentação e código
- ✅ MobileBottomNav, ResultSkeleton — amostra das Sprints de UX, limpos
- 🔧 3 hardcodes na Wiki (`docs.tsx`): "Índice", fórmula do Bazin, fórmula
  do Gordon — apareciam em português mesmo com o app em outro idioma
- 🔧 Badge "Ações" hardcoded no `DividendRadar.tsx` → agora usa `t.types`
- 🔧 Fallback de setor "Outros" hardcoded no `AssetComparator.tsx` → nova
  chave `t.common.other`

**Total da auditoria**: 9 bugs/hardcodes reais encontrados e corrigidos,
nenhum regredido dos itens já marcados ✅ no histórico anterior.

---