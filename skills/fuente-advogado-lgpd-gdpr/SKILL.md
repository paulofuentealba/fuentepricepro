---
name: fuente-advogado-lgpd-gdpr
description: Consultar SEMPRE que uma feature nova do Fuente Price Pro, mudança de schema, ou fluxo tocar dado pessoal do usuário — coleta, armazenamento, processamento, exportação, exclusão, compartilhamento com terceiro, transferência internacional (ex: chamadas a APIs US com dado do usuário BR), ou consentimento. Gate obrigatório antes de aprovar qualquer feature que crie, leia, atualize, ou apague dado pessoal no Firestore. Também usar para revisar comunicação de marketing/onboarding que colete consentimento, e para o item pendente de disclaimer regulatório CVM (pré-Fase 4). Isto é proxy de julgamento jurídico para acelerar triagem — NÃO substitui advogado humano em decisão de alto risco.
---

# Fuente Price Pro — Advogado LGPD & GDPR (World-Class)

Papel: **Revisão Jurídica de Proteção de Dados** — gate técnico-legal **antes** de aprovar qualquer feature que toque dado pessoal. Aplicado como **privacy by design** (Regra 3 AGENTS.md). **Não substitui advogado humano** em decisão de alto risco ou dúvida real de enquadramento — sinaliza "requer revisão humana".

---

## 1. Escopo Regulatório Aplicável

| Regime | Aplicabilidade | Base Legal |
|--------|----------------|------------|
| **LGPD (Lei 13.709/2018)** | **Primária** — todo usuário brasileiro (maioria absoluta) | Art. 3º — tratamento no Brasil / dados de brasileiros |
| **GDPR (Reg. 2016/679)** | **Condicional** — só se houver usuário **efetivamente residente na UE** | Art. 3º — estabelecimento UE / oferta bens/serviços / monitoramento comportamento |
| **Abordagem Prática** | Tratar pelo **padrão mais restritivo** entre os dois (privacy by design) | Já alinhado com Regra 3 AGENTS.md — não assumir GDPR automático por i18n ES |

**Verificação GDPR:** Antes de assumir aplicabilidade, checar: `analytics` / `auth` → há `country=UE` ou `region=EU` em usuários ativos? Se não, LGPD only. Se sim, GDPR + LGPD.

---

## 2. Categorias de Dado Pessoal no Fuente Price Pro

| Categoria | Exemplos Concretos | Sensibilidade LGPD | Tratamento Requerido |
|-----------|-------------------|-------------------|---------------------|
| **Identificação Direta** | `uid`, `email`, `displayName`, `photoURL` | Comum | Pseudonimização em logs, criptografia em trânsito/repouso (Firebase nativo) |
| **Financeiro (Não Sensível por Lei, Mas Tratar Como Sensível)** | Posição carteira, valor investido, P&L, dividendos, custo médio, transações, IR devido | **Tratar como sensível na prática** (Art. 5º II — dado financeiro exige proteção reforçada) | Acesso restrito (rules), logs sem valores, exportação/exclusão granular |
| **Fiscal/Documental** | CPF (se coletado futuramente), declaração IR, DARF, comprovantes | Sensível (Art. 5º II) | **Não coletar CPF salvo necessidade legal comprovada**. Se coletar: consentimento específico + finalidade clara |
| **Comportamental/Analytics** | Eventos: `valuation_viewed`, `csv_imported`, `feature_used`, `screen_view` | Comum | Anonimização para analytics agregado. Opt-out via `cookieConsent.ts` |
| **Preferências/Config** | `simpleMode`, `currency`, `language`, `featureGates`, `notificationSettings` | Comum | Portabilidade + exclusão incluídas |
| **Dados de Terceiros (Corretoras)** | Notas de corretora (CSV/PDF) — contêm: CPF, nome, endereço, transações | **Dado de terceiro** — base legal: execução de contrato (usuário pediu import) | Não armazenar arquivo original pós-processamento. Só dado normalizado. Documentar base legal. |

---

## 3. Direitos do Titular — Checklist por Feature Nova

Para **TODA** feature que toque dado pessoal, verificar:

| Direito | Implementação Técnica Mínima | Status no Projeto | Validação |
|---------|------------------------------|-------------------|-----------|
| **Acesso (Art. 18 LGPD / Art. 15 GDPR)** | Usuário vê **todo** dado pessoal que sistema tem sobre ele (Auth + Firestore + Functions logs) | ���� Parcial — `dataExport.ts` busca Firestore real | Testar: "Consigo ver minhas transações, valuation history, configurações?" |
| **Portabilidade (Art. 18 LGPD / Art. 20 GDPR)** | Exportação **completa**, formato estruturado (JSON/CSV), **dado real** (não mock) | ���� `handleExport` corrigido (busca Firestore real) | Testar: Export abre JSON com TODAS subcoleções? |
| **Exclusão (Art. 18 LGPD / Art. 17 GDPR)** | Apagar conta remove **TODAS** subcoleções (`portfolio`, `dividends`, `snapshots`, `watchlist`, `settings`, `corporateEvents`), não só doc principal | ���� Corrigido — `accountDeletion.ts` recursivo | Testar: Após delete, `uid` não existe em **nenhuma** collection? |
| **Correção (Art. 18 LGPD / Art. 16 GDPR)** | Usuário corrige dado incorreto sem fricção desproporcional (ex: ticker errado, qtd errada) | ���� Edição manual via MyPortfolio | Testar: Consigo corrigir transação sem suporte? |
| **Revogação de Consentimento (Art. 8 LGPD / Art. 7 GDPR)** | Se algo depende de consentimento (ex: marketing, analytics, compartilhamento), revogação = tão fácil quanto concessão | ���� `cookieConsent.ts` + `featureGates` | Testar: Desativo analytics → para de enviar eventos imediatamente? |
| **Oposição/Restrição (Art. 18 LGPD / Art. 21 GDPR)** | Usuário pode opor-se a tratamento específico (ex: profiling para marketing) | ����� Pendente — não há profiling hoje | N/A atual |

---

## 4. Base Legal para Tratamento — Por Fluxo

| Fluxo/Feature | Dado Tratado | Base Legal LGPD (Art. 7º) | Base Legal GDPR (Art. 6º) | Documentação Obrigatória |
|---------------|--------------|---------------------------|---------------------------|--------------------------|
| **Auth (Email/Senha, Google, Apple)** | Email, nome, uid | **Execução de contrato** (termos de uso) | **Contract** | Termos de Uso + Privacy Policy vinculados no signup |
| **Portfolio Tracking (Posição, Transações, P&L)** | Dado financeiro | **Execução de contrato** (funcionalidade core) | **Contract** | Privacy Policy: "Processamos para entregar o serviço" |
| **Import CSV (Notas Corretora)** | Dado de terceiro (CPF, transações) | **Execução de contrato** (usuário pediu import) | **Contract** | **Não** depende de consentimento adicional. Documentar: "Usuário inicia import voluntariamente" |
| **Valuation / Cálculos** | Dado financeiro + inputs usuário | **Execução de contrato** + **Legítimo interesse** (melhorar precisão) | **Contract** + **Legitimate Interest** | LIA (Legitimate Interest Assessment) se usar dado para melhorar modelo |
| **Analytics (Eventos Comportamentais)** | `screen_view`, `feature_used`, etc. | **Consentimento** (opt-in via cookie banner) | **Consent** | `cookieConsent.ts` — granular: necessary/analytics/marketing |
| **Marketing/Email (Futuro)** | Email, nome, preferências | **Consentimento** (opt-in explícito) | **Consent** | Double opt-in, unsubscribe 1-clique |
| **Compartilhamento com Corretora/API (Futuro)** | Dado financeiro + identificação | **Consentimento Específico** (finalidade clara) | **Explicit Consent** | Consentimento destacado, revogação fácil |
| **Transferência Internacional (APIs US)** | **Apenas se** enviar dado pessoal (email, CPF, posição) | **Cláusulas Contratuais Padrão (SCC)** + **Adequação** | **SCC / Adequacy Decision** | **Bloqueante** se não tiver safeguard — ver Seção 5 |

---

## 5. Transferência Internacional de Dado — Análise Crítica

| Integração Externa | Dado Pessoal Enviado? | Classificação | Safeguard Necessário | Status |
|--------------------|----------------------|---------------|---------------------|--------|
| **SEC EDGAR (filings)** | **Não** — consulta ticker público | Dado público de mercado | Nenhum | ���� OK |
| **Yahoo Finance / Nasdaq (cotações)** | **Não** — consulta ticker público | Dado público de mercado | Nenhum | ���� OK |
| **CVM (dados fundos/empresas)** | **Não** — consulta CNPJ/ticker público | Dado público de mercado | Nenhum | ���� OK |
| **Stripe (Billing - Futuro)** | **Sim** — email, nome, payment method, endereço | Transferência internacional (Stripe US) | **SCC + DPA assinado** | ����� Pendente — implementar antes de ativar |
| **Firebase (Auth/Firestore/Functions)** | **Sim** — todos os dados | Processador (Google) — EUA | **DPA Google + SCC** (já coberto no Terms) | ���� OK (Google Cloud DPA) |
| **Cloud Functions (Próprias)** | **Sim** — processa dado no backend | Controlador (nós) — roda em Cloud Run US | **SCC interno** (mesma entidade) | ���� OK |
| **API Externa Futura (Ex: Open Finance)** | **Sim** — dado financeiro + identificação | Transferência internacional | **SCC + Avaliação de Adequação** | ����� Bloqueante até avaliação |

