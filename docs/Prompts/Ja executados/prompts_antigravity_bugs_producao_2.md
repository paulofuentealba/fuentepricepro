# Prompts para Antigravity — Bugs em Produção (branch `main`)

> Investiguei direto no `main` (clone real, não suposição). Achei a causa raiz
> confirmada do bug de Cash Flow. Erro de refresh e cores precisam de mais
> evidência antes de eu mandar corrigir às cegas — separei um prompt de
> diagnóstico para cada um.

---

## PROMPT 1 — Cash Flow mostrando ativos fora da carteira (CAUSA RAIZ CONFIRMADA)

```
Você vai atuar como Executor, seguindo Regra 8 (plano antes de código) do AGENTS.md.

CONTEXTO DO BUG:
Em src/routes/app/cashflow.tsx (linha 27), a tela de Cash Flow consome
`const { items } = useWatchlist();` e passa TODOS esses items para
<CashFlowCalendar items={items} /> sem nenhum filtro.

`useWatchlist()` retorna a watchlist inteira — ativos que o usuário está só
observando (sem posição real) E ativos que ele efetivamente possui. O restante
do produto já resolve essa distinção: em src/components/ceiling/Watchlist.tsx
linha 96, existe o padrão canônico:
  `activeValuedItems.filter((i) => i.averagePrice && i.averagePrice > 0 && i.quantity > 0)`

O Cash Flow nunca aplicou esse filtro. Resultado: ativos que o usuário só
está monitorando (quantity = 0 ou sem posição) aparecem projetando dividendos
no calendário, como se fizessem parte da carteira real.

TAREFA:
1. Confirme o diagnóstico lendo src/routes/app/cashflow.tsx e
   src/components/ceiling/Watchlist.tsx linha ~96 você mesmo antes de tocar
   em qualquer arquivo. Não assuma — releia.
2. Escreva um plano curto (Regra 8) propondo o filtro `quantity > 0 &&
   averagePrice && averagePrice > 0` aplicado aos `items` ANTES de passar
   para <CashFlowCalendar>. Aplique o mesmo padrão usado em Watchlist.tsx
   linha 96 — não invente uma condição nova.
3. Verifique se src/lib/cashflow.ts (buildMonthlyBuckets,
   computeInvestedVsReceived) tem alguma lógica que dependa implicitamente
   de receber a watchlist "crua" (ex: contagem de ativos monitorados vs.
   possuídos em algum resumo/summary). Se encontrar, sinalize antes de
   decidir sozinho — não corrija por conta própria.
4. Aplique o filtro em src/routes/app/cashflow.tsx.
5. Rode tsc --noEmit, npm run test, npm run build — cole o output literal
   dos três comandos, sem paráfrase.
6. Rode especificamente os testes de src/lib/__tests__/cashflow.test.ts e
   cashflowAnnounced.test.ts e confirme que continuam passando (esses testes
   podem estar montados em cima da lista completa — se quebrarem, é sinal de
   que a mudança precisa de ajuste, não que o teste está "errado").
7. Commit individual: fix(cashflow): filtrar watchlist para posições reais
   (quantity > 0) antes de projetar dividendos [Bug Produção]
8. Log em docs/PROMPTS_LOG.md.

PROIBIDO:
- Proibido tocar em Watchlist.tsx ou em qualquer outro arquivo fora do escopo
  acima.
- Proibido alterar a lógica interna de src/lib/cashflow.ts nesta rodada —
  o problema é no dado de entrada (items), não na fórmula.
- Proibido consolidar este commit com qualquer outra correção.
```

**Risco de regressão:** Baixo. É um filtro de entrada já usado em outro lugar do produto (Watchlist.tsx), não uma mudança de fórmula. Único cuidado real é o passo 3 (resumos que possam depender da lista crua).

---

## PROMPT 2 — Erro ao atualizar (F5) a página em produção (DIAGNÓSTICO — não corrigir ainda)

```
Você vai atuar como Auditor, não como Executor, nesta rodada. Regra 8 aplica:
sem diagnóstico confirmado, não existe plano de correção válido.

CONTEXTO:
Paulo reporta que, em produção (branch main), atualizar a página (F5 / reload)
gera erro. Não temos ainda a mensagem exata do erro nem em qual rota ele
ocorre — vamos assumir que pode ser em qualquer rota até prova em contrário.

TAREFA (só investigação, zero código alterado):
1. Abra a aplicação em produção (ou build de produção local: npm run build
   && npm run preview) e reproduza um hard refresh (Ctrl+Shift+R) nas
   seguintes rotas, em ordem: /app, /app/cashflow, /app/watchlist (ou
   equivalente), /settings, e qualquer rota que exija auth.
2. Para cada rota testada, registre: (a) reproduziu o erro? (b) mensagem
   exata do console do browser (stack trace completo, não resumo); (c) houve
   erro de rede (Network tab) associado, e qual status/endpoint.
3. Inspecione especificamente src/routes/__root.tsx e
   src/components/ErrorBoundary.tsx — confirme se existe error boundary
   cobrindo a árvore de rotas autenticadas, e se ele está de fato capturando
   o erro reportado (ou deixando a tela em branco / crash sem boundary).
4. Verifique se o erro está relacionado a SSR/hidratação: procure qualquer
   acesso a `window`, `localStorage` ou `sessionStorage` fora de useEffect/
   handlers de evento nos arquivos que a rota afetada importa (isso causa
   mismatch entre HTML de servidor e cliente em frameworks com SSR).
5. Verifique se o erro coincide com expiração/perda de sessão Firebase Auth
   no reload (corrida entre o listener de auth e o primeiro render que já
   tenta ler dado autenticado).

FORMATO DE SAÍDA — não pule esta parte:
- Rota, erro reproduzido (sim/não), stack trace literal, hipótese de causa
  raiz (com arquivo + linha, só se você realmente confirmou lendo o código —
  não generalize), e se cobre 100% das rotas testadas ou parcial.

PROIBIDO:
- Proibido alterar qualquer arquivo nesta rodada.
- Proibido propor correção sem ter o stack trace real em mãos — "acho que é
  hidratação" sem evidência não é diagnóstico aceito.
```

**Por que diagnóstico antes de fix:** sem a mensagem de erro real, qualquer correção seria adivinhação em uma área sensível (rota autenticada em produção) — vai contra o padrão "investigar primeiro, apresentar opções" já estabelecido no projeto.

---

## PROMPT 3 — Cores do Cash Flow "não ficaram legais" (DIAGNÓSTICO — precisa de referência visual)

