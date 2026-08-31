Prompt 132 — Estender disclaimer regulatorio com variantes e aceite versionado [Item 0.4] — BLOQUEANTE

CONTEXTO
BLOQUEANTE: nenhuma tela de sugestão de decisão (AskEngine, Fase 1+) pode ir
a produção sem isto pronto.
Base factual: docs/design/v6/AUDITORIA-REUSO.md, seção 2 — CONFIRMADA por
verificação direta: RegulatoryDisclaimerBanner tem hoje ZERO props, é
renderizado globalmente em src/routes/app.tsx (e também referenciado em
BuyAndHoldChecklistCard.tsx — achado extra da auditoria, verificar esse
segundo uso também). Texto atual já existe em
t.regulatoryDisclaimer.message e é o "Item 74 do SSOT", eco compacto da
cláusula 3 dos Termos de Uso — essa relação com /terms NÃO pode ser
duplicada nem reescrita, só ecoada.

DECISÃO JÁ TOMADA: RegulatoryDisclaimerBanner JÁ EXISTE. Estender, não
recriar (Regra 1).

TAREFA

1. Estender o componente com uma prop de variante:
   variant?: 'calculation' | 'tax' | 'full'  (default: 'calculation', que
   preserva o comportamento atual/texto atual como está hoje)

2. Textos novos (TEXTO PENDENTE DE REVISÃO JURÍDICA HUMANA — marcar
   explicitamente no PR, não publicar como definitivo):

   calculation (pode reusar t.regulatoryDisclaimer.message como já está,
   ajustando só se necessário para caber no padrão das outras variantes):
   "Sugestão de cálculo, não recomendação de investimento. Calculada
   exclusivamente a partir dos critérios e metas que você configurou. Não
   constitui consultoria de valores mobiliários (CVM). A decisão de seguir
   ou não é exclusivamente sua."

   tax:
   "Estimativa, não consultoria tributária. Cálculo a partir dos dados que
   você registrou. Regras tributárias têm exceções e mudam. Confirme com
   seu contador antes de apurar."

   full (versão longa, para onboarding e /terms):
   Combinar as duas acima + frase de responsabilidade do usuário. Manter
   coerência com a cláusula 3 de /terms já existente — não reescrever
   aquela cláusula, apenas garantir que a versão 'full' aqui não a
   contradiga.

3. A variante 'calculation' continua PERSISTENTE e NÃO DISPENSÁVEL no
   rodapé de toda tela do motor de decisão (comportamento atual mantido,
   já é assim hoje via EXCLUDED_APP_ROUTES).

4. NOVO: registro de aceite versionado.
   - Ao usuário concluir o onboarding (passo 4, conforme protótipo v6) ou
     aceitar os termos pela primeira vez, gravar em Firestore
     users/{userId}: disclaimerAcceptedVersion (string) e
     disclaimerAcceptedAt (timestamp).
   - Versão do texto: definir uma constante DISCLAIMER_VERSION (ex.: "v1").
     Mudança de texto no futuro exige incrementar a constante — usuários
     com disclaimerAcceptedVersion desatualizado precisam ver o aceite de
     novo (mecanismo de detecção, não necessariamente o fluxo de UI
     completo nesta etapa — reportar no plano o que fica para depois).

REQUISITOS
1. i18n nos 3 idiomas. PT-BR é normativo; EN e ES são traduções
   informativas — sinalizar isso no texto da variante 'full' ou em
   comentário no dicionário.
2. Versionamento explícito do texto (DISCLAIMER_VERSION), não implícito.
3. LGPD: disclaimerAcceptedVersion/At são dado pessoal — verificar se
   dataExport.ts/accountDeletion.ts já cobrem isso automaticamente (mesmo
   padrão dos Prompts 127 e 131: se é campo direto no documento raiz do
   usuário, spread e delete do doc raiz já resolvem — CONFIRME antes de
   escrever código extra desnecessário, não assuma).
4. Reusar o componente existente. Se a extensão exigir mudar a assinatura
   de props, confirmar que os usos atuais (app.tsx e
   BuyAndHoldChecklistCard.tsx) continuam funcionando sem quebrar —
   variant com default preserva isso.

INVESTIGAR ANTES (Regra 7)
1. Confirmar o uso em BuyAndHoldChecklistCard.tsx — é o mesmo padrão de
   app.tsx (renderização condicional por rota) ou é usado de forma
   diferente (ex.: sempre visível dentro de um card específico)? Isso
   muda se ele deve receber variant='calculation' explícito ou herdar
   default.
2. Confirmar se dataExport.ts/accountDeletion.ts precisam mesmo de
   alteração para os dois campos novos, ou se o padrão de spread/delete
   do documento raiz já resolve (Prompts 127 e 131 confirmaram esse
   padrão duas vezes — verificar se ainda vale aqui antes de escrever
   código).
3. Confirmar onde fica o texto da cláusula 3 de /terms hoje, para garantir
   que a variante 'full' não o contradiga nem duplique literalmente.
Apresentar o plano com essas respostas ANTES de codar (Regra 8).

PROIBIDO
- Criar componente novo de disclaimer
- Publicar qualquer texto novo como definitivo sem revisão de advogado
  humano — marcar no PR: "TEXTO PENDENTE DE REVISAO JURIDICA HUMANA"
- Tornar a variante 'calculation' dispensável ou escondê-la atrás de clique
- Usar linguagem que sugira recomendação em qualquer variante
- Reescrever ou duplicar a cláusula 3 de /terms — só ecoar
- git add -A

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | papel central — enquadramento regulatório + dado pessoal do aceite |
| fuente-product-manager | SIM | bloqueante de roadmap |
| fuente-ux-designer | SIM | persistente sem destruir a experiência |
| fuente-product-marketing | SIM | linguagem afeta posicionamento |
| fuente-investidor-iniciante | SIM | precisa entender o que a ferramenta NÃO é |
| fuente-architecture-review | SIM | gate do diff, garante extensão e não recriação |
| fuente-solution-architect | NÃO | extensão simples de componente e schema, sem decisão estrutural nova |
| fuente-investidor-profissional | NÃO | já conhece o enquadramento |
| fuente-business-architect | NÃO | não altera capacidades |

COMMIT
feat(legal): estende disclaimer com variantes e aceite versionado [Item 0.4]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar. Em
especial quero ver a confirmação sobre dataExport.ts/accountDeletion.ts —
pelo padrão dos dois prompts anteriores, aposto que não precisa de código
lá, mas quero a confirmação explícita, não a suposição.
