# Relatório de Execução — Prompt 143: Expansão de Cobertura Fiscal [Item 2.1e]

- **Prompt**: `Prompt 143 — Expansão de cobertura fiscal: FI-Infra isento, FIAGRO como FII, ETF de ações [Item 2.1e]`
- **Data de Execução**: 27/08/2026
- **Status**: **CONCLUÍDO COM SUCESSO (100% GATES APROVADOS)**

---

## 1. Resumo Executivo das Decisões e Investigações

### 1.1 Investigação 1: Distinção entre ETF de Ações e ETF de Renda Fixa
- **Diagnóstico**: O tipo canônico `AssetType` em `src/lib/domain.ts` define apenas a categoria `"ETF"`, sem subtipos como `ETF_FIXED_INCOME`.
- **Decisão Implementada**: Todos os ativos do tipo `"ETF"` em BRL são tratados pelo módulo `calculateEtfCapitalGainsTax` sob a regra dominante de **ETFs de Ações** (alíquota fixa de 15%, sem isenção de volume de R$ 20.000/mês e trilha isolada de compensação de prejuízos). A exclusão de ETFs de Renda Fixa (IN RFB 1.585/2015) permanece como **Limite Declarado** explícito no código e na UI.

### 1.2 Investigação 2: Decisão sobre Carryforward em `FII_INFRA`
- **Diagnóstico**: Sob a Lei 12.431/2011 (art. 3º), pessoas físicas têm **alíquota de 0%** no ganho de capital de FI-Infra negociado em bolsa. Prejuízos em ativos 100% isentos não geram crédito tributário compensável contra outros ativos nem contra ganhos futuros do próprio fundo (que já são 0% de imposto).
- **Decisão Implementada**: `calculateFiInfraCapitalGainsTax` sempre retorna `taxDue = 0`, `lossCarryforwardUsed = 0` e `lossCarryforwardRemaining = 0` em todos os fluxos.

---

## 2. Pareceres das 8 Skills (Governança Multi-Skill — Regra 9 do AGENTS.md)

1. **`fuente-investidor-profissional`**:
   > *"Concordo integralmente com a leitura das 3 regras. A equiparação de FIAGRO a FII (20% flat) e a isenção de FI-Infra (0% pela Lei 12.431/11) refletem o padrão pacificado de mercado. A segregação do carryforward de ETF em relação a ações comuns é mandatória, pois a DIRPF exige apuração em fichas distintas e a RFB veda a compensação cruzada entre ETFs e mercado à vista de ações."*
2. **`fuente-advogado-lgpd-gdpr`**:
   > *"Aprovo a elevação de confiança para FII_INFRA e FIAGRO com base na Lei 12.431/2011, Lei 14.130/2021 e regulamentos CVM auditados. A marcação 'pendente de revisão jurídica' foi removida dessas duas classes e substituída pela fundamentação legal consolidada. A ressalva de ETFs foi reescrita para focar exclusivamente na não cobertura de ETFs de Renda Fixa (IN 1.585/2015)."*
3. **`fuente-solution-architect`**:
   > *"Valido a decisão arquitetural: `calculateEtfCapitalGainsTax` foi criada como a terceira função pura com trilha isolada de carryforward; `FIAGRO` reutilizou `calculateFiiCapitalGainsTax` via extensão do filtro (`resolvedType === 'FII' || resolvedType === 'FIAGRO'`); e `calculateFiInfraCapitalGainsTax` foi criada como a quarta função pura com alíquota zero e sem efeitos de carryforward."*
4. **`fuente-architecture-review`**:
   > *"Gate de duplicação validado: as funções mantêm assinaturas puras e reusam integralmente `getEventAssetType` de `../utils` e a constante `BR_STOCK_CAPITAL_GAINS_RATE = 0.15` de `monthlyExemption.ts`. A estrutura de acumulação mensal é idiomática e isolada por módulo."*
5. **`fuente-investidor-iniciante`**:
   > *"A redação atualizada dos Limites Declarados ficou muito mais clara: o investidor compreende de imediato que ações têm isenção de R$ 20k, FII/FIAGRO pagam 20%, FI-Infra é 100% isento, e ETFs pagam 15% sem isenção de volume, exceto se forem de renda fixa."*
6. **`fuente-product-manager`**:
   > *"Confirmado após investigação: o módulo de rendimentos (`realizedIncome.ts` e `simulateBrDividendTax` do Prompt 138) já aplica alíquota zero (isenção total) para distribuições de `FII`, `FIAGRO` e `FII_INFRA`. Portanto, não houve necessidade de reabrir o Prompt 138."*