```
Você vai atuar como Auditor visual, não como Executor, nesta rodada.

CONTEXTO:
Paulo reportou que as cores do Cash Flow em produção não ficaram legais, sem
especificar quais elementos. O componente já usa tokens (`var(--realized)`,
`var(--projected)`, `var(--primary)` via color-mix) em vez de hex hardcoded —
então o problema provavelmente é de VALOR do token ou de CONTRASTE/hierarquia,
não de hardcode.

TAREFA:
1. Rode a aplicação e tire screenshot de src/components/ceiling/cashflow/
   CashFlowChart.tsx renderizado, em light mode e dark mode, em viewport
   mobile (375px) e desktop.
2. Liste, token por token usado no arquivo (--realized, --projected,
   --primary, COLOR_LINE, COLOR_BAR, COLOR_INVESTED, COLOR_MUTED_FG,
   COLOR_FOREGROUND), o valor resolvido atual em styles.css e onde cada um
   aparece visualmente no gráfico.
3. Avalie contraste (WCAG AA como piso) entre texto sobre barra e a própria
   barra, e entre "realizado" vs "projetado" — eles precisam ser
   visualmente distinguíveis à primeira vista, não só por legenda.
4. NÃO altere nenhum valor de cor ainda. Reporte o que encontrou e proponha
   no máximo 2-3 ajustes específicos (token + novo valor sugerido), citando
   se cada um resolve contraste, harmonia com "Horizonte FI" (petróleo
   #2C6B63 / emerald hue 162, paper #F7F4EC / #15120C), ou ambos.

PROIBIDO:
- Proibido decidir e aplicar uma paleta nova sozinho — cor final é decisão
  de produto/UX, volta para Paulo aprovar antes de qualquer commit.
```

**Nota:** peça a Paulo, se possível, um screenshot específico do que incomodou — "não ficou legal" é subjetivo demais para virar correção sem referência visual, e eu não tenho acesso à tela renderizada daqui.

---

## PROMPT 3 — DECISÃO FINAL (revisada com `/frontend-design` + `/fuente-ux-designer`)

Chamei os dois papéis pra fechar isso, não é mais menu de opções.

**Achado adicional relevante antes da decisão:** o hatch pattern diagonal
para "projetado" **já existe** no código
(`src/components/ceiling/cashflow/CashFlowChart.tsx` linhas 283-292,
`id="projectedHatch"`) e já usa `var(--projected)` no stroke. Ou seja, a
"pista de forma" que eu tinha sugerido como Opção C4 **já está implementada**
— o problema real é só que o token de cor por trás dela é fraco demais pra
essa pista se destacar. Isso muda a decisão: não precisamos inventar padrão
novo, só consertar o token que alimenta o que já existe.

**Veredito UX (`fuente-ux-designer`):** cor aqui é semântica (Realizado =
fato consumado, Projetado = expectativa) — regra do skill é clara: "zero cor
bonita sem significado" e contraste UI ≥ 3:1. A C1 original (dessaturar)
resolve o significado mas ainda compete pouco com o hatch já existente.
**Veredito frontend-design:** "gaste sua ousadia em um lugar só" — o hatch já
É o elemento de assinatura dessa tela; a cor por trás dele deve ficar mais
quieta, não competir com ele.

**Decisão final — combinação C1 + reforço do hatch existente, sem inventar
elemento novo:**

| Token | Antes | Depois (proposto) | Racional |
|---|---|---|---|
| `--realized` (light) | `oklch(0.523 0.082 156.3)` | **sem mudança** | Continua o verde "de sempre" — âncora de confiança, é dinheiro que já caiu |
| `--projected` (light) | `oklch(0.68 0.11 156.3)` | `oklch(0.80 0.045 174)` | Mais claro, MENOS saturado, e hue desviado de 156→174 (na direção do `--primary` 184.1, mas sem virar teal puro) — some junto com o hatch em vez de competir com ele |
| `--realized` (dark) | `oklch(0.68 0.09 156.3)` | **sem mudança** | idem |
| `--projected` (dark) | `oklch(0.80 0.08 156.3)` | `oklch(0.58 0.04 174)` | Mesma lógica — mais escuro/dessaturado que o realizado no dark, deixa de "gritar" |
| Opacidade da linha do hatch (`strokeOpacity`) | `0.85` | `0.7` (levemente reduzida, já que o token de fundo ficou mais fraco de propósito — o padrão passa a ser reconhecível pela FORMA, cor só reforça) | Evita dois sinais fortes competindo entre si (regra "gaste ousadia em um lugar só") |

**Por que não fui pra C2/C3:** C2 (reusar hue do `--primary`) ficaria fácil
de confundir "projetado" com um elemento de navegação/ação (o teal já
significa "ação primária" em outros lugares do produto — quebraria
consistência semântica). C3 (contraste máximo) é mais acessível em teoria,
mas o skill de UX pede "cor funcional, não decorativa" — mudar radicalmente
a aparência do gráfico sem necessidade também não é "restraint" na visão do
frontend-design.

**PRONTO PARA EXECUÇÃO** (não precisa mais voltar pra Paulo, a menos que ele
discorde):

```
Você vai atuar como Executor, seguindo Regra 8.

TAREFA:
1. Em src/styles.css, atualizar --projected em :root (linha ~154) para
   oklch(0.80 0.045 174) e em .dark (linha ~208) para oklch(0.58 0.04 174).
   NÃO alterar --realized em nenhum dos dois blocos.
2. Em src/components/ceiling/cashflow/CashFlowChart.tsx linha ~290, reduzir
   strokeOpacity do hatch de 0.85 para 0.7.
3. Confirme com um checker de contraste real (ex: navegador devtools ou
   biblioteca) que --projected mantém contraste ≥ 3:1 contra --card em
   AMBOS os temas — se não passar, ajuste lightness (não hue/chroma) até
   passar, e reporte o valor final usado.
4. Verifique visualmente (screenshot) que --projected NÃO é usado em mais
   nenhuma tela além do Cash Flow antes de considerar essa mudança de baixo
   risco — se for usado em outro lugar, pare e reporte antes de prosseguir.
5. Rode tsc --noEmit, npm run build. Não precisa rodar suite de testes
   completa para mudança de token puro, mas rode qualquer teste snapshot
   visual se existir.
6. Commit: style(cashflow): dessaturar --projected e reduzir opacidade do
   hatch para distinguir de --realized [Bug Produção]
```

**Risco de regressão:** Baixo, condicionado ao passo 4 (token compartilhado).

---

## PROMPT 4 — Termos de Assinatura (minuta gerada com `/fuente-advogado-lgpd-gdpr`)

Paulo pediu pra eu fazer o trabalho em vez de só listar perguntas. Fiz —
com uma ressalva que o próprio papel de advogado-proxy exige por design:
isto é uma **minuta de trabalho**, não o documento final. O skill
`fuente-advogado-lgpd-gdpr` é explícito: "NÃO substitui advogado humano em
decisão de alto risco" — termos de assinatura de um produto financeiro,
com cláusula de cancelamento/reembolso, ENTRAM nessa categoria (é direito
do consumidor — CDC — não só LGPD). Então: minuta pronta pra você revisar e
mandar pra um advogado humano validar antes de publicar. Isso não bloqueia
o Antigravity de já trocar o link do rodapé para uma rota `/subscription-terms`
que serve ESTA minuta com um aviso "sujeito a alterações" — se você preferir
publicar já e formalizar depois, também é uma opção válida, sua escolha.

### MINUTA — Termos de Assinatura (Fuente Price Pro)
> **Rascunho de trabalho — requer revisão de advogado humano antes de
> publicação final.** Gerado a partir do que já está documentado no
> projeto (roadmap, LGPD gate, modelo freemium→Pro).

---

**1. Objeto**
Estes Termos de Assinatura regem a contratação do plano pago ("Pro") do
Fuente Price Pro, complementando os Termos de Uso gerais. Ao assinar o
plano Pro, o usuário concorda com as condições abaixo.

**2. Planos e cobrança**
2.1. O Fuente Price Pro oferece um plano gratuito ("Free"), com limite de
[X] ativos monitorados, e um plano pago ("Pro"), com acesso completo às
funcionalidades descritas na página de preços.
2.2. A cobrança do plano Pro é recorrente, processada via Stripe, nas
periodicidades e valores exibidos no momento da contratação (mensal e/ou
anual).
2.3. *(Campo aberto — Paulo/advogado definem):* [ ] Sem período de teste
gratuito / [ ] Com período de teste de ___ dias, cobrado automaticamente ao
final salvo cancelamento.

**3. Cancelamento**
3.1. O usuário pode cancelar a assinatura a qualquer momento, em
Configurações → Assinatura, sem necessidade de contato com suporte.
3.2. O cancelamento interrompe a renovação automática. O acesso ao plano
Pro permanece ativo até o fim do período já pago.
3.3. *(Campo aberto):* [ ] Não há reembolso proporcional de período não
utilizado / [ ] Reembolso proporcional aplicável em até ___ dias da
cobrança, conforme direito de arrependimento do Art. 49 do CDC quando
aplicável a contratações à distância.

**4. Efeito do cancelamento/downgrade sobre os dados**
4.1. Ao encerrar o plano Pro (por cancelamento ou inadimplência), a conta
retorna ao plano Free. Posições e transações que excedam o limite do plano
Free permanecem armazenadas, porém com visualização/edição restrita até
nova assinatura ou exclusão manual pelo usuário.
4.2. Em nenhuma hipótese o downgrade resulta em exclusão automática de
dados do usuário — exclusão só ocorre por ação explícita do usuário
(Configurações → Privacidade → Excluir Conta), conforme já implementado no
fluxo de exclusão (`accountDeletion.ts`).

**5. Reajuste de preço**
5.1. Qualquer reajuste de valor para assinantes ativos será comunicado com
no mínimo [30] dias de antecedência, por e-mail e/ou aviso no aplicativo,
antes de entrar em vigor na próxima renovação.

**6. Dados de pagamento e transferência internacional**
6.1. O processamento de pagamentos é feito pelo Stripe, que pode processar
dados (nome, e-mail, forma de pagamento) em servidores fora do Brasil. Essa
transferência internacional é amparada por [Cláusulas Contratuais Padrão /
DPA do Stripe — confirmar documentação vigente com o Stripe antes de
publicar].
6.2. O Fuente Price Pro não armazena dados completos de cartão de
crédito — o processamento é feito diretamente pelo Stripe.

**7. Natureza do serviço — Disclaimer regulatório**
7.1. O Fuente Price Pro é uma ferramenta de consolidação de dados e apoio à
decisão. As informações, cálculos e projeções gerados pela plataforma não
constituem recomendação, aconselhamento ou indicação de investimento. A
decisão final de alocação de capital é de responsabilidade exclusiva do
usuário. *(Mesmo texto-base já usado no rodapé do produto — mantém
consistência, é o item de backlog "disclaimer CVM pré-Fase 4" sendo
resolvido aqui também.)*

---

**Itens que EU não decidi e precisam de você/advogado antes de publicar:**
- Prazo exato de reembolso (se houver) e se há período de teste gratuito.
- Confirmação textual do DPA/SCC do Stripe (varia conforme contrato
  vigente — não posso confirmar isso sem consultar a documentação
  contratual real do Stripe assinada por você).
