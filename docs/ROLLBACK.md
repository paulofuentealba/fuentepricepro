# Procedimento Operacional de Rollback — Fuente Price Pro

Este documento define o protocolo de contingência e reversão para a arquitetura BFF e normalização de valuation (Prompts 115 a 125 / ADR-001 / ADR-002).

---

## 1. Reversão Instantânea em Produção (Sem Re-deploy)

Se qualquer instabilidade, inconsistência de dados ou erro de rede for detectado em produção ou homologação:

1. Acesse o **Firebase Console** do projeto.
2. Navegue até **Firestore Database** → Coleção `config` → Documento `featureGates`.
3. Altere o campo `USE_BFF_PORTFOLIO_VALUATION` para `false`:
   ```json
   {
     "USE_BFF_PORTFOLIO_VALUATION": false
   }
   ```
4. **Resultado**: Todos os clientes web instantaneamente voltam a processar os cálculos via pipeline legada em runtime (Single Page App), sem downtime e sem requerer deploy de código.

---

## 2. Rollback a Nível de Código (Git)

Caso seja necessário reverter completamente o código para o estado anterior à Fase 4:

```bash
# 1. Identificar o commit da Fase 4
git log -n 5 --oneline

# 2. Executar o revert atômico do commit do Prompt 125
git revert HEAD --no-edit

# 3. Validar os 3 Gates de Integridade
npx tsc --noEmit
npm run test
npm run build

# 4. Publicar na branch dev/main
git push origin dev
```

---

## 3. Garantias de Preservação e SSOT

- **SSOT Intacto**: O arquivo `src/lib/calculations.ts` permanece como a Única Fonte da Verdade (Single Source of Truth) para todas as fórmulas matemáticas (Bazin, Graham, Gordon, Shareholder Yield, Bogle, ERP).
- **Sem Quebra de Módulos Dependentes**: Telas como *Decision Desk*, *Smart Allocation*, *Cash Flow* e *Calculadora de Aporte* consomem as funções puras de forma isolada e mantêm sua integridade operacional inalterada.
