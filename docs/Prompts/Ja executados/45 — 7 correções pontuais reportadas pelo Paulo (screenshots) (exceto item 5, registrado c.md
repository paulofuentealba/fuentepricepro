### 45 — 7 correções pontuais reportadas pelo Paulo (screenshots) ✅ CONCLUÍDO (exceto item 5, registrado como backlog)

1. **"Agribusiness (FIAGRO)" não fazia sentido** — ✅ simplificado pra só
   `FIAGRO` nos 3 idiomas, consistente com FII/REIT/ETF (que também são
   siglas puras, sem palavra descritiva grudada).

2. **Consenso Fuente sempre com um pilar faltando** — ✅ **causa raiz real
   encontrada e corrigida**. Testei a API da Brapi ao vivo (`curl`): o
   parâmetro `fundamental=true` (usado no código) nunca trouxe o P/VP — só
   P/L e LPA. O P/VP e o Valor Patrimonial por Ação de verdade vivem no
   módulo `defaultKeyStatistics`, que exige token da Brapi pra qualquer
   ticker fora dos 4 gratuitos de teste (PETR4/MGLU3/VALE3/ITUB4) —
   confirmado testando ITSA4 sem token (erro `MISSING_TOKEN`). Resultado:
   o Graham ficava "N/A" sistematicamente pra quase todo ativo BR.
   - `brapi.server.ts`: agora usa `modules=defaultKeyStatistics` +
     `Authorization: Bearer` quando `BRAPI_TOKEN` existe (fallback
     gracioso pra quem não configurar, sem quebrar nada); lê
     `bookValue`/`priceToBook` do módulo certo.
   - Novo campo `bvps` direto em `ApiAsset.metrics` (mais preciso que
     derivar via `currentPrice / pbRatio`).
   - `DividendRadar.tsx`, `AssetComparator.tsx`, `AssetCard.tsx`
     atualizados pra preferir `metrics.bvps` quando disponível.
   - `.env.example` documentado, `.env` local do Paulo já recebeu o token
     real (`BRAPI_TOKEN`), `cloudbuild.yaml` preparado com substitution
     `_BRAPI_TOKEN` + `--set-env-vars` no deploy do Cloud Run.
   - **Pendente do Paulo**: adicionar `_BRAPI_TOKEN` no gatilho do Cloud
     Build (Console → Cloud Build → Triggers → editar → Substitution
     variables), mesmo lugar das 7 chaves do Firebase.

3. **Remover "Simulator" do nome** — ✅ `t.snowball.title` agora é só
   "Snowball Effect" (e equivalentes em pt-BR/es), usado no menu lateral e
   na navegação mobile.

4. **Seção "How to Add a New Broker" na Wiki não faz sentido pro
   investidor** — ✅ removida do `docs.tsx` (era conteúdo de dev, não de
   usuário final).

5. **Radar Global com ativos fixos, deveria atualizar a cada 12h** —
   ⚠️ **Investigado, NÃO implementado ainda**. A Brapi não tem endpoint
   gratuito pra ordenar por dividend yield (testado via `curl`, só ordena
   por nome/preço/variação/volume/market cap). Um radar de verdade
   dinâmico exigiria varrer o universo inteiro de tickers da B3 e calcular
   yield de cada um — possívelmente centenas de chamadas de API. Registrado
   como item de backlog pra discutir abordagem (ex: lista curada maior +
   job agendado) antes de implementar, em vez de arriscar algo malfeito.

6. **Tabela de Exposição Setorial quebrando com scroll horizontal feio no
   Risk Radar** — ✅ corrigido: removido `min-w-[700px]` desnecessário nas
   duas tabelas (Asset Concentration e Sector Exposure), que só têm 3
   colunas simples e não precisavam desse mínimo artificial.

7. **Abas "Minha Posição"/"Transações" não fazem sentido na Mesa de
   Decisão** — ✅ nova prop `hidePositionTabs` no `AssetDetailSheet.tsx`,
   passada como `true` pelo `AssetComparator.tsx` (já que os itens ali são
   hipotéticos/comparação, não posições reais da carteira). Sheet mostra
   só Highlights + Dividends nesse contexto.

**Bônus encontrado no caminho**: mais 2 hardcodes no `ConsensusPyramid.tsx`
("Fuente Valuation Model", "Consensus") corrigidos com chaves novas
(`t.valuation.pyramidTitle`, `t.valuation.consensusBadge`).

**PENDENTE do Paulo**: configurar `_BRAPI_TOKEN` no Cloud Build Console
(ver item 2), depois rodar `npm run dev` e conferir se o Graham aparece
com valor real (não N/A) num ativo BR normal (ex: ITSA4) antes de
push pra produção. `npm run test`/`npm run build` também pendentes —
Claude não executa comando na máquina do Paulo.

---