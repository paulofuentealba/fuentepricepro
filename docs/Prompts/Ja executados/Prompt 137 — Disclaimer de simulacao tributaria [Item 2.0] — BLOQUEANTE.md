Prompt 137 — Disclaimer de simulacao tributaria [Item 2.0] — BLOQUEANTE

CONTEXTO
Abre a Fase 2 (Realidade Fiscal) — o diferencial mais defensável do produto
(nenhuma ferramenta do mercado calcula BR+US no mesmo ledger), e também o
mais exposto: aqui a distância entre "ferramenta de cálculo" e "consultoria
tributária" é a mais fina de todo o roadmap. Por isso este item é
BLOQUEANTE — nenhuma tela fiscal (módulo, DARF, comparação bruto×líquido)
pode ir a produção sem isto pronto.

Base factual: reconferido agora (não só a Auditoria do Prompt 129) —
busca ampla em todo o src/ por lógica fiscal encontrou 17 arquivos, 70
ocorrências, mas TODAS decorrem de netAfterTax/dividendTaxRate em
calculations.ts (SSOT confirmado, sem números mágicos de alíquota
espalhados). A isenção de R$ 20 mil / ganho de capital sobre venda de
ações CONTINUA AUSENTE — zero ocorrências, greenfield puro.

DECISÃO JÁ TOMADA: RegulatoryDisclaimerBanner e o sistema de variantes
(Prompt 132) JÁ EXISTEM — variant='tax' já foi criada e traduzida nos 3
idiomas, mas ainda não tem um lugar de uso real além do texto genérico.
Este prompt não cria disclaimer novo — GARANTE que toda superfície fiscal
futura (Prompts 138+) nasce com o disclaimer certo desde o primeiro commit,
em vez de ser adicionado depois como reboco.

TAREFA

1. Criar um componente fino, específico para telas fiscais:
   src/components/shared/TaxSimulationDisclaimer.tsx
   Não é um disclaimer novo — é um wrapper de
   <RegulatoryDisclaimerBanner variant="tax" forceShow /> com um segundo
   nível de aviso ESPECÍFICO desta fase, mais forte que o texto genérico
   'tax' do Prompt 132: precisa deixar claro que (a) é ESTIMATIVA, não
   apuração oficial, (b) regras tributárias mudam e têm exceções não
   cobertas pelo cálculo, (c) o usuário deve confirmar com contador antes
   de qualquer decisão fiscal real (venda, DARF, declaração).
   Investigar antes se o texto 'tax' do Prompt 132
   (t.regulatoryDisclaimer.tax) já cobre isso suficientemente, ou se
   precisa de uma variante mais específica — reportar antes de criar texto
   novo (Regra 1 — não duplicar disclaimer).

2. Registro de aceite ESPECÍFICO para simulação tributária, separado do
   aceite geral do disclaimer (Prompt 132, disclaimerAcceptedVersion).
   Investigar antes: faz sentido reusar o MESMO campo de aceite versionado
   do Prompt 132 (um aceite cobre calculation E tax), ou a natureza mais
   sensível de "simulação tributária" justifica um segundo campo
   (taxSimulationAcceptedVersion/At)? Trazer a pergunta com argumentos dos
   dois lados — não decidir sozinho, é decisão de produto/jurídica.

3. Preparar (sem implementar cálculo ainda) a estrutura de pastas do
   módulo fiscal, ISOLADA POR JURISDIÇÃO desde o primeiro commit:
   src/lib/tax/
     types.ts       (apenas tipos — TaxContext, TaxResult, Jurisdiction)
     br/            (pasta vazia com .gitkeep ou um index.ts placeholder)
     us/             (pasta vazia com .gitkeep ou um index.ts placeholder)
     index.ts        (vazio ou só re-exports de types.ts por enquanto)
   Isso é só andaime — a lógica de cálculo (isenção 20k, JCP, FII isento,
   30% US) entra nos próximos prompts desta fase, cada regra com seu
   próprio prompt e verificação, não tudo de uma vez.