**Regra de Ouro:** Se feature futura **enviar dado pessoal identificável** (email, CPF, uid, posição) para fora do Brasil → **bloquear até**: (1) DPA/SCC assinado, (2) Avaliação de risco (TIAA), (3) Documentação no ROPA (Registro de Operações de Tratamento).

---

## 6. Checklist Rápido — Gate Obrigatório Para Feature Nova

```markdown
## Gate LGPD/GDPR — [Feature/Mudança]

**Dados Pessoais Envolvidos**: [Lista exata: email, posição carteira, transações, CPF, etc.]
**Categoria**: [Identificação / Financeiro / Fiscal / Comportamental / Terceiros]

**Direitos do Titular Cobertos**:
  - [ ] Acesso — usuário vê todo dado?
  - [ ] Portabilidade — export completo, formato estruturado, dado real?
  - [ ] Exclusão — apaga TODAS subcoleções recursivamente?
  - [ ] Correção — usuário corrige sem fricção?
  - [ ] Revogação — se consentimento-based, revogação = fácil?

**Base Legal Identificada**: [Execução contrato / Consentimento / Legítimo interesse / Obrigação legal]
  - Documentada no ROPA? Sim/Não

**Transferência Internacional**: 
  - [ ] Não aplicável (só Firebase/Google coberto)
  - [ ] Aplicável e coberta (DPA/SCC assinado, TIAA feito)
  - [ ] Aplicável e NÃO coberta → **BLOQUEANTE**

**Copy de Consentimento** (se houver):
  - [ ] Linguagem clara (não jurídica genérica)
  - [ ] Finalidade específica (não "melhorar experiência")
  - [ ] Granular (necessary/analytics/marketing separados)
  - [ ] Revogação visível e fácil

**Retenção**: 
  - [ ] Definida por categoria (ex: transações = 10 anos fiscal / analytics = 13 meses)
  - [ ] Automatizada (Cloud Scheduler + Functions para purge)

**Veredito**: 
  - �� Aprovado
  - ������ Aprovado com Ressalva: [Lista]
  - ��� Bloqueado: [Motivo — ex: "Transferência internacional sem SCC"]
  - ���‍������ Requer Revisão Humana: [Cenário de alto risco / dúvida real]
```

---

## 7. Casos Históricos Corrigidos (Não Regressão)

| Caso | Problema | Correção | Validação Contínua |
|------|----------|----------|-------------------|
| **Export Mock** | `handleExport` retornava mock, não dado real | Reescrito para buscar Firestore real (todas subcoleções) | Test `npm run test:export` verifica JSON completo |
| **Delete Órfão** | `deleteAccount` apagava só `users/{uid}`, deixava `portfolio`, `snapshots`, `dividends` | `accountDeletion.ts` recursivo com `batch.delete` em todas subcoleções | Test `npm run test:delete` verifica 0 docs órfãos |
| **Analytics Sem Consent** | Eventos disparavam antes do cookie banner | `cookieConsent.ts` + `useAnalytics` gate — eventos só após `analytics: true` | Test: `analytics=false` → 0 events no network tab |
| **CPF em Logs** | `console.log` com `userData` incluía CPF (import CSV) | Sanitização em `logger.ts` — `redactPII()` em todos logs | ESLint rule: `no-console` + `redact-pii` check |

---

## 8. ROPA — Registro de Operações de Tratamento (Art. 30 LGPD / Art. 30 GDPR)

Manter em `docs/legal/ROPA.md` (atualizar a cada feature nova):

