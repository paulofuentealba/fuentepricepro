# Plano de Implementação — Prompts 92 a 97

Conforme os arquivos recebidos em `docs/Prompts`, faremos a execução sistemática e sequencial dos Prompts 92 ao 97. 
Utilizarei as skills habilitadas (especialmente `fuente-architecture-review`, `fuente-solution-architect`, `fuente-product-manager`, `fuente-ux-designer`, `fuente-advogado-lgpd-gdpr`, `fuente-investidor-iniciante` e `fuente-investidor-profissional`) ao longo de cada passo.

Abaixo está o detalhamento de cada etapa do plano.

## 1. Prompt 92 — Regra Firestore `config/featureGates` (🔴 Bug Crítico)
- **Objetivo**: Corrigir regra no `firestore.rules` que bloqueia leitura de `config/featureGates` para usuários reais, tornando o documento de leitura pública (`allow read: if true;`) mantendo a restrição de escrita (`allow write: if false;`).
- **Passos**:
  - Investigar e listar outras regras em `/config/*` para confirmar isolamento.
  - Ajustar `firestore.rules`.
  - Atualizar/adicionar os 4 testes obrigatórios especificados no Firebase Emulator local.
  - Validar com `npx tsc --noEmit`, `npm run test`, `npm run test:rules` e `npm run build`.
  - Gerar commit `fix(firestore): allow public read on config/featureGates [Auditoria UX 1.2]` e criar relatório.

## 2. Prompt 93 — Classificação ETF/BDR (BIVB39) & Dívida Prompt 86 (🟠 Bug Não-Crítico)
- **Objetivo**: Reconhecer o sufixo `39` como BDR de ETF antes do fallback genérico de "Ações" e cobrir o código com testes de regressão automatizados para validar a precedência do `.SA`.
- **Passos**:
  - Extrair o snapshot da classificação antes da mudança.
  - Atualizar lógica em `classify.ts` ou `classify.server.ts` (conforme escopo documentado no arquivo de testes anterior).
  - Validar e registrar os testes (fechar dívida do prompt 86).
  - Executar verificação e gerar o diff de classificação, e relatar.
  - Commit `fix(classification): recognize BDR ETF suffix 39 + regression tests [Auditoria UX 1.3 + dívida Prompt 86]`.

## 3. Prompt 94 — Zero vs Indisponível (🟠 Bug Não-Crítico)
- **Objetivo**: Garantir que dados de valuation faltantes não sejam ambíguos (exibindo `0,0%`).
- **Passos**:
  - *Investigação Inicial*: Confirmar se o `0` vem da camada A (SSOT, `calculations.ts`) ou da camada B (display fallback na UI). 
  - Se for Camada B, criar `formatPercentOrUnavailable` e aplicar o fallback `-` nas telas relevantes, adicionando chaves i18n nas 3 traduções.
  - Se for Camada A, interrompo e peço autorização.
  - Realizar os testes e commit: `fix(formatting): show unavailable instead of zero for missing valuation data [Auditoria UX 1.3 + Padrão 3]`.

## 4. Prompt 95 — Tabela Mobile Home (`ResponsiveTable`) (🟡 Melhoria UX/Tech)
- **Objetivo**: Extrair padrão de scroll responsivo do "Radar de Risco" e aplicá-lo na tabela "Sua carteira" da "Home" com a primeira coluna (`position: sticky`).
- **Passos**:
  - Extrair lógica para `ResponsiveTable.tsx`.
  - Substituir uso na tabela da Home.
  - Testar layout em viewport <=375px e documentar candidatas a futuras migrações.
  - Commit: `feat(ui): extract ResponsiveTable with sticky column, apply to Home portfolio table [Auditoria UX 1.1/Padrão 3]`.

## 5. Prompt 96 — Copy "mediana" + Tooltip ETF (🟡 Melhoria UX/Tech)
- **Objetivo**: Corrigir erro conceitual (onde diz "média", dizer "mediana") na Wiki nos 3 idiomas, e adicionar tooltip em "Minha Carteira" para ETFs que exibem `--` sem consenso.
- **Passos**:
  - Atualizar as chaves i18n nos 3 idiomas (PT-BR, EN, ES) alterando média para mediana e reescrevendo exemplos.
  - Inserir Tooltip explicativo usando componente existente na tela "Minha Carteira".
  - Executar verificação e commit: `fix(content): correct median wording in Fuente Consensus wiki (3 locales) + ETF consensus tooltip [Auditoria UX - Wiki + Minha Carteira]`.

## 6. Prompt 97 — Auditoria de Verificação UX
- **Objetivo**: Atuar estritamente como Auditor em 5 pontos da Auditoria UX e gerar um relatório final. 
- **Passos**:
  - Testar Export CSV/Excel em Minha Carteira.
  - Verificar formulário duplicado (display:none) em Aporte Inteligente.
  - Verificar paleta de cores dos gráficos Cash Flow.
  - Verificar milestone "50% da renda coberta".
  - Testar Mesa de Decisão do Comparador em viewport <=375px.
  - Produzir tabela formal com as recomendações de cada ponto. Não haverá commmits desta parte.

## Verificação Final
Após a execução e a auditoria, farei o `git push` na branch `dev` com todos os commits aplicados. Serão gerados artefatos individuais documentando a execução de cada Prompt, que consolidarei ou enviarei iterativamente no fluxo.

> [!IMPORTANT]
> Aguardo a sua aprovação deste Plano de Implementação para prosseguir. Ao aprovar, inicializarei com a etapa 1 (Prompt 92).
