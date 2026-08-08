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

📖 7. AGENTS.md Tem Precedência (Governança)
Regra: Este arquivo deve ser lido por qualquer agente (Antigravity, Claude,
ou outro) antes de propor ou executar qualquer mudança no código.
Ação: Nenhum prompt de tarefa dispensa a leitura deste arquivo. Se alguma
instrução de um prompt específico conflitar com uma regra aqui, esta regra
vence — o agente deve parar e sinalizar o conflito em vez de decidir por
conta própria qual seguir.

📋 8. Plano de Implementação Obrigatório Antes de Executar (Antigravity)
Regra: Antes de qualquer alteração de código, o Antigravity deve apresentar
um plano de implementação por escrito e aguardar aprovação — nunca pular
direto para execução, mesmo em tarefas que pareçam pequenas ou óbvias.
Ação: O plano deve conter, obrigatoriamente:
(a) lista dos arquivos que serão criados/alterados;
(b) a lógica central de cada mudança;
(c) uma seção explícita de "Pontos de Atenção & Decisões de Arquitetura",
    no formato risco → decisão, cobrindo qualquer trade-off, ambiguidade,
    dependência ou dado que o Antigravity precisou assumir/decidir sozinho
    durante a leitura do código (ex: qual algoritmo usar em caso de não
    convergência, como tratar multi-moeda, como garantir idempotência).
    Cada ponto deve nomear o risco identificado e a decisão tomada, não só
    descrever o que vai ser construído.
Só após aprovação explícita do revisor (Claude ou Paulo) o Antigravity
prossegue para a implementação de fato. Pular esta etapa — ou entregar um
plano que só lista arquivos sem os pontos de atenção — é uma violação desta
regra, mesmo que o resultado final esteja correto. O plano existe para
permitir correção ANTES do trabalho ser feito, não para documentar depois.

🧭 9. Governança de Roles (Skills)
Regra: Em toda atividade substantiva do projeto (revisão, plano, roadmap,
desenho de solução, copy, UX), o Claude deve considerar explicitamente os
seis papéis instalados: fuente-architecture-review, fuente-solution-architect,
fuente-business-architect, fuente-product-manager, fuente-product-marketing,
fuente-ux-designer.
Ação: Se um papel não se aplica à atividade em questão, isso deve ser
declarado explicitamente, com o motivo — nunca omitido silenciosamente.
A fonte canônica de cada papel vive em skills/*/SKILL.md, versionada neste
repositório; a versão instalada no Claude é uma cópia e deve ser
resincronizada manualmente sempre que o SKILL.md correspondente for
alterado aqui (rodar scripts/check.py --manifest após editar, depois
reinstalar o skill).