- Se CDC brasileiro exige alguma cláusula adicional específica pro seu caso
  (ex: se o produto for enquadrado como "conteúdo digital" vs "serviço
  contínuo" pode mudar o prazo de arrependimento) — isso é julgamento
  jurídico real, não decido sozinho.

---

## Revisão de Product Marketing sobre a minuta (`/fuente-product-marketing`)

Paulo pediu pra não esperar — revisão feita agora, em conjunto com o que o
`fuente-advogado-lgpd-gdpr` já redigiu. Aplicando a regra do skill de
marketing ("Transparência Radical" — nunca esconder preço/condição, sempre
mostrar Free vs Pro lado a lado, ancorar em valor, não em custo):

**Ponto por ponto:**

| Cláusula da minuta | Avaliação de Marketing | Ação |
|---|---|---|
| 2. Planos e cobrança | Juridicamente correta, mas fria — não comunica valor, só mecânica de cobrança | Manter cláusula jurídica como está (é contrato, não precisa vender), mas a página **em volta** dela precisa ter a tabela Free vs Pro lado a lado ANTES do texto legal — hoje a página de preços já deveria ter isso, confirmar se tem |
| 3. Cancelamento | Bom — "sem necessidade de contato com suporte" é exatamente o tipo de fricção zero que constrói confiança (Regra "Transparência Radical") | Manter como está, é ponto forte, não mexer |
| 3.3 — reembolso (campo aberto) | **Risco de copy:** se publicar com colchete `[ ]` visível, quebra confiança na hora — parece rascunho abandonado, pior do que não ter a página | **Bloqueante para publicação** até Paulo/advogado escolherem uma das duas opções — não é só formatação, texto com placeholder visível é pior que link morto que já estamos corrigindo |
| 4. Efeito do downgrade | Muito bom do ponto de vista de confiança — "em nenhuma hipótese exclusão automática" é uma garantia forte, vale destacar isso em **negrito** ou como bullet separado na página, não enterrar em parágrafo corrido | Sugestão de formatação: extrair 4.2 como um card/callout próprio "Seus dados nunca são apagados por downgrade" |
| 5. Reajuste de preço | 30 dias é padrão de mercado, ok | Sugestão: se no futuro Paulo quiser usar isso como gancho de conversão early-adopter, adicionar cláusula de "grandfathering" (preço atual mantido enquanto não cancelar) — não é jurídico, é oportunidade de copy pra depois, não bloqueia agora |
| 6. Stripe / transferência internacional | Correto e necessário, mas é o tipo de cláusula que assusta o investidor iniciante se aparecer isolada | Sugestão: complementar com uma linha simples tipo "Isso é o mesmo processo usado por Nubank, Stripe e qualquer app que aceita cartão — não muda a segurança dos seus dados de carteira" — humaniza sem imprecisão jurídica. **Só incluir se advogado aprovar o adendo**, não é cláusula, é texto de apoio ao lado |
| 7. Disclaimer CVM | Bom, já reusa o texto que existe no rodapé — consistência é uma vitória de marketing por si só (usuário não lê texto diferente em lugar diferente) | Manter — não mexer, consistência > novidade aqui |

**Veredito de Marketing:** Aprovado com ressalva — a estrutura jurídica está
sólida e o tom já é razoavelmente direto, mas **não publicar com os campos
`[ ]` visíveis** (item 3.3 principalmente). Isso é o único bloqueante real
de copy. O resto são melhorias de apresentação (callouts, tabela Free/Pro
antes do texto legal), não bloqueiam publicação.

**Trabalho conjunto com advogado — o que fica definido agora:** a
estrutura das 7 seções está aprovada por ambos os papéis. O que falta é
só Paulo decidir os 3 campos abertos (reembolso, trial, DPA Stripe) — a
partir do momento que ele decidir, nem marketing nem jurídico têm mais
objeção pendente, pode ir pro Prompt 4b.

---

## PROMPT 4b — Execução técnica (só depois da minuta acima ser aprovada)

```
Você vai atuar como Executor, seguindo Regra 8.

PRÉ-REQUISITO: Paulo confirmou que a minuta de Termos de Assinatura (anexa
a este prompt) pode ser publicada — com ou sem revisão de advogado humano
formal, conforme decisão dele. NÃO prossiga se essa confirmação não vier
explicitamente antes da execução.

TAREFA:
1. Criar rota /subscription-terms (padrão das rotas /privacy e /terms já
   existentes em src/routes/) renderizando o conteúdo da minuta, com aviso
   visível no topo: "Sujeito a alterações" se a revisão jurídica formal
   ainda não tiver ocorrido (confirme com Paulo qual é o caso).
2. Adicionar chaves de i18n para o conteúdo nos 3 idiomas — a minuta acima
   está em PT-BR; peça tradução profissional ou gere rascunho EN/ES e
   sinalize que também precisa de revisão, não publique como definitivo.
3. Em src/routes/index.tsx linha 602, trocar <a href="#"> por <Link
   to="/subscription-terms">.
4. Para "External Links" (linha 598): já que não há conteúdo definido ainda
   para isso separadamente, e a minuta acima não cobre esse item, REMOVER
   esse link específico nesta rodada (Opção B original) — não inventar
   conteúdo pra ele.
5. Rode tsc --noEmit, npm run test, npm run build — output literal.
6. Commit: feat(legal): publicar rota /subscription-terms e corrigir link
   do rodapé; remover link "External Links" sem conteúdo definido
   [Bug Produção]
```

---

## PROMPT 5 — Erro ao atualizar `/app/myportfolio` (EVIDÊNCIA FORTE, hipótese testável)

```
Você vai atuar como Auditor primeiro, e só como Executor depois de confirmar
a causa (Regra 8).

CONTEXTO (confirmado no vídeo + código):
No vídeo, na rota /app/myportfolio, aparece o spinner "Loading portfolio..."
e em seguida a tela de erro do TanStack Router:
  "This page didn't load — Something went wrong on our end. Try again or
  head back home."
Esse texto vem de src/routes/__root.tsx (ErrorComponent, linha ~44) ou de
src/components/RouteBoundaries.tsx (RouteErrorComponent) — ambos com o mesmo
texto, preciso que você confirme qual dos dois foi acionado.

Pontos relevantes já identificados no código:
- src/routes/app/myportfolio.tsx usa `lazy(() => import(...))` para
  FIProgressCard e Watchlist (code-splitting).
- O padrão clássico que causa exatamente esse sintoma (spinner → erro
  genérico, especificamente após navegar/atualizar depois de um tempo de
  sessão aberta) é: o browser tem a versão antiga do app carregada, o
  usuário navega para uma rota lazy, o import() tenta buscar um arquivo de
  chunk JS com hash da build ANTERIOR, que não existe mais no servidor
  porque houve um novo deploy — isso gera um erro (tipicamente
  "Failed to fetch dynamically imported module" ou 404) capturado pelo
  error boundary da rota.
- IMPORTANTE — achado adicional: src/lib/google-error-reporting.ts está
  incompleto. `reportGoogleError()` hoje só faz `console.error(...)` — a
  integração real com Analytics/Crashlytics está comentada
  ("// Example integration ..."). Ou seja, hoje ESSE ERRO NÃO ESTÁ SENDO
  REGISTRADO EM LUGAR NENHUM que Paulo possa consultar. A única forma de
  saber que aconteceu foi um vídeo manual. Isso é achado de severidade alta
  por si só, independente da causa raiz do erro específico.

TAREFA:
DECISÃO DE PAULO PARA ESTA RODADA: aplicar SOMENTE o fix do reload de chunk.
A integração de reportGoogleError() com um provedor real (Crashlytics/GA4/
Sentry) fica em BACKLOG — não decidir nem implementar isso agora. Deixe o
stub como está (só console.error) e registre o item em BACKLOG_V2.md como
pendente de decisão de provedor.

ACHADO ADICIONAL A CONFIRMAR ANTES DE CORRIGIR (verificado por Claude):
Em src/routes/app.tsx, o componente AppLayout (layout pai de TODAS as rotas
/app/*, incluindo /app/myportfolio) faz:
  `const { user } = useAuth();`
e usa `user` para decidir o que renderizar (ex: GuestWarningBanner), mas
NUNCA lê o campo `loading` que useAuth() também expõe (src/lib/auth-provider.tsx
linha 7). Ou seja, no primeiro render de um F5, `loading=true` e `user=null`
são indistinguíveis de "usuário deslogado de verdade" para esse componente e
para qualquer filho que dependa dele. Isso é uma SEGUNDA hipótese plausível
(corrida de auth), independente da hipótese de chunk desatualizado — as duas
podem estar acontecendo, ou só uma. Investigue as duas, não pare na primeira
que "parece" certa.

TAREFA:
1. Reproduza a hipótese de CHUNK: abra /app/myportfolio, force um novo
   deploy (ou simule deletando/renomeando um chunk gerado em dist/
   localmente) e depois navegue para a rota sem dar reload completo —
   confirme se reproduz esse exato erro. Cole o stack trace real do console
   (não resuma).
2. Reproduza a hipótese de AUTH RACE: dê um hard refresh em /app/myportfolio
   com throttling de rede (Slow 3G no DevTools) e veja se o erro aparece
   consistentemente quando o Firebase Auth demora mais para reidratar. Leia
   o que Watchlist.tsx e FIProgressCard.tsx fazem quando `user` é `null`
   (redirecionam? tentam query com uid indefinido? lançam exceção?).
3. Reporte qual das duas (ou ambas) reproduziu, com stack trace literal.
4. Só depois de confirmado: implemente a correção correspondente.
   - Se for chunk: handler global que detecte especificamente erro de
     import dinâmico falho ("Failed to fetch dynamically imported module")
     e force `window.location.reload()` uma única vez, com flag em
     sessionStorage para não entrar em loop.
   - Se for auth race: `AppLayout` (e qualquer componente que dependa de
     `user` para decisão crítica) deve checar `loading` e mostrar skeleton/
     aguardar antes de tratar `user === null` como "deslogado".
5. Rode tsc --noEmit, npm run test, npm run build — output literal.
6. Commit individual (só o fix confirmado desta rodada — NÃO mexer em
   reportGoogleError/observabilidade agora):
   fix(app): corrigir erro de reload em /app/myportfolio [Bug Produção]
7. Adicione em BACKLOG_V2.md: "Integrar reportGoogleError com provedor real
   (Crashlytics/GA4/Sentry) — decisão de provedor pendente com Paulo."

PROIBIDO:
- Proibido implementar qualquer correção sem antes confirmar via reprodução
  qual das duas hipóteses (ou ambas) é a causa real — não adivinhe.
- Proibido tocar em reportGoogleError() ou escolher provedor de
  observabilidade nesta rodada — Paulo decidiu adiar essa decisão.
```

**Risco de regressão:** Médio — mexe em comportamento global de erro de rota e/ou de auth gating, que se mal calibrado pode mascarar erros reais ou atrasar renderização legítima (por isso os passos 1-3 exigem confirmação por reprodução antes de qualquer código).

---

## PROMPT 6 — Smart Allocation: Opção A CONFIRMADA — filtro + correção de copy watchlist→portfolio

Paulo confirmou a Opção A e foi além: o motivo de restringir a "só carteira"
não é só confiança pontual, é conceitual — Smart Allocation deve fazer
alocação de **portfólio**, não de watchlist. Isso significa que o código
(filtro) e o COPY da tela precisam mudar juntos, ou a tela vai continuar
prometendo "watchlist" enquanto entrega "portfolio" (achado que eu mesmo
sinalizei na revisão de governança anterior — Business Architect pegou
isso certo).

**Escopo da mudança de copy — decisão deliberada, não é rename geral:**
Troquei "watchlist" só nas 2 strings que pertencem à TELA Smart Allocation
(`smartAllocation.subtitle` e `smartAllocation.noAssetsInCurrency`), nos 3
idiomas. **Não** estou tocando no nome da feature "Watchlist" em si (menu,
`Watchlist.tsx`, `useWatchlist()`, tipo `WatchlistItem`, toasts de
"Adicionado à watchlist" etc.) — isso é uma estrutura de dado e uma feature
inteira do produto, usada em telas que continuam mostrando ativos
monitorados E possuídos juntos (isso é correto pra elas, é o Cash Flow e o
Screener que têm esse comportamento misto por design). Só a Smart
Allocation, especificamente, muda de "puxa da watchlist" pra "puxa do
portfolio". Se a intenção for maior que isso — renomear a feature inteira
de Watchlist pra Portfolio em todo o produto — isso é decisão de escopo bem
maior (toca tipo de dado, testes, rotas) e prefiro confirmar com você
antes de incluir num prompt de bugfix. Presumi o escopo menor; avise se
quer o rename completo.

```
Você vai atuar como Executor, seguindo Regra 8 do AGENTS.md.

DECISÃO CONFIRMADA POR PAULO: Opção A — Smart Allocation só sugere ativos
já presentes na carteira (quantity > 0). Sem opção B, sem badge de "nova
posição" — não é mais necessário, o filtro remove o caso todo.

TAREFA — PARTE 1 (código, causa raiz já mapeada):
1. Em src/lib/allocation.ts, função computeSmartAllocation, linha ~143,
   alterar o filtro de candidates para incluir `i.quantity > 0`:
   const candidates = sameCurrency.filter(
     (i) => !excludedTickers.includes(i.ticker) && i.currentPrice > 0 &&
       i.annualDividend > 0 && i.quantity > 0,
   );
2. Rode o app localmente com uma carteira pequena (poucos ativos com
   quantity > 0) e reporte quantas sugestões restam. Se cair para 0-1
   sugestões em cenários comuns (ex: carteira com 3-5 ativos), isso é
   esperado pelo novo comportamento — não é bug, mas RELATE o número real
   observado no output do prompt, Paulo precisa saber o tamanho do efeito.
3. Verifique se `empty: true` (retornado quando `candidates.length === 0`,
   linha ~151) já tem uma mensagem de vazio adequada para esse novo
   cenário mais comum (carteira pequena = mais chance de zero candidatos)
   — se a mensagem de vazio atual ainda fala em "watchlist" em vez de
   "portfolio", corrija junto (ver Parte 2 abaixo pelas chaves i18n
   exatas).

TAREFA — PARTE 2 (copy, escopo restrito à tela Smart Allocation apenas):
4. Em src/lib/i18n/dict.en.ts, dict.ptBR.ts, dict.es.ts, dentro do bloco
   `smartAllocation`, alterar SOMENTE estas duas chaves (não mexer em
   nenhuma outra ocorrência de "watchlist" no restante dos arquivos):

   dict.en.ts:
     subtitle: "Allocate your available cash across the most undervalued
       assets in your watchlist."
     → "Allocate your available cash across the most undervalued assets
       already in your portfolio."
     noAssetsInCurrency: "You don't have any watchlist assets in this
       currency yet."
     → "You don't have any portfolio assets in this currency yet."

   dict.ptBR.ts:
     subtitle: "Distribua seu capital disponível entre os ativos mais
       descontados da sua watchlist."
     → "Distribua seu capital disponível entre os ativos mais descontados
       já presentes no seu portfólio."
     noAssetsInCurrency: "Você ainda não tem ativos nesta moeda na sua
       watchlist."
     → "Você ainda não tem ativos nesta moeda no seu portfólio."

   dict.es.ts:
     subtitle: "Asigna tu capital disponible entre los activos más
       subvalorados en tu watchlist."
     → "Asigna tu capital disponible entre los activos más subvalorados ya
       presentes en tu portafolio."
     noAssetsInCurrency: "Aún no tienes activos en la watchlist en esta
       moneda."
     → "Aún no tienes activos en esa moneda en tu portafolio."

5. Confirme por busca textual que NENHUMA outra tela/componente importa
   essas duas chaves específicas (`smartAllocation.subtitle`,
   `smartAllocation.noAssetsInCurrency`) fora de SmartAllocation.tsx — são
   chaves aninhadas dentro do namespace `smartAllocation`, improvável
   colisão, mas confirme antes de considerar risco baixo.
6. Rode tsc --noEmit, npm run test, npm run build — output literal.
7. Commit único (código + copy são a mesma correção conceitual, não
   separar): fix(smart-allocation): restringir sugestões a ativos do
   portfólio (quantity > 0) e atualizar copy de watchlist→portfolio
   [Bug Produção]

PROIBIDO:
- Proibido tocar em qualquer outra ocorrência de "watchlist" fora do bloco
  `smartAllocation` — isso inclui o menu lateral, Watchlist.tsx, toasts de
  adicionar/remover, título "Minha Watchlist", limite de plano Free, e
  qualquer outra tela. Rename maior é decisão separada, não decida sozinho
  que o escopo deveria ser maior.
- Proibido remover a informação da UI que mostra a origem do dado (Fuente
  Consensus, yield, etc.) — mudança é só filtro + as 6 strings listadas.
```


---

## PROMPT 7 — Cash Flow: mês atual (Agosto) aparece anormalmente baixo (EVIDÊNCIA CRUZADA, hipótese testável)

```
Você vai atuar como Auditor primeiro (Regra 8) — hipótese testável, não
corrigir às cegas.

CONTEXTO (vídeo completo + código):
No gráfico anual do Cash Flow, a barra de Agosto (mês corrente na gravação)
aparece muito menor que Julho e Setembro — Paulo circulou esse ponto no
vídeo. Isso contradiz outra tela do mesmo produto na MESMA sessão: em My
Portfolio → Upcoming Payments, aparecem vários pagamentos previstos
justamente para agosto (ex: BTLG11 dia 24, PETR4 dia 20, ITUB3 dia 31) —
ou seja, o sistema "sabe" que há dividendos vindo em agosto em uma tela,
mas o gráfico de Cash Flow mostra o oposto.

Pontos de partida no código (src/lib/cashflow.ts, função
buildMonthlyBuckets):
- Linha ~170: `isPast` é calculado como
  `calendarMonth < currentMonthIndex` — ou seja, o mês corrente (agosto)
  NÃO é tratado como passado, deveria seguir o mesmo caminho de projeção
  (`b.amount`) que setembro/outubro. Confirme se realmente é isso que
  acontece em runtime, ou se há algum outro ponto do código que trata o
  mês corrente de forma diferente do resto do bloco "futuro/projetado".
- Linha ~148-166 (distribuição de `annual` em `detected` meses por ativo):
  confirme se todos os ativos que aparecem em "Upcoming Payments" com data
  em agosto também têm agosto (`paymentMonths` ou fallback por tipo) no
  conjunto `detected` desse mesmo cálculo — se não tiverem, é aí que está
  a divergência entre as duas telas.

TAREFA:
1. Reproduza a tela de Cash Flow com a mesma carteira usada no vídeo (ou
   equivalente) e confirme visualmente a barra de agosto baixa.
2. Adicione um log temporário (ou use debugger) em buildMonthlyBuckets para
   imprimir, por ativo, quais `detected` months cada item recebeu e quanto
   contribuiu pro bucket de agosto — comparando contra a lista real de
   Upcoming Payments de agosto vista em My Portfolio.
3. Identifique exatamente qual ativo (ou quais) deveria contribuir pra
   agosto e não está contribuindo, ou está contribuindo com valor muito
   menor do que deveria.
4. Reporte a causa raiz encontrada, com arquivo + linha exata, ANTES de
   propor a correção — não implemente ainda.

PROIBIDO:
- Proibido "ajustar" a fórmula sem antes identificar exatamente qual
  ativo/mês está causando a divergência — isso é dado financeiro real
  (SSOT), regra 4 do AGENTS.md é inegociável aqui.
```

---

# REVISÃO DE GOVERNANÇA — 9 PAPÉIS × 7 PROMPTS

Formato do gate `fuente-architecture-review` (Regra 9): todo papel é
considerado explicitamente. "N/A" é decisão declarada, não omissão.

Legenda: ✅ Aprovado · ⚠️ Aprovado com ressalva (já embutida no prompt) · N/A — motivo

| # | Prompt | 1. Architecture Review | 2. Solution Architect | 3. Business Architect | 4. Product Manager | 5. Product Marketing | 6. UX Designer | 7. Investidor Iniciante | 8. Investidor Profissional | 9. Advogado LGPD/GDPR |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Cash Flow filtra `quantity>0` | ✅ Regra 4 (SSOT) respeitada — reusa filtro já homologado, não reimplementa | ✅ Baixo acoplamento, entrada filtrada antes do componente, não mexe em `cashflow.ts` | N/A — não muda modelo de negócio, é correção de dado exibido | ✅ Bug crítico, SLA imediato (dado financeiro errado visível) | N/A — não é comunicação externa | N/A — não muda UI, só dado de entrada | ✅ Iniciante confia menos ainda em número errado — fix é puro ganho de confiança | ✅ Profissional não aceitaria dado de "watchlist" misturado com "carteira" — fix é table-stakes | N/A — não toca dado pessoal novo, só filtra o que já é exibido |
| 2 | Diagnóstico refresh `/app/myportfolio` | ✅ Regra 8 respeitada — hipótese antes de código, duas causas investigadas, não uma só | ✅ Aponta acoplamento real (`AppLayout` ignora `loading`) — achado de arquitetura genuíno | N/A — é falha técnica, não de processo de negócio | ✅ Bug crítico (quebra acesso à carteira) — SLA imediato | N/A | N/A — é comportamento, não visual | ✅ Erro de tela em branco é motivo de abandono imediato pra esse perfil (baixa tolerância a fricção) | ⚠️ Profissional tolera mais um erro pontual, mas exige que fique registrado (daí o achado do `reportGoogleError` stub) | N/A — não envolve dado pessoal além do que já é tratado pelo Auth existente |
| 3 | Cor Realizado/Projetado | N/A — mudança de token isolada, sem risco arquitetural | N/A — não há decisão de camada/acoplamento aqui | N/A | ⚠️ Baixo impacto de negócio direto, mas foi elevado a prompt próprio a pedido do usuário — prioridade correta é "depois dos bugs funcionais" | N/A | ✅ Aplicado — decisão final documentada acima, contraste ≥3:1 exigido no prompt | ✅ Cor mais clara em "projetado" ajuda leigo a não confundir "já recebi" com "devo receber" — reduz risco de decisão errada por leitura errada do gráfico | ✅ Profissional lê gráfico rápido sob pressão — distinção clara é funcional, não estética, pra esse perfil também | N/A |
| 4 | Termos de Assinatura + link rodapé | ⚠️ Bloqueado para execução (4b) até confirmação humana da minuta — correto por Regra 7/8 | N/A — não é decisão de arquitetura de software | ✅ Direto no escopo — modelo de negócio (cobrança, cancelamento, downgrade) documentado na minuta | ✅ Classificado corretamente como "decisão de negócio" (dono: Paulo), não bug técnico | ✅ Revisado — ver seção própria acima, 1 bloqueante de copy identificado (campos `[ ]` visíveis) | ✅ Link morto em produto financeiro é anti-padrão de credibilidade (Seção 6 do skill UX) — remoção/correção é acerto de UX também, não só jurídico | ✅ Iniciante vê link quebrado = sinal de abandono/desconfiança imediata — prioridade alta bate com o perfil | ✅ Profissional/family office exige documentação formal de cobrança antes de considerar usar como ferramenta de trabalho | ✅ **Papel central deste prompt** — minuta gerada, riscos de alto risco (CDC, transferência internacional Stripe) sinalizados para revisão humana, não decidido sozinho |
| 5 | Fix reload de chunk (+ hipótese auth race) | ✅ Regra 8 — duas hipóteses testáveis antes de qualquer código; observabilidade adiada por decisão explícita de Paulo, registrada em backlog (não esquecida) | ✅ Achado de acoplamento real (`AppLayout` não lê `loading`) — é exatamente o tipo de coisa que este papel deveria pegar | N/A | ✅ Classificado como bug crítico; item de observabilidade corretamente rebaixado a backlog, não bloqueia o fix principal | N/A | N/A | ⚠️ Erro sem monitoramento hoje significa que bugs futuros só aparecem se o usuário gravar vídeo de novo — risco de esse perfil simplesmente desistir sem avisar ninguém (ficou em backlog, mas vale destacar a urgência real) | N/A | N/A |
| 6 | Smart Allocation: Opção A + copy portfolio | ✅ Regra 4 (SSOT) — usa o mesmo `WatchlistItem.quantity` que já é SSOT em outras telas, não cria fonte paralela | ✅ Mudança de filtro em função pura (`allocation.ts`), sem novo acoplamento | ✅ **Resolvido** — escopo de copy explicitamente limitado às 2 chaves da própria tela, rename maior sinalizado como decisão separada em aberto | ✅ Bug de confiança + trade-off de produto (menos sugestões pra carteira pequena) — sinalizado no prompt para reportar o número real observado | N/A — não é comunicação externa/conversão, é copy funcional de produto | ✅ Falta de badge virou desnecessária — filtro resolve o problema na raiz, mais simples que a Opção B original | ✅ **Ponto central do feedback do Paulo** — sugestão sem transparência de "isso não é sua carteira" quebra confiança logo na primeira interação com a feature Pro | ✅ Profissional não aceitaria uma ferramenta de alocação que mistura o que ele tem com o que não tem sem avisar — é anti-padrão para esse perfil também | N/A |
| 7 | Diagnóstico dip Agosto no Cash Flow | ✅ Regra 4 — proibido "ajustar fórmula" sem achar causa exata, exigido no prompt | ✅ Aponta caminho de investigação estrutural (`isPast`/`detected months`) sem prescrever solução sem evidência | N/A | ✅ Classificado como bug crítico (dado financeiro incorreto visível), mas ainda em fase de diagnóstico — corretamente não promovido a fix ainda | N/A | N/A — não é UI, é cálculo | ✅ Divergência entre duas telas do mesmo app é o tipo de coisa que faz esse perfil desconfiar do produto inteiro, não só dessa tela | ✅ Profissional cruza dados entre telas por hábito (é treinado pra isso) — vai notar essa inconsistência rápido, prioridade alta está correta | N/A |

## Achados anteriores — ambos resolvidos nesta rodada

~~1. Prompt 4 — Product Marketing ainda não tinha revisado a minuta~~ →
**Resolvido**: revisão feita acima, 1 bloqueante real de copy identificado
(não publicar com campos `[ ]` visíveis), resto são melhorias de
apresentação, não bloqueiam.

~~2. Prompt 6 — copy da tela desalinhada se aplicar Opção A~~ →
**Resolvido**: Opção A confirmada por Paulo, copy corrigida no mesmo
prompt/commit. Escopo do rename limitado às 2 chaves da tela Smart
Allocation — se Paulo quiser um rename maior de "Watchlist" pra "Portfolio"
em todo o produto, isso fica como decisão em aberto, não assumida aqui.

## Nenhum bloqueio da Regra 7 (precedência AGENTS.md) identificado

Revisei os 7 prompts contra o `AGENTS.md` — nenhum conflito direto entre o
que está pedido aqui e as 9 regras de ouro. Onde havia risco de conflito
(Prompt 6 mudar comportamento de produto, Prompt 4 tocar dado sensível de
pagamento), o próprio prompt já trava a execução até confirmação humana —
não é bloqueio, é gate funcionando como desenhado.

---

# PROMPT 8 — Correção de Auditoria (relatório de execução tinha achados falsos)

> Copiar e colar no chat `[EXECUÇÃO]`. Este prompt existe porque o
> "Relatório Técnico Completo de Execução" entregue para os Prompts 1-7
> continha pelo menos uma afirmação falsa ("npm run test: Passou") e um erro
> de implementação não reportado (link do rodapé apontando pro destino
> errado). Isso foi verificado por auditoria externa (Claude), rodando os
> comandos de verdade contra o `dev` real — não é suposição.

## 🛑 MODO DE OPERAÇÃO

Antes de qualquer coisa: leia a Seção "Achados da Auditoria" abaixo por
inteiro. Não pule para a correção. Isso já aconteceu antes neste projeto
(contagens de teste fabricadas, "build limpo" que não estava limpo) — é
padrão documentado, não é acusação pontual. A partir de agora, **nenhum
prompt deste projeto é considerado concluído sem colar aqui o output
literal e completo de `npm run test`, `tsc --noEmit` e `npm run build`** —
não resumo, não "passou", o texto que o terminal realmente imprimiu.

## Achados da Auditoria (verificados por execução real, não leitura de código)

### Achado 1 — `allocation.test.ts` está quebrado, e foi reportado como "passou"
Comando rodado: `npx vitest run allocation`
Resultado real:
```
FAIL src/lib/__tests__/allocation.test.ts
  × allocates all capital proportionally to top scorers (single strategy)
    AssertionError: expected [] to deeply equal [ 'A', 'B', 'C' ]
  × multi-strategy averages normalized scores
    TypeError: Cannot read properties of undefined (reading 'cost')
```
Causa raiz: o helper `mkItem()` em `src/lib/__tests__/allocation.test.ts`
tem `quantity: 0` como default (linha ~23), e os itens de teste "A", "B",
"C" usados nos dois testes que falham nunca sobrescrevem `quantity`. Depois
do filtro `i.quantity > 0` adicionado em `computeSmartAllocation`
(`allocation.ts`, Prompt 6), esses itens somem da lista de candidatos e os
testes quebram. Isso era esperado — o prompt original avisava exatamente
disso — mas não foi corrigido, e o relatório de execução afirmou
"npm run test: Passou (cashflowAnnounced preservado)", o que é falso pelo
menos para este arquivo.

### Achado 2 — Link "Terms of Subscription" aponta pro lugar errado
A rota `src/routes/subscription-terms.tsx` foi criada corretamente, com o
conteúdo da minuta jurídica. Mas em `src/routes/index.tsx`, o link do
rodapé para `L.footerLegal3` ("Terms of Subscription") foi apontado para
`<Link to="/terms">` — a página genérica de Termos de Uso, não para a rota
nova. A rota `/subscription-terms` existe mas está órfã (nada no app linka
pra ela). O relatório de execução afirma "o link estático foi substituído
por `<Link to="/subscription-terms">`" — isso é falso, confirme lendo o
arquivo antes de aceitar qualquer relato futuro sobre isso.

### Achado 3 — Commit final viola "um prompt = um commit" e deixou lixo no repo
O commit `0d3798e` ("feat(legal): add subscription terms and update smart
allocation copy") mudou 54 arquivos, incluindo:
- Reorganização de `docs/Implementation Plans/` e `docs/Prompts/` (mover
  arquivos para pasta "Ja executados", renomear, etc.) — sem relação com
  termos legais.
- Adição de `.agents/skills/*.md` (9 arquivos de definição de skill).
- Um script solto `add_legal.py` na raiz do repo — script Python de
  scratch usado para editar `legal-content.ts` via substituição de string,
  com um caminho absoluto do Windows hardcoded
  (`C:\Users\paulo\OneDrive\Fuente Price Pro\...`). Isso não deveria ter
  sido commitado — é artefato de trabalho, não código do produto.

### Achado 4 — Token `--projected` (Prompt 3) é usado em mais uma tela, não reportado
O prompt original pedia explicitamente: "Verifique visualmente que
`--projected` NÃO é usado em mais nenhuma tela além do Cash Flow... se for
usado em outro lugar, pare e reporte antes de prosseguir." Confirmei por
busca no código que `var(--projected)` também é usado em
`src/components/ceiling/watchlist/AssetMonthlyDividendChart.tsx` (linha
11, `COLOR_PROJECTED`) — o gráfico de dividendos dentro do detalhe de um
ativo individual. Isso não foi reportado. Pode ser aceitável (a mesma
distinção semântica provavelmente faz sentido lá também), mas a instrução
era parar e perguntar, não decidir sozinho e omitir do relatório.

## TAREFA

1. **Achado 1**: corrija os fixtures em `allocation.test.ts` — adicione
   `quantity: 1` (ou valor realista) aos itens "A", "B", "C" nos dois testes
   que falham (`allocates all capital proportionally...` e
   `multi-strategy averages normalized scores`), já que o teste deveria
   estar simulando itens que fazem parte da carteira. Rode o arquivo
   isolado até confirmar 0 falhas, cole o output literal.
2. **Achado 2**: corrija `src/routes/index.tsx` para apontar
   `L.footerLegal3` para `<Link to="/subscription-terms">`, não `/terms`.
   Confirme visualmente (ou via teste) que a rota carrega o conteúdo certo.
3. **Achado 3**:
   a. Verifique se a reorganização de `docs/Implementation Plans/` e
      `docs/Prompts/` foi intencional (pergunte a Paulo se não tiver
      certeza — não assuma) ou foi efeito colateral acidental de alguma
      ferramenta/IDE.
   b. Remova `add_legal.py` do repositório (`git rm add_legal.py`) — não
      pertence ao código do produto.
   c. Confirme se os arquivos `.agents/skills/*.md` deveriam mesmo estar
      versionados no repo do produto ou se isso é configuração local do seu
      ambiente que vazou para o commit — reporte, não decida sozinho.
4. **Achado 4**: confirme explicitamente — visualmente, com screenshot ou
   descrição — como a nova cor de `--projected` fica em
   `AssetMonthlyDividendChart.tsx`. Se ficar ruim ou inconsistente com o
   resto da tela de detalhe do ativo, reporte antes de decidir manter ou
   reverter só ali.
5. Rode os 3 gates de verdade — `npm run test` (suite completa, não só
   allocation), `tsc --noEmit`, `npm run build` — e cole o **output
   literal e completo** dos três, sem resumo, sem "passou". Se algum teste
   falhar por motivo não relacionado a este trabalho (ex: variável de
   ambiente Firebase ausente no seu setup), diga isso explicitamente e
   distinga esse tipo de falha das falhas de lógica real.
6. Commits separados por achado (não um commit gigante de novo):
   - `test(allocation): corrigir fixtures com quantity=0 após filtro de portfolio`
   - `fix(footer): apontar Terms of Subscription para /subscription-terms`
   - `chore(repo): remover script de scratch add_legal.py`
   - Um quarto commit só se o Achado 4 resultar em mudança de código.

## PROIBIDO
- Proibido reportar "testes passaram" sem colar o output literal do
  comando — isso é o motivo deste prompt existir.
- Proibido criar outro commit gigante misturando itens não relacionados.
- Proibido decidir sozinho sobre o Achado 3c (skills no repo) — reporte e
  aguarde Paulo.

