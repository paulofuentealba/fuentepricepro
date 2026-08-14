# Política de Privacidade — Fuente Price Pro

> **Rascunho para revisão de Paulo e, idealmente, de um advogado
> especializado em proteção de dados antes de publicar.** Este documento
> foi redigido com base no que a plataforma efetivamente coleta e faz hoje
> — não inclui nenhuma prática que ainda não exista (ex: cookies de
> analytics, que só entram quando o PostHog for ativado).

**Última atualização**: [preencher na publicação]

## 1. Quem somos

O Fuente Price Pro ("nós", "plataforma") é uma ferramenta de valuation de
portfólio e engenharia de renda passiva, oferecida por **Paulo
Fuentealba, pessoa física**, até a eventual formalização de pessoa
jurídica (CNPJ) — esta seção será atualizada quando isso ocorrer. Esta
política explica quais dados pessoais coletamos, por quê, e quais
direitos você tem sobre eles, em conformidade com a Lei Geral de Proteção
de Dados (LGPD, Lei nº 13.709/2018).

**Encarregado de dados (Art. 41, LGPD) / contato**: Paulo Fuentealba —
gutierre.fuentealba@gmail.com. Como agente de tratamento de pequeno porte
(pessoa física/startup em estágio inicial), o fundador acumula esta
função — prática usual e permitida para operações deste porte.

## 2. Quais dados coletamos

### 2.1 Dados de conta
- Nome, e-mail e foto de perfil (via login com Google ou e-mail/senha,
  Firebase Authentication).
- Nome completo, telefone e localização (opcionais, se você preencher em
  Configurações → Perfil).

### 2.2 Dados de portfólio (o núcleo do serviço)
- Ativos que você adiciona à carteira (ticker, tipo, classe).
- Transações que você registra (compra/venda, data, quantidade, preço,
  taxas).
- Metas pessoais (yield-alvo, meta de gastos mensais, aporte mensal
  estimado) — usadas para calcular seu progresso de independência
  financeira.
- Respostas ao questionário de perfil de investidor (se você o
  preencher), usadas só para personalizar recomendações dentro do app.

### 2.3 Dados técnicos mínimos
- Registro de data/hora de acesso e identificadores de sessão do
  Firebase Authentication, necessários para manter você conectado com
  segurança.

**O que NÃO coletamos hoje**: cookies de rastreamento/analytics,
publicidade de terceiros, ou qualquer dado de navegação fora do próprio
app. Se isso mudar (ex: ativarmos ferramentas de analytics para entender
uso do produto), você será avisado por um banner de consentimento
específico antes de qualquer coleta desse tipo começar.

## 3. Por que coletamos (base legal)

- **Execução de contrato** (Art. 7º, V, LGPD): os dados de conta e
  portfólio são coletados porque são o serviço em si — sem eles, não
  conseguimos calcular seu Preço Teto, projetar sua renda passiva, ou
  mostrar seu histórico de carteira.
- **Consentimento** (Art. 7º, I, LGPD): dados opcionais (telefone,
  localização, questionário de perfil) e qualquer coleta futura de
  analytics/cookies não-essenciais dependem do seu consentimento
  explícito, que pode ser revogado a qualquer momento.

## 4. Com quem compartilhamos

- **Google Cloud / Firebase** (autenticação e armazenamento do banco de
  dados) — atua como operador de dados, sob contrato, seguindo os
  padrões de segurança do Google Cloud. Os servidores podem estar
  localizados fora do Brasil (infraestrutura global do Google Cloud);
  esse tratamento internacional segue as salvaguardas contratuais
  padrão do Google Cloud para conformidade com LGPD/GDPR.
- **Fontes de dado de mercado** (Brapi, Yahoo Finance, SEC EDGAR, CVM,
  Banco Central): consultamos essas fontes para buscar preços e
  fundamentos de ativos públicos — **nunca enviamos seus dados
  pessoais ou de portfólio para essas fontes**, só consultamos
  informação de mercado pública usando o ticker que você pesquisa.
- **Não vendemos nem compartilhamos seus dados com terceiros para fins
  de publicidade.**

## 5. Seus direitos (Art. 18, LGPD)

Você pode, a qualquer momento, em Configurações → Privacidade:
- **Exportar seus dados** (backup completo em CSV) antes de qualquer
  outra ação.
- **Excluir sua conta permanentemente** — remove todos os seus dados
  pessoais e de portfólio dos nossos servidores (direito ao
  esquecimento), ação irreversível.

Você também pode, a qualquer momento, escrever para o e-mail do
Encarregado (seção 1) para: confirmar quais dados temos sobre você,
corrigir dados incorretos, ou tirar dúvidas sobre este documento.

## 6. Retenção de dados

Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir sua
conta pelo fluxo de Configurações → Privacidade → Excluir Conta, seus
dados pessoais e de portfólio são apagados permanentemente dos nossos
servidores.

## 7. Segurança

Os dados são armazenados no Firebase/Firestore com regras de segurança
que impedem qualquer usuário de acessar dados de outro usuário. O
acesso de escrita a configurações sensíveis (ex: nível de assinatura) é
restrito ao backend, nunca gravável diretamente pelo navegador.

## 8. Alterações nesta política

Se mudarmos práticas relevantes de coleta de dados (ex: adicionarmos
analytics), atualizaremos esta página e, quando aplicável, mostraremos
um novo aviso de consentimento antes da mudança entrar em vigor.
