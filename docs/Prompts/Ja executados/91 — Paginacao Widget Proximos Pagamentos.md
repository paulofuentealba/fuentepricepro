# PROMPT 91 — Paginação no Widget "Próximos Pagamentos" (NextPaymentBanner)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## Contexto

Componente alvo: `src/components/ceiling/watchlist/NextPaymentBanner.tsx`,
usado em `WatchlistKpiSection.tsx` (aparece na home FI, dashboard
principal). Hoje ele mostra sempre os 4 pagamentos mais próximos e, se
houver mais de 4 no total, o label já indica isso
(`"{{x}} de {{total}} Próximos Pagamentos"`), mas não há forma de
navegar para ver os demais.

**Referência visual:** captura de tela compartilhada por Paulo — dois
botões circulares no canto superior direito do card, ao lado do label
"4 OF 8 UPCOMING PAYMENTS". **Nota de correção de ícone:** na captura
de referência, os dois ícones não formam um par consistente de
navegação (um parece "voltar/undo", o outro parece "compartilhar/
enviar"). Não reproduzir esses ícones literalmente — usar
`ChevronLeft` / `ChevronRight` de `lucide-react` (já é a biblioteca de
ícones usada em todo o projeto, ver imports em `NextPaymentBanner.tsx`
e `Header.tsx`), que comunica claramente "página anterior / próxima
página".

---

## Regra de Negócio (não negociável)

Os botões de navegação só existem/ficam ativos se `totalCount > 4`
(ou seja, mais de 1 página de 4 itens). Com 4 ou menos pagamentos
futuros, os botões não devem aparecer — nem desabilitados visíveis,
simplesmente não renderizar o par de botões.

---

## Tarefas

### 1. Mudar `computeUpcomingPayments` para expor a lista completa
- Hoje a função corta em `list.slice(0, 4)` internamente e devolve só
  isso como `displayList`. Alterar para devolver a lista ORDENADA
  COMPLETA (sem slice), mantendo `totalCount` como já é hoje
  (`list.length`).
- **Atenção**: isso muda o contrato testado em
  `src/lib/__tests__/nextPaymentBanner.test.ts`. Atualizar os testes
  existentes para refletir a nova assinatura — os testes atuais
  assumem `displayList.length` já vem cortado em 4; ajustar para
  testar a lista completa e, separadamente, testar que o componente
  (não mais a função pura) é quem decide o que exibir por página.
- Renomear o campo retornado se fizer sentido para deixar claro que
  não é mais "a lista pronta pra exibir" (ex: `sortedList` em vez de
  `displayList`) — se renomear, atualizar todos os call sites e testes
  de uma vez, não deixar nome ambíguo.

### 2. Paginação dentro do componente `NextPaymentBanner`
- Adicionar estado local `const [page, setPage] = useState(0)`.
- Calcular o slice a ser exibido: `sortedList.slice(page * 4, page * 4 + 4)`.
- Calcular `totalPages = Math.ceil(totalCount / 4)`.
- Resetar `page` para `0` sempre que `items`, `meta`, ou
  `dividendEventsMap` mudarem de referência (ex: `useEffect` com essas
  dependências, ou derivar a chave de reset de forma mais simples se o
  padrão do projeto preferir) — para não deixar o usuário "preso" numa
  página 2 depois que a carteira mudar e a lista ficar menor.

### 3. UI dos botões
- Renderizar o par de botões (`ChevronLeft` à esquerda, `ChevronRight`
  à direita) no canto superior direito do card, ao lado do label —
  seguindo o posicionamento da referência visual de Paulo.
- Visibilidade: só renderizar o par inteiro se `totalPages > 1`
  (equivalente a `totalCount > 4`). Se `totalPages <= 1`, não renderizar
  nada no lugar dos botões (sem espaço reservado vazio).
- Estado de cada botão dentro do par:
  - Botão esquerdo (página anterior): `disabled` quando `page === 0`.
  - Botão direito (próxima página): `disabled` quando
    `page === totalPages - 1`.
  - Usar o padrão visual de botão desabilitado já existente no design
    system do projeto (opacidade reduzida + `cursor-not-allowed`,
    conforme os tokens de `src/styles.css` — Regra 6, não inventar
    estilo novo).
- Tap target mínimo 44px (mobile-first, Regra 5) mesmo que o ícone
  visual seja pequeno — usar padding adequado no botão, não só o
  ícone.
- `aria-label` nos dois botões via i18n (Regra 2) — ex:
  `t.watchlist.previousPayments` / `t.watchlist.nextPayments` (criar
  essas chaves nos 3 dicionários se não existirem, com textos como
  "Pagamentos anteriores" / "Próximos pagamentos" em pt-BR e
  equivalentes em en/es — não reaproveitar `upcomingPayments` que já
  tem outro significado).

### 4. Atualizar o label dinâmico para refletir a página atual
- O label hoje mostra `"{{x}} de {{total}} Próximos Pagamentos"` onde
  `{{x}}` é `displayList.length` (sempre 4 ou menos). Com paginação,
  ajustar para refletir a página atual de forma clara — por exemplo,
  se a chave `upcomingPaymentsCount` hoje suporta só um número
  `{{x}}`, avaliar se falta um formato tipo "5–8 de 8" para deixar
  claro que não são sempre os 4 primeiros. Propor o texto exato nos 3
  dicionários e usar Intl.NumberFormat / concatenação simples conforme
  o padrão já usado no arquivo (`replace("{{x}}", ...)`) — não inventar
  um novo sistema de interpolação.

---

## Gate de Saída

1. `npx tsc --noEmit` — 0 erros.
2. `npx vitest run` — incluindo os testes atualizados de
   `nextPaymentBanner.test.ts` e qualquer teste novo para a lógica de
   paginação do componente.
3. `npm run build` — build limpo.
4. Teste manual:
   - Usuário com ≤ 4 pagamentos futuros → confirmar que os botões NÃO
     aparecem.
   - Usuário com > 4 pagamentos futuros (ex: 8, como na referência) →
     confirmar navegação entre páginas, botão esquerdo desabilitado na
     página 0, botão direito desabilitado na última página.
   - Testar em mobile (375px) e desktop — confirmar tap target
     adequado e que o card não quebra layout com os botões adicionados.
5. Reportar no relatório de execução: nome final da chave i18n do
   label (se foi alterada) e os textos usados para os `aria-label` dos
   botões nos 3 idiomas.

## Proibido
- Não reproduzir os ícones exatos da captura de referência (undo /
  share) — usar `ChevronLeft`/`ChevronRight`.
- Não deixar os botões visíveis-mas-desabilitados quando
  `totalCount <= 4` — devem não renderizar, não aparecer acinzentados.
- Não alterar a lógica de negócio de `computeUpcomingPayments` além do
  necessário para parar de cortar em 4 (ex: não mexer na ordenação, no
  fallback de frequência, ou em qualquer outra regra já existente na
  função).