REQUISITOS INEGOCIÁVEIS
1. TaxSimulationDisclaimer é PERSISTENTE e NÃO DISPENSÁVEL em qualquer
   tela futura desta fase — mesmo padrão de forceShow já estabelecido.
2. Texto novo (se a investigação do item 1 concluir que é necessário)
   marcado "TEXTO PENDENTE DE REVISAO JURIDICA HUMANA" — mesmo padrão do
   Prompt 132, sem exceção.
3. types.ts do módulo fiscal não pode importar nada de calculations.ts
   que não seja estritamente necessário para tipagem — o módulo fiscal
   consome resultados do SSOT de valuation (dividendo líquido já vem de
   lá), não recalcula nem reimplementa.
4. Nenhuma constante de alíquota (JCP 15%, US 30%, isenção 20k) é criada
   neste prompt — isso é dos próximos, cada uma com seu teste dedicado.
   Este prompt é fundação e proteção regulatória, não cálculo.
5. LGPD: se o item 2 concluir por um campo de aceite novo, verificar
   dataExport.ts/accountDeletion.ts pelo MESMO padrão já confirmado 3x
   (Prompts 127, 131, 132) — provavelmente não precisa de código extra,
   mas confirmar antes de assumir.

INVESTIGAR ANTES (Regra 7)
1. t.regulatoryDisclaimer.tax (Prompt 132) já é suficiente para o
   contexto de simulação, ou precisa de reforço específico desta fase?
2. Aceite único (Prompt 132) vs. aceite específico novo — trazer os dois
   lados.
3. Confirmar se dataExport.ts/accountDeletion.ts precisam de alteração
   para um eventual campo de aceite novo, seguindo o padrão já
   estabelecido.
Apresentar plano com essas respostas ANTES de codar (Regra 8).

PROIBIDO
- Implementar qualquer regra de cálculo fiscal neste prompt (isenção,
  JCP, retenção US) — isso é greenfield e vem depois, prompt a prompt
- Criar um segundo componente de disclaimer do zero — estender/envolver
  o que já existe
- Publicar texto novo sem a marcação de revisão jurídica pendente
- Misturar tipos do módulo fiscal com lógica de decisão do AskEngine
  (são camadas diferentes, mesmo que ambas leiam settings do usuário)
- git add -A

GATES OBRIGATÓRIOS (saída literal do terminal)
- npx tsc --noEmit
- npm run test
- npm run build

PAPÉIS DE GOVERNANÇA (Regra 9)
| Papel | Acionado | Justificativa |
|---|---|---|
| fuente-advogado-lgpd-gdpr | SIM | papel central — enquadramento regulatório mais sensível do roadmap |
| fuente-product-manager | SIM | bloqueante de fase inteira, decisão de aceite único vs. duplo |
| fuente-solution-architect | SIM | isolamento por jurisdição desde a fundação |
| fuente-ux-designer | SIM | disclaimer mais forte sem destruir a experiência |
| fuente-investidor-profissional | SIM | precisão da linguagem fiscal para quem já entende de imposto |
| fuente-investidor-iniciante | SIM | entender que é estimativa, não apuração oficial |
| fuente-architecture-review | SIM | gate contra vazamento de lógica fiscal para fora de src/lib/tax |
| fuente-business-architect | SIM | fundação do moat mais defensável do produto |
| fuente-product-marketing | NÃO | sem comunicação externa nesta etapa |

COMMIT
feat(tax): disclaimer de simulacao tributaria e fundacao isolada por jurisdicao [Item 2.0]

---

Envie o plano com as 3 respostas do "Investigar Antes" antes de codar.
Especialmente a decisão de aceite único vs. duplo — quero ver os dois
lados do argumento, não uma escolha já feita sem justificativa escrita.
