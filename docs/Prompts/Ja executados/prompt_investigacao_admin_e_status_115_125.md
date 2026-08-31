# PROMPT — Investigação: Mecanismo de Privilégio Admin + Reconfirmação de Status dos Prompts 115–125
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## 🛑 MODO DE OPERAÇÃO

Este prompt é **só de investigação** — não codar, não executar nenhuma mudança de privilégio,
não tocar em `firestore.rules`, Firebase Console, ou qualquer coleção de usuários. Duas frentes
de diagnóstico independentes abaixo. Reporte os achados de cada uma separadamente.

---

## PARTE A — Reconfirmação do Status Real dos Prompts 115–125

Numa sessão anterior, uma verificação independente (clone de `origin/dev`, gates reais) encontrou
que o relatório de conclusão dos Prompts 115–125 (BFF + Preço-Teto por Classe de Ativo) não batia
com o código: `tsc --noEmit` real tinha 35+ erros (incluindo campos inexistentes em
`AssetValuationParams` usados dentro do próprio `calculations.ts`, e um import errado —
`@tanstack/start` em vez de `@tanstack/react-start` — que impedia a server function do BFF de
compilar), e o Prompt 125 (desligamento do caminho legado client-side) estava reportado como
concluído mas `useValuedPortfolio.tsx` continuava com o merge client-side inteiro, sem nenhuma
referência ao BFF.

Não há confirmação de que essa correção foi finalizada e validada depois daquela sessão.
Investigue o estado **atual** de `dev`:

1. `npx tsc --noEmit` — output literal completo. Zero erros ou lista completa se houver.
2. `src/lib/calculations.ts` — confirme se `AssetValuationParams` (a interface) contém
   `usTreasury10Y` e `affo` como campos declarados, e se os usos nas linhas que hoje correspondem
   ao antigo 896/897/1057 (a numeração pode ter mudado) referenciam campos que existem no tipo.
3. `src/lib/api/portfolioBff.server.ts` (ou onde quer que o arquivo esteja hoje) — confirme o
   import correto: `@tanstack/react-start`, não `@tanstack/start`.
4. `src/lib/useValuedPortfolio.tsx` — confirme se ainda importa/usa diretamente `useWatchlist`,
   `useTransactions`, `useLiveQuotesAndMeta`, `useSelic`, `exchangeRateQueryOptions` no merge
   client-side, ou se já migrou para consumir `fetchValuedPortfolioFn` (BFF) como fonte única,
   conforme o escopo original do Prompt 125.
5. Se algum dos 4 pontos acima ainda estiver com o problema identificado na sessão anterior,
   reporte isso claramente como "Prompts 115–125 ainda incompletos" — não tente corrigir agora,
   só diagnostique.

---

## PARTE B — Mecanismo Atual de Privilégio Admin

Tarefa pendente: configurar `gutierre.fuentealba@gmail.com` como administrador, com os mesmos
privilégios que `paulo@fuentepricepro.com` já tem hoje. Antes de decidir como fazer isso,
precisamos saber **como o privilégio de `paulo@` existe atualmente**. Investigue as 3 hipóteses:

### B.1 — Custom Claim no Firebase Auth
Busque no código (Cloud Functions, scripts administrativos, `src/lib/`) por qualquer uso de
`admin.auth().setCustomUserClaims(...)` ou verificação de `request.auth.token.admin` (em
`firestore.rules`) ou `context.auth.token.admin` (em Cloud Functions). Se encontrar, reporte:
onde o claim é setado (script, console manual, Cloud Function), e onde é lido/verificado.

### B.2 — Campo em Documento Firestore
Busque por um campo tipo `role`, `isAdmin`, `admin` dentro de `users/{uid}` ou coleção
equivalente, e onde esse campo é lido no código (ex.: `src/routes/app/admin.tsx` ou componentes
do painel administrativo mencionados no dicionário i18n como `admin.*`).

### B.3 — Regra Hardcoded em `firestore.rules`
Busque em `firestore.rules` por qualquer verificação que compare `request.auth.uid` ou
`request.auth.token.email` contra um valor fixo (o UID ou e-mail do Paulo hardcoded na regra).

### Entregável da Parte B
Reporte qual dos 3 mecanismos (pode ser mais de um combinado) é o real, com o trecho de código
exato e o caminho do arquivo. **Não proponha a implementação da mudança ainda** — só o
diagnóstico. A decisão de qual caminho seguir para adicionar o Gutierre (script administrativo,
escrita Firestore, ou edição de regra + deploy) será tomada depois, com base neste relatório.

---

## Lembrete Final
Nenhuma mudança de privilégio de usuário deve ser executada neste prompt — nem em dev, nem em
prod. Isso será uma etapa separada, só depois que o mecanismo estiver confirmado e eu autorizar
explicitamente.