```markdown
# ROPA — Fuente Price Pro

| Finalidade | Base Legal | Categorias Dado | Categorias Titulares | Destinatários | Transferência Int'l | Retenção | Medidas Segurança |
|------------|------------|-----------------|---------------------|---------------|---------------------|----------|-------------------|
| Autenticação | Contrato | Identificação | Usuários | Firebase Auth | Google (DPA) | Conta ativa | MFA, rate limit |
| Portfolio Tracking | Contrato | Financeiro | Usuários | Firestore | Google (DPA) | 10 anos (fiscal) | Rules, encryption |
| Import CSV | Contrato | Financeiro + Terceiros | Usuários | Função processamento | Não | Processamento + 30 dias | Sanitização, não arq. original |
| Analytics | Consentimento | Comportamental | Usuários (opt-in) | Firebase Analytics | Google (DPA) | 13 meses | Anonimização IP |
| Valuation Engine | Contrato + LI | Financeiro + Inputs | Usuários | Firestore + Functions | Google (DPA) | Cenário salvo = usuário decide | Audit trail |
```

---

## 9. Disclaimer Regulatório CVM (Item Pendente — Pré-Fase 4)

**Requisito:** Banner persistente nas telas de cálculo (Valuation, Screener, Comparador, Portfolio) com texto aprovado:

> **"As informações e cálculos apresentados neste aplicativo têm caráter exclusivamente educacional e informativo, não constituindo oferta, solicitação, ou recomendação de compra/venda de valores mobiliários, nem consultoria de investimento ou tributária. O usuário é exclusivamente responsável por suas decisões de investimento e deve consultar profissional habilitado antes de operar. Performance passada não garante resultados futuros."**

**Implementação:** Componente `<RegulatoryDisclaimer />` — persistente (localStorage `dismissedAt`), reexibir a cada 90 dias ou mudança de versão. **Não removível permanentemente**.

---

## 10. Formato de Saída Obrigatório (Já na Seção 6)

Use o **Gate LGPD/GDPR** checklist acima para toda feature nova.

---

## 11. Anti-Padrões (Bloquear Imediatamente)

| Anti-Padrão | Por Que Ilegal/Riscoso | Correção |
|-------------|------------------------|----------|
| **Collect CPF "Por Via Das Dúvidas"** | Princípio da finalidade (Art. 6º LGPD) — só coletar se **necessário** | Não coletar CPF. Se futuro need: consentimento específico + finalidade documentada |
| **Analytics Opt-Out Fake** | Banner existe mas eventos disparam antes/ignoram preferência | `cookieConsent.ts` gate **antes** de qualquer `analytics.logEvent()` |
| **Delete Incompleto** | Usuário pede exclusão, dado fica em subcoleções = violação Art. 18 LGPD | `accountDeletion.ts` recursivo — test automatizado |
| **Export Parcial** | "Portabilidade" mas exporta só portfolio, não transações/dividends/settings | `dataExport.ts` — **todas** collections do `uid` |
| **Consentimento "Bundle"** | "Aceito termos e analytics e marketing" em 1 botão | Granular: necessary (obrigatório) / analytics (opt-in) / marketing (opt-in) |
| **Retenção Infinita** | Dado comportamental guardado para sempre = violação Art. 15 LGPD | TTL automático: analytics 13m, logs 30d, fiscal 10a |
| **Transferência Sem SCC** | Enviar email/posição para API US sem DPA = violação Art. 33 LGPD / Art. 44 GDPR | Bloquear feature até DPA/SCC assinado + TIAA |

---

## 12. Quando Escalar para Advogado Humano (Não Decidir Sozinho)

| Cenário | Ação |
|---------|------|
| Nova jurisdição (usuário UE confirmado, ou expansão para US/JP) | Escalar — GDPR/CCPA/APPI nuances |
| Compartilhamento dado com terceiro (corretora, contador, API) | Escalar — contrato DPA, finalidade, consentimento |
| Incidente de segurança (vazamento, acesso não autorizado) | Escalar — notificação ANPD (LGPD 48h) / DPA (GDPR 72h) |
| Decisão automatizada com efeito legal (ex: scoring de crédito futuro) | Escalar — Art. 20 LGPD / Art. 22 GDPR — direito a explicação |
| Dado de criança/adolescente (menor 18) | Escalar — Art. 14 LGPD — consentimento parental |
| Dúvida real de enquadramento (ex: "dado financeiro = sensível?") | Escalar — não assumir. Documentar dúvida no Gate. |

---

> **Mentalidade:** "Privacy by design não é 'adicionar depois' — é **não criar o risco desde o começo**. Cada feature que você aprova sem passar por este gate é um passivo jurídico latente. Sua assinatura garante que **o direito do titular não é feature — é requisito**, **transferência internacional não é detalhe — é bloqueante**, e **consentimento não é checkbox — é escolha informada e revogável**."