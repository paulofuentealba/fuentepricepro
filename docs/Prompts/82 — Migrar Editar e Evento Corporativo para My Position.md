# 82 — Migrar Editar Posição e Evento Corporativo pra Dentro de "My Position"

## Contexto e protótipo aprovado

Paulo aprovou o protótipo v2 (`prototipo_my_position_v2.html`, anexo):
as telas completas de "Update Holdings" (`EditItemDialog.tsx`) e "Apply
Corporate Event" (`CorporateEventModal.tsx`) — hoje modais separados,
abertos pelo menu `⋯` do card na Watchlist — passam a viver **embutidas
dentro da aba "My Position"** do `AssetDetailSheet.tsx`, como 2 seções
recolhíveis, no espaço que hoje fica vazio abaixo dos cards de estatística
(QTY/Safety Margin/Projected Income/Position Value).

**Não é mover um botão de atalho — é mover a tela inteira.** Depois de
migrado, remover os itens "Editar" e "Evento Corporativo" do menu `⋯` do
card (`AssetCardHeader.tsx`) — só sobra Compartilhar / Compartilhar no
Insta / Remover ali.

## Escopo técnico

### 1. Duas seções recolhíveis dentro de `TabsContent value="myPosition"`

Em `AssetDetailSheet.tsx`, logo abaixo de `<AssetHoldings item={item}
activeMargin={valuation.margin} />` (mantido como está — são os 4 cards
de estatística no topo, não mexer):

- **Seção "Editar Posição"**: aberta por padrão (decisão já validada no
  protótipo — é a ação mais usada).
- **Seção "Evento Corporativo"**: fechada por padrão (mais rara).
- Usar o componente de disclosure/collapsible já existente no design
  system do app, se houver um (verificar `src/components/ui/` antes de
  criar um novo) — não reinventar um accordion do zero se já existe
  equivalente.

### 2. Extrair o conteúdo de `EditItemDialog.tsx` sem duplicar lógica

O conteúdo do formulário (Quantidade Possuída, Preço Médio, Investindo
Desde, Yield Alvo, e o bloco de Prévia — Preço Teto/Custo Total/Renda
Anual Projetada/Yield on Cost) precisa continuar funcionando
**exatamente como hoje** (mesma lógica de transação sintética por delta,
já corrigida em auditoria anterior desta sessão — não regredir isso).

Extrair o corpo do formulário (sem o `Dialog`/`DialogContent` que o
envolve hoje) para um componente apresentacional reutilizável — mesmo
padrão já usado na extração de `TransactionFormFields.tsx` a partir de
`TransactionForm.tsx` (prompt anterior desta sessão): o componente de
conteúdo não decide seu próprio container (modal vs. inline), só recebe
`item`/`onSave`/etc. e renderiza os campos.

`EditItemDialog.tsx` em si pode deixar de existir como modal se não
tiver mais nenhum outro ponto de entrada além do card (confirmar se há
outro caller antes de remover o arquivo) — ou pode ser mantido como
wrapper fino em torno do novo conteúdo extraído, igual ao padrão que
`TransactionForm.tsx` virou.

### 3. Extrair o conteúdo de `CorporateEventModal.tsx` da mesma forma

Mesmo tratamento: Tipo de Evento (Desdobramento/Grupamento), Proporção
(Fator), bloco de simulação (Posição Atual → Nova Posição), botão
"Aplicar Evento" — extrair o corpo sem o `Dialog` que envolve hoje,
preservando 100% a lógica de cálculo de `factor` já existente
(`eventType === "split" ? numericRatio : 1 / numericRatio`) e a criação
da transação `corporate_action`.

### 4. Remover os 2 itens do menu `⋯` do card

`AssetCardHeader.tsx`: remover os `<DropdownMenuItem onClick={onEdit}>`
e `<DropdownMenuItem onClick={onCorporateEvent}>` (e o
`<DropdownMenuSeparator />` associado, se ficar redundante com só 3 itens
restantes). Remover as props `onEdit`/`onCorporateEvent` da interface do
componente e de todos os callers, junto com qualquer estado
(`showEditDialog`/`showCorporateEventModal` no componente pai) que fique
órfão depois dessa remoção — não deixar dead code.

**Atenção ao "pending event" badge**: `AssetCardHeader.tsx` hoje mostra
um indicador visual quando há `pendingEvent` (evento corporativo
detectado mas não aplicado ainda, linha ~164 do arquivo) — esse badge
**deve continuar existindo** no card (é informativo, não é o gatilho do
modal), só o clique que abria o modal direto do card é que muda de
comportamento: agora deveria levar o usuário pra dentro do
`AssetDetailSheet`/aba "My Position" com a seção de Evento Corporativo
já aberta (em vez de abrir um modal separado) — investigar se isso é
viável de forma simples (ex: abrir o sheet com uma prop de "seção
inicial") ou se é aceitável só abrir o sheet na aba My Position sem
forçar a seção aberta, e reportar a decisão.

## Regras obrigatórias

- Não alterar nenhuma lógica de cálculo (delta de posição, `factor` de
  split/grupamento, criação de transação sintética) — só a apresentação
  (modal → seção inline).
- Testar que a lógica de idempotência/proteção de duplicata já
  implementada em `TransactionFormFields.tsx` (se este formulário a
  reaproveitar) continua funcionando.
- Cards de estatística no topo da aba "My Position" (`AssetHoldings`)
  não são tocados.

## Testes obrigatórios

1. Editar posição a partir da nova seção inline → confirmar que gera
   transação sintética corretamente (mesmo teste de regressão já
   existente, adaptado pro novo ponto de entrada).
2. Aplicar evento corporativo a partir da nova seção inline → confirmar
   `factor` correto e transação `corporate_action` criada.
3. Confirmar que o menu `⋯` do card não tem mais "Editar"/"Evento
   Corporativo", só os 3 itens restantes.
4. Confirmar que o "pending event" badge no card continua aparecendo
   quando há evento detectado.

## Verificação obrigatória

1. `npx tsc --noEmit`, `npm run test`, `npm run build` — limpos
2. Screenshot da aba "My Position" com as 2 seções (uma aberta, uma
   fechada) — comparar com o protótipo aprovado
3. Screenshot do menu `⋯` do card confirmando os 2 itens removidos

## Ao terminar

Atualizar `docs/SSOT.md`. Trabalhar em `dev`.
