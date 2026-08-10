### 18 — Atualizar AGENTS.md com as Golden Rules completas e revisadas ⚪

```
18 — Atualizar AGENTS.md com as Golden Rules completas e revisadas

Contexto: o AGENTS.md do projeto documenta só as Golden Rules 1 e 2
originais (datadas de 10/07/2026). Não reflete as revisões feitas nas
Regras 3 e 4, nem inclui as Regras 5 e 6 que foram adicionadas depois.

TAREFA: substituir o conteúdo de Golden Rules no AGENTS.md pelo texto
abaixo (versão completa e já revisada):

---
📐 1. Reusabilidade Primeiro (Arquitetura)
Regra: Antes de criar ou propor qualquer componente novo, o foco absoluto é
a REUSABILIDADE.
Ação: Evitar duplicação de lógica ou componentes isolados a todo custo.
Tudo deve ser arquitetado de forma agnóstica para servir toda a aplicação.
Antes de escrever um componente novo, buscar no projeto se já existe algo
equivalente — e se existir mais de uma versão do mesmo componente,
consolidar em um só antes de adicionar funcionalidade nova.

🌍 2. Global i18n Enforcement (Sem Hardcode)
Regra: É estritamente PROIBIDO escrever componentes React com texto de
interface em hardcode.
Ação: Qualquer texto visível ao utilizador final tem de passar pelo
sistema de i18n. Uma string solta na interface é falha crítica de
compilação.

🔒 3. Isolamento e Segurança de Dados (Database & Mocks)
Regra: É expressamente proibido comitar massa de dados locais/mockados
para o repositório principal ou sincronizar massa de dados de
desenvolvimento com o ambiente real do Firebase.
Ação: O ambiente de testes locais fica estritamente isolado da produção.
Arquivos de dado de dev sem nenhum import ativo devem ser removidos, não
deixados no repositório "por via das dúvidas".

🎯 4. Single Source of Truth (SSOT — Dados Financeiros)
Regra: A fórmula (getAssetValuation) é sagrada e única — nenhuma tela pode
reimplementar Bazin/Graham/Gordon por conta própria.
Ação: Toda tela de estado SALVO da carteira deve consumir exclusivamente
useValuedPortfolio. Telas de SIMULAÇÃO/exploração podem chamar
getAssetValuation diretamente, mas devem: (a) buscar o dividendo-base pela
mesma função canônica, nunca uma fonte paralela; (b) rotular visualmente
qualquer parâmetro alterado pelo usuário como "cenário/simulação".

📱 5. Abordagem "Mobile-First" Sustentável
Regra: Classes base do Tailwind definem o layout para telemóveis. Desktop é
sempre uma expansão (md:, lg:).
Ação: O layout não é "esmagado"; transaciona para scroll horizontal ou
colunas empilhadas no mobile, preservando elegância no Desktop.

🎨 6. Qualidade Visual Premium (Aesthetics)
Regra: "WOW effect" imediato. Evitar soluções simples de MVP.
Ação: Design moderno, micro-interações refinadas, glassmorphism elegante,
interfaces que transmitam confiança financeira absoluta.
---

CRITÉRIO DE SUCESSO: AGENTS.md com as 6 regras completas e na versão
revisada, substituindo o conteúdo antigo.
```

---