7. **`fuente-ux-designer`**:
   > *"A tabela de ETFs só é renderizada quando `etfMonthly.length > 0` (renderização condicional, idêntica a ações e FIIs). FI-Infra não requer tabela de DARF (já que o imposto é sempre zero), sendo refletido nos cards de totalizadores."*
8. **`fuente-business-architect`**:
   > *"Concordo. A cobertura precisa de ganho de capital para FI-Infra, FIAGRO e ETF é um diferencial competitivo único que reforça o fosso defensivo (moat) do Fuente Price Pro."*
9. **`fuente-product-marketing`**:
   > *Não acionado nesta etapa técnica interna.*

---

## 3. Textos Jurídicos Aprovados e Integrados

### 3.1 Comentários no Código
- **`src/lib/tax/br/fiiCapitalGains.ts`**: Cita Lei 8.668/1993 (FIIs) e Lei 14.130/2021 (FIAGRO).
- **`src/lib/tax/br/fiInfraCapitalGains.ts`**: Cita art. 3º da Lei 12.431/2011 (alíquota 0% para pessoa física em ganho de capital e rendimentos).
- **`src/lib/tax/br/etfCapitalGains.ts`**: Cita Lei 13.043/2014 e art. 59 da IN RFB 1.585/2015 (alíquota 15% sem isenção de volume).

### 3.2 Limites Declarados nos Dicionários i18n (`dict.ptBR.ts`, `dict.en.ts`, `dict.es.ts`)
- **Português**: `"ETFs de Renda Fixa: seguem tabela regressiva de renda fixa (IN RFB 1.585/2015), não calculados aqui. Esta tela apura apenas ETFs de renda variável (ações a 15% flat sem isenção de volume)."`
- **Inglês**: `"Fixed Income ETFs: follow regressive fixed income tax table (IN RFB 1.585/2015), not calculated here. This screen calculates only equity ETFs (15% flat without sales volume exemption)."`
- **Espanhol**: `"ETFs de Renta Fija: siguen la tabla regresiva de renta fija (IN RFB 1.585/2015), no calculados aquí. Esta pantalla calcula solo ETFs de renta variable (15% flat sin exención de volumen)."`

---

## 4. Arquivos Implementados / Modificados

1. **`src/lib/tax/types.ts`**: Adicionados `MonthlyFiInfraCapitalGainsResult` e `MonthlyEtfCapitalGainsResult`.
2. **`src/lib/tax/br/fiiCapitalGains.ts`**: Suporte unificado a `FII` e `FIAGRO` na mesma trilha (20% flat).
3. **`src/lib/tax/br/fiInfraCapitalGains.ts`** *(Novo)*: Função pura `calculateFiInfraCapitalGainsTax` (0% tax, 0 carryforward).
4. **`src/lib/tax/br/etfCapitalGains.ts`** *(Novo)*: Função pura `calculateEtfCapitalGainsTax` (15% flat, trilha segregada).
5. **`src/lib/tax/br/index.ts`**: Exportação dos novos módulos.
6. **`src/components/tax/TaxRealityScreen.tsx`**: Renderização condicional da tabela mensal de ETFs e métricas agregadas.
7. **`src/lib/i18n/dict.ptBR.ts`**, **`dict.en.ts`**, **`dict.es.ts`**: Atualização sincronizada de chaves e Limites Declarados.
8. **`src/lib/tax/br/__tests__/fiInfraCapitalGains.test.ts`** *(Novo)*: 6 testes unitários.
9. **`src/lib/tax/br/__tests__/etfCapitalGains.test.ts`** *(Novo)*: 6 testes unitários com teste cruzado de isolamento.
10. **`src/lib/tax/br/__tests__/fiiCapitalGains.test.ts`**: 12 testes unitários, incluindo compensação cruzada FII/FIAGRO.
11. **`src/components/tax/__tests__/TaxRealityScreen.test.tsx`**: Testes de UI atualizados.

---

## 5. Resultados dos 3 Gates de Verificação Obrigatórios

### Gate 1: Typecheck
```bash
npx tsc --noEmit
# Saída: Exit code 0 (0 erros de tipagem)
```

### Gate 2: Testes Unitários (Vitest)
```bash
npm run test
# Saída:
# Test Files  137 passed | 1 skipped (138)
#      Tests  894 passed | 12 skipped (906)
#   Duration  50.75s
# Exit code 0 (100% de sucesso)
```

### Gate 3: Build de Produção
```bash
npm run build
# Saída:
# ✓ built in 1.43s
# Exit code 0 (Build de produção gerado com sucesso)
```
