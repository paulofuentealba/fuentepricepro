# PROMPT 100 — Unificar Menu Mobile (Sidebar + MobileBottomNav → Um Só)
> Copiar e colar integralmente no chat `[EXECUÇÃO]` do Antigravity.

---

## MODO DE OPERAÇÃO

Aplicar as skills `fuente-solution-architect` e `fuente-ux-designer`
explicitamente (Regra 9) — este é tanto problema de arquitetura
(componente duplicado) quanto de UX (dois sistemas de navegação
competindo).

## Contexto — Causa Raiz Já Confirmada

`src/routes/app.tsx:60,70` renderiza `<Sidebar />` **e**
`<MobileBottomNav />` simultaneamente. São 2 implementações
independentes:
- `Sidebar.tsx` (327 linhas) — 11 itens, vira drawer hamburger no
  mobile (confirmado na captura de tela de Paulo: "MENU" + ícone
  hamburger no topo, lista completa ao abrir).
- `MobileBottomNav.tsx` (63 linhas) — barra fixa de 5 itens curados
  (`screener`, `myportfolio`, `globalradar`, `cashflow`,
  `smartallocation`), ordem e conjunto diferentes do Sidebar.

No mobile, os dois coexistem ao mesmo tempo — usuário vê a barra fixa
embaixo E pode abrir o drawer hamburger, com listas de itens
diferentes entre si. Violação de Regra 1 (duas versões do mesmo
componente).

## Decisão de Paulo (já definida, não reabrir)

Manter **um único modelo de menu** — o do `Sidebar` (mesmos itens,
mesma ordem, mesma localização de cada item) — e, no mobile, forçar a
exibição desse mesmo menu no formato hamburger/drawer, em vez de manter
uma segunda lista curada e divergente.

## Tarefa

1. **Remover `MobileBottomNav.tsx` do `app.tsx`** — deixar de renderizar
   a barra fixa de 5 itens.
2. Confirmar (ou implementar, se ainda não existir de forma completa)
   que `Sidebar.tsx` já tem um comportamento responsivo correto:
   desktop = sidebar fixa lateral; mobile = ícone hamburger no topo
   abrindo drawer com a **mesma lista de 11 itens, mesma ordem**.
   Se o `Sidebar.tsx` atual só foi pensado pra desktop e o
   comportamento hamburger mostrado na captura de Paulo vem de outro
   lugar (verificar — pode ser um componente de header/topbar
   separado controlando abertura do drawer), consolidar tudo num único
   componente responsável pela navegação, independente de breakpoint.
3. Não deletar o arquivo `MobileBottomNav.tsx` do repositório
   imediatamente — comentar/remover a importação e renderização em
   `app.tsx`, e deixar o arquivo como candidato a remoção definitiva
   numa rodada de limpeza de código morto futura (não é o foco deste
   prompt, evitar risco de deletar algo que ainda tenha teste
   dependente sem verificar primeiro).
4. Testar em pelo menos 3 breakpoints (375px, 768px, 1024px+) que a
   transição do drawer pro layout desktop acontece sem quebra de
   layout, sem sobreposição de elementos, e sem a barra fixa antiga
   deixando um espaço vazio na parte de baixo da tela.
5. Confirmar que o item ativo (destaque visual, ex: "Financial
   Independence" com fundo verde na captura de Paulo) continua
   funcionando corretamente após a consolidação — usar
   `useLocation()`/`isActive` já existente no `Sidebar.tsx`.

## Gate de Saída

- `npx tsc --noEmit`, `npx vitest run` (atualizar/remover testes que
  dependiam de `MobileBottomNav` sendo renderizado, se existirem),
  `npm run build`.
- Screenshot ou descrição visual em 375px, 768px e 1024px+ mostrando
  o menu único funcionando em cada um.
- Confirmar não há mais 2 elementos de navegação simultâneos visíveis
  no mobile.

## Proibido

- Não criar uma terceira variante de menu "combinando o melhor dos
  dois" — a decisão já é usar o modelo do Sidebar como único.
- Não deletar `MobileBottomNav.tsx` fisicamente nesta rodada.
