Prompt 131 — Metas e yield-alvo por classe [Item 1.1]

CONTEXTO
Requisito REGULATÓRIO. O motor só pode calcular sobre critérios definidos
pelo usuário. Sem isso, nenhuma sugestão pode ser exibida.
Referência visual: docs/design/v6/prototipo-v6.html, onboarding passo 3 e 4,
e perfil aba "Metas e critérios".
Base factual: docs/design/v6/AUDITORIA-REUSO.md, seção 1 — CONFIRMADA por
verificação direta: AssetType tem 8 classes (STOCK_BR, STOCK_US, FII, REIT,
ETF, FII_INFRA, FIAGRO, FIXED_INCOME), PROFILE_BASE_ALLOCATION e
STRATEGY_BIAS_MULTIPLIERS existem e batem exatamente com o código real.

DECISÃO JÁ TOMADA: NÃO criar do zero. TargetAllocationPanel.tsx e
suggestedAllocation.ts já existem e devem ser ESTENDIDOS (Regra 1).

TAREFA

1. Metas por classe (Ações BR, FIIs, Exterior, Renda fixa) — já existe,
   confirmar e reusar. Validação de soma = 100% já implementada via
   TargetAllocationPanel (indicador verde/vermelho) — reusar o mesmo padrão
   visual e a mesma lógica de validação.

2. NOVO: yield-alvo POR CLASSE, seguindo a hierarquia de resolução já
   proposta na auditoria — implementar exatamente esta ordem:
   - 1º Nível (Específico do Ativo): item.targetYield manual, se o usuário
     customizou no ativo individual. Prevalece sobre tudo.
   - 2º Nível (Classe do Ativo): classTargetYields[item.type], se
     configurado (ex.: FIIs = 8,5%, Ações BR = 6,0%, Exterior = 4,0%).
   - 3º Nível (Global / Fallback): settings.targetYield global (default
     atual do sistema, hoje 6%).
   Implementar como função pura resolveTargetYield(item, settings) que
   aplica esta cascata e retorna o yield efetivo + de qual nível veio
   (para exibir na UI de onde o número está vindo, se necessário depois).

3. Schema: adicionar classTargetYields?: Partial<Record<AssetType, number>>
   em UserSettings / useUserSettings.ts, seguindo o mesmo padrão de
   persistência já usado por smartAllocationTargets (Firestore
   users/{userId}.settings para autenticados, localStorage
   ceilingPricePro.settings.v1 para guest mode — CONFIRMAR que é
   exatamente essa a estrutura antes de estender).

4. Critérios de exclusão (toggles), novos, sem equivalente hoje:
   - não sugerir ativos acima do preço-teto de consenso
   - não sugerir ativos com sinal de armadilha de yield
   - limite de concentração máxima por classe (verificar se
     maxConcentrationPerAsset em SmartAllocation.tsx já cobre isso por
     ativo — se sim, adicionar a versão por CLASSE como campo novo,
     sem duplicar a lógica por ativo existente)

REQUISITOS INEGOCIÁVEIS
1. Estado "não configurado" é EXPLÍCITO e distinto de "configurado com
   zeros". classTargetYields ausente ou vazio não deve ser tratado como
   "todas as classes com yield-alvo zero".
2. Nenhum default aplicado sem confirmação do usuário. O yield de mercado
   por classe (6% ações BR, 8% FIIs, 4% exterior, conforme já usado nas
   telas do protótipo) é exibido como REFERÊNCIA ao lado do campo, nunca
   pré-preenchido e salvo sem ação do usuário.
3. resolveTargetYield deve ser função pura, testável isoladamente, sem
   depender de contexto React.
4. calculations.ts continua sendo o único lugar que roda a fórmula de
   valuation (Regra 4/SSOT). resolveTargetYield só decide QUAL yield entra
   como parâmetro targetYield na chamada de getAssetValuation — não
   recalcula nada.
5. Validação: soma das metas de alocação = 100%, reusando a validação
   existente do TargetAllocationPanel.
6. Zero hardcode, 3 idiomas.
7. Mobile-first.
8. LGPD: metas e critérios são perfil de investimento = dado pessoal.
   Verificar dataExport.ts e accountDeletion.ts — se já cobrem
   settings.smartAllocationTargets, confirmar que classTargetYields (campo
   novo no mesmo objeto) é automaticamente incluído (mesmo raciocínio do
   Prompt 127 com thesisSnapshot: se o export já faz spread do objeto
   settings sem whitelist, o campo novo pode não precisar de código
   adicional — VERIFICAR antes de escrever código extra desnecessário).

INVESTIGAR ANTES (Regra 7)
1. Confirmar a estrutura exata de useUserSettings.ts hoje (schema completo
   de UserSettings, não só o que a auditoria já reportou).
2. Confirmar como calculations.ts recebe targetYield hoje — parâmetro direto
   ou lido de outro lugar — para saber exatamente onde resolveTargetYield
   se encaixa antes da chamada.
3. Confirmar se dataExport.ts/accountDeletion.ts já cobrem o objeto
   settings inteiro sem whitelist de campos (mesmo padrão encontrado no
   Prompt 127), o que dispensaria alteração de código nesses dois arquivos.
Apresentar plano ANTES de codar (Regra 8).

TESTES OBRIGATÓRIOS
- resolveTargetYield: nível 1 (item) prevalece sobre nível 2 (classe)
- resolveTargetYield: nível 2 (classe) prevalece sobre nível 3 (global)
- resolveTargetYield: sem nenhum configurado, cai no default global atual
- validação de soma 100% continua funcionando (reuso do teste existente,
  se houver, mais casos novos com classTargetYields presente)
- classTargetYields ausente é tratado como "não configurado", não como zero
- export de dados inclui classTargetYields quando presente
- exclusão de conta remove classTargetYields junto com o resto de settings

PROIBIDO
- Criar componente novo de metas se TargetAllocationPanel serve
- Assumir default de yield sem confirmação do usuário
- Recalcular valuation fora de calculations.ts
- Alterar dataExport.ts/accountDeletion.ts sem antes confirmar se já não
  cobrem o campo automaticamente
- git add -A

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | base do enquadramento regulatório + dado pessoal |
| fuente-solution-architect | SIM | hierarquia de resolução de yield é contrato novo |
| fuente-investidor-profissional | SIM | yield por classe é exigência de rigor |
| fuente-investidor-iniciante | SIM | iniciante não sabe definir yield-alvo sozinho |
| fuente-ux-designer | SIM | formulário é ponto de atrito crítico |
| fuente-architecture-review | SIM | gate contra duplicação e violação de SSOT |
| fuente-product-manager | SIM | escopo mínimo viável |
| fuente-business-architect | NÃO | habilita capacidade já modelada |
| fuente-product-marketing | NÃO | sem comunicação externa |

COMMIT
feat(settings): metas e yield-alvo configuraveis por classe com hierarquia de resolucao [Item 1.1]

---

Envie o plano com as respostas do "Investigar Antes" antes de codar. Em
especial, quero ver a confirmação de se dataExport.ts/accountDeletion.ts
precisam mesmo de alteração ou se já cobrem o campo novo automaticamente —
não quero código defensivo desnecessário se o padrão do Prompt 127 já
resolve isso de graça.
