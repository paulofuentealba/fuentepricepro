import type { Locale } from "./formatters";

/**
 * Structured content for the public Privacy Policy and Terms of Use pages
 * (`src/routes/privacy.tsx` / `src/routes/terms.tsx`).
 *
 * Kept out of `i18n/dict.*.ts` on purpose: those files are already ~1000+
 * lines of short UI strings, and dumping ~18 legal sections x 3 locales in
 * there would make them harder to navigate for their actual purpose. This
 * file is the single place to update legal copy across all 3 languages.
 *
 * Content source: `docs/Prompts/politica_privacidade_rascunho.md` and
 * `docs/Prompts/termos_de_uso_rascunho.md`, approved by Paulo. The internal
 * "rascunho para revisão" note at the top of each source file is NOT
 * published here — it was addressed to Paulo/reviewers, not end users.
 * Do not change legal substance here without going back to Paulo for
 * approval — translations must preserve the meaning of each clause,
 * especially Terms §3 ("this is NOT investment advice").
 */

export const LEGAL_CONTACT_EMAIL = "gutierre.fuentealba@gmail.com";
/** ISO date the drafts were approved and published. */
export const LEGAL_LAST_UPDATED = "2026-08-12";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] };

export interface LegalSection {
  id: string;
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  sections: LegalSection[];
}

interface LegalContent {
  privacy: LegalDocument;
  terms: LegalDocument;
}

const ptBR: LegalContent = {
  privacy: {
    title: "Política de Privacidade",
    sections: [
      {
        id: "quem-somos",
        heading: "1. Quem somos",
        blocks: [
          {
            type: "p",
            text: 'O Fuente Price Pro ("nós", "plataforma") é uma ferramenta de valuation de portfólio e engenharia de renda passiva, oferecida por Paulo Fuentealba, pessoa física, até a eventual formalização de pessoa jurídica (CNPJ) — esta seção será atualizada quando isso ocorrer. Esta política explica quais dados pessoais coletamos, por quê, e quais direitos você tem sobre eles, em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).',
          },
          {
            type: "p",
            text: `Encarregado de dados (Art. 41, LGPD) / contato: Paulo Fuentealba — ${LEGAL_CONTACT_EMAIL}. Como agente de tratamento de pequeno porte (pessoa física/startup em estágio inicial), o fundador acumula esta função — prática usual e permitida para operações deste porte.`,
          },
        ],
      },
      {
        id: "dados-conta",
        heading: "2.1 Dados de conta",
        blocks: [
          {
            type: "list",
            items: [
              "Nome, e-mail e foto de perfil (via login com Google ou e-mail/senha, Firebase Authentication).",
              "Nome completo, telefone e localização (opcionais, se você preencher em Configurações → Perfil).",
            ],
          },
        ],
      },
      {
        id: "dados-portfolio",
        heading: "2.2 Dados de portfólio (o núcleo do serviço)",
        blocks: [
          {
            type: "list",
            items: [
              "Ativos que você adiciona à carteira (ticker, tipo, classe).",
              "Transações que você registra (compra/venda, data, quantidade, preço, taxas).",
              "Metas pessoais (yield-alvo, meta de gastos mensais, aporte mensal estimado) — usadas para calcular seu progresso de independência financeira.",
              "Respostas ao questionário de perfil de investidor (se você o preencher), usadas só para personalizar recomendações dentro do app.",
            ],
          },
        ],
      },
      {
        id: "dados-tecnicos",
        heading: "2.3 Dados técnicos mínimos",
        blocks: [
          {
            type: "list",
            items: [
              "Registro de data/hora de acesso e identificadores de sessão do Firebase Authentication, necessários para manter você conectado com segurança.",
            ],
          },
          {
            type: "p",
            text: "O que NÃO coletamos hoje: cookies de rastreamento/analytics, publicidade de terceiros, ou qualquer dado de navegação fora do próprio app. Se isso mudar (ex: ativarmos ferramentas de analytics para entender uso do produto), você será avisado por um banner de consentimento específico antes de qualquer coleta desse tipo começar.",
          },
        ],
      },
      {
        id: "base-legal",
        heading: "3. Por que coletamos (base legal)",
        blocks: [
          {
            type: "list",
            items: [
              "Execução de contrato (Art. 7º, V, LGPD): os dados de conta e portfólio são coletados porque são o serviço em si — sem eles, não conseguimos calcular seu Preço Teto, projetar sua renda passiva, ou mostrar seu histórico de carteira.",
              "Consentimento (Art. 7º, I, LGPD): dados opcionais (telefone, localização, questionário de perfil) e qualquer coleta futura de analytics/cookies não-essenciais dependem do seu consentimento explícito, que pode ser revogado a qualquer momento.",
            ],
          },
        ],
      },
      {
        id: "compartilhamento",
        heading: "4. Com quem compartilhamos",
        blocks: [
          {
            type: "list",
            items: [
              "Google Cloud / Firebase (autenticação e armazenamento do banco de dados) — atua como operador de dados, sob contrato, seguindo os padrões de segurança do Google Cloud. Os servidores podem estar localizados fora do Brasil (infraestrutura global do Google Cloud); esse tratamento internacional segue as salvaguardas contratuais padrão do Google Cloud para conformidade com LGPD/GDPR.",
              "Fontes de dado de mercado (Brapi, Yahoo Finance, SEC EDGAR, CVM, Banco Central): consultamos essas fontes para buscar preços e fundamentos de ativos públicos — nunca enviamos seus dados pessoais ou de portfólio para essas fontes, só consultamos informação de mercado pública usando o ticker que você pesquisa.",
              "Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade.",
            ],
          },
        ],
      },
      {
        id: "seus-direitos",
        heading: "5. Seus direitos (Art. 18, LGPD)",
        blocks: [
          {
            type: "p",
            text: "Você pode, a qualquer momento, em Configurações → Privacidade:",
          },
          {
            type: "list",
            items: [
              "Exportar seus dados (backup completo em CSV) antes de qualquer outra ação.",
              "Excluir sua conta permanentemente — remove todos os seus dados pessoais e de portfólio dos nossos servidores (direito ao esquecimento), ação irreversível.",
            ],
          },
          {
            type: "p",
            text: "Você também pode, a qualquer momento, escrever para o e-mail do Encarregado (seção 1) para: confirmar quais dados temos sobre você, corrigir dados incorretos, ou tirar dúvidas sobre este documento.",
          },
        ],
      },
      {
        id: "retencao",
        heading: "6. Retenção de dados",
        blocks: [
          {
            type: "p",
            text: "Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir sua conta pelo fluxo de Configurações → Privacidade → Excluir Conta, seus dados pessoais e de portfólio são apagados permanentemente dos nossos servidores.",
          },
        ],
      },
      {
        id: "seguranca",
        heading: "7. Segurança",
        blocks: [
          {
            type: "p",
            text: "Os dados são armazenados no Firebase/Firestore com regras de segurança que impedem qualquer usuário de acessar dados de outro usuário. O acesso de escrita a configurações sensíveis (ex: nível de assinatura) é restrito ao backend, nunca gravável diretamente pelo navegador.",
          },
        ],
      },
      {
        id: "alteracoes",
        heading: "8. Alterações nesta política",
        blocks: [
          {
            type: "p",
            text: "Se mudarmos práticas relevantes de coleta de dados (ex: adicionarmos analytics), atualizaremos esta página e, quando aplicável, mostraremos um novo aviso de consentimento antes da mudança entrar em vigor.",
          },
        ],
      },
    ],
  },
  terms: {
    title: "Termos de Uso",
    sections: [
      {
        id: "aceitacao",
        heading: "1. Aceitação",
        blocks: [
          {
            type: "p",
            text: "Ao criar uma conta ou usar o Fuente Price Pro, você concorda com estes Termos de Uso e com a nossa {{privacyLink}}.",
          },
        ],
      },
      {
        id: "o-que-e",
        heading: "2. O que é o serviço",
        blocks: [
          {
            type: "p",
            text: "O Fuente Price Pro é uma ferramenta educacional e de análise quantitativa para investidores de dividendos, cobrindo os mercados brasileiro (B3) e americano. Oferecemos: cálculo de Preço Teto (modelos Bazin, Graham, Gordon), acompanhamento de carteira, projeção de fluxo de caixa de dividendos, e ferramentas de simulação.",
          },
        ],
      },
      {
        id: "nao-e-aconselhamento",
        heading: "3. Isto NÃO é aconselhamento de investimento",
        blocks: [
          {
            type: "p",
            text: "Este é o ponto mais importante destes Termos. Nada no Fuente Price Pro constitui recomendação, indicação, análise de valores mobiliários ou parecer fiscal/tributário formal. Todas as projeções, cálculos e consensos de valuation são baseados em dados históricos e modelos matemáticos — não são garantia de resultado futuro. A decisão final de alocação de capital é inteiramente sua responsabilidade.",
          },
          {
            type: "p",
            text: "Consulte um profissional certificado (analista CVM, planejador financeiro) antes de tomar decisões de investimento.",
          },
        ],
      },
      {
        id: "sua-conta",
        heading: "4. Sua conta",
        blocks: [
          {
            type: "list",
            items: [
              "Você é responsável por manter a confidencialidade da sua conta.",
              "Os dados de portfólio que você insere (ativos, transações, valores) são de sua responsabilidade quanto à exatidão — a plataforma calcula em cima do que você informa.",
              "Os limites e recursos disponíveis entre os planos Gratuito e Pro podem variar conforme a evolução do produto; os limites vigentes são sempre os exibidos dentro da própria plataforma no momento do uso.",
            ],
          },
        ],
      },
      {
        id: "uso-aceitavel",
        heading: "5. Uso aceitável",
        blocks: [
          { type: "p", text: "Você concorda em não:" },
          {
            type: "list",
            items: [
              "Tentar acessar dados de outros usuários.",
              "Usar a plataforma para fins ilegais ou fraudulentos.",
              "Fazer engenharia reversa ou tentar extrair os modelos de cálculo proprietários de forma automatizada em escala.",
            ],
          },
        ],
      },
      {
        id: "propriedade-intelectual",
        heading: "6. Propriedade intelectual",
        blocks: [
          {
            type: "p",
            text: "O código, design, marca e metodologia de valuation do Fuente Price Pro são de propriedade de Paulo Fuentealba (pessoa física, até a eventual formalização de pessoa jurídica). Os dados de mercado exibidos (preços, fundamentos) são obtidos de fontes públicas/terceiros (B3, SEC, Yahoo Finance, Banco Central) e permanecem propriedade de suas respectivas fontes.",
          },
        ],
      },
      {
        id: "limitacao-responsabilidade",
        heading: "7. Limitação de responsabilidade",
        blocks: [
          {
            type: "p",
            text: 'Na máxima extensão permitida por lei, o Fuente Price Pro não se responsabiliza por perdas financeiras decorrentes de decisões de investimento tomadas com base nas informações da plataforma. O serviço é fornecido "como está", sem garantia de disponibilidade ininterrupta ou ausência de erros nos dados de mercado de terceiros.',
          },
        ],
      },
      {
        id: "cancelamento",
        heading: "8. Cancelamento",
        blocks: [
          {
            type: "p",
            text: "Você pode excluir sua conta a qualquer momento em Configurações → Privacidade. Assinaturas Pro pagas seguem os termos de cancelamento descritos na tela de assinatura no momento da contratação.",
          },
        ],
      },
      {
        id: "alteracoes-termos",
        heading: "9. Alterações nestes Termos",
        blocks: [
          {
            type: "p",
            text: "Podemos atualizar estes Termos periodicamente. Mudanças materiais serão comunicadas por aviso na plataforma.",
          },
        ],
      },
      {
        id: "contato",
        heading: "10. Contato",
        blocks: [
          {
            type: "p",
            text: `Dúvidas sobre estes Termos: ${LEGAL_CONTACT_EMAIL} (mesmo e-mail de contato da Política de Privacidade).`,
          },
        ],
      },
    ],
  },
};

const en: LegalContent = {
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        id: "quem-somos",
        heading: "1. Who we are",
        blocks: [
          {
            type: "p",
            text: 'Fuente Price Pro ("we", "the platform") is a portfolio valuation and passive-income engineering tool, offered by Paulo Fuentealba as an individual, until it is eventually formalized as a legal entity — this section will be updated when that happens. This policy explains what personal data we collect, why, and what rights you have over it, in compliance with Brazil\'s General Data Protection Law (LGPD, Law No. 13,709/2018) and, where applicable, the GDPR for EU users.',
          },
          {
            type: "p",
            text: `Data Protection Officer / contact: Paulo Fuentealba — ${LEGAL_CONTACT_EMAIL}. As a small-scale data processing agent (individual/early-stage startup), the founder holds this role directly — a common and permitted practice at this scale.`,
          },
        ],
      },
      {
        id: "dados-conta",
        heading: "2.1 Account data",
        blocks: [
          {
            type: "list",
            items: [
              "Name, email and profile photo (via Google login or email/password, Firebase Authentication).",
              "Full name, phone number and location (optional, if you fill them in under Settings → Profile).",
            ],
          },
        ],
      },
      {
        id: "dados-portfolio",
        heading: "2.2 Portfolio data (the core of the service)",
        blocks: [
          {
            type: "list",
            items: [
              "Assets you add to your watchlist (ticker, type, class).",
              "Transactions you record (buy/sell, date, quantity, price, fees).",
              "Personal goals (target yield, monthly spending goal, estimated monthly contribution) — used to calculate your financial independence progress.",
              "Answers to the investor profile questionnaire (if you fill it in), used only to personalize recommendations within the app.",
            ],
          },
        ],
      },
      {
        id: "dados-tecnicos",
        heading: "2.3 Minimal technical data",
        blocks: [
          {
            type: "list",
            items: [
              "Access timestamps and session identifiers from Firebase Authentication, needed to keep you securely signed in.",
            ],
          },
          {
            type: "p",
            text: "What we do NOT collect today: tracking/analytics cookies, third-party advertising, or any browsing data outside the app itself. If this changes (e.g. we enable analytics tools to understand product usage), you will be notified via a specific consent banner before any such collection begins.",
          },
        ],
      },
      {
        id: "base-legal",
        heading: "3. Why we collect it (legal basis)",
        blocks: [
          {
            type: "list",
            items: [
              "Contract performance (Art. 7, V, LGPD): account and portfolio data are collected because they ARE the service — without them we cannot calculate your Ceiling Price, project your passive income, or show your portfolio history.",
              "Consent (Art. 7, I, LGPD): optional data (phone, location, investor profile questionnaire) and any future collection of non-essential analytics/cookies depend on your explicit consent, which can be revoked at any time.",
            ],
          },
        ],
      },
      {
        id: "compartilhamento",
        heading: "4. Who we share it with",
        blocks: [
          {
            type: "list",
            items: [
              "Google Cloud / Firebase (authentication and database storage) — acts as a data processor, under contract, following Google Cloud's security standards. Servers may be located outside Brazil (Google Cloud's global infrastructure); this international transfer follows Google Cloud's standard contractual safeguards for LGPD/GDPR compliance.",
              "Market data sources (Brapi, Yahoo Finance, SEC EDGAR, CVM, Banco Central do Brasil): we query these sources to fetch prices and fundamentals of public assets — we never send your personal or portfolio data to these sources, we only look up public market information using the ticker you search for.",
              "We do not sell or share your data with third parties for advertising purposes.",
            ],
          },
        ],
      },
      {
        id: "seus-direitos",
        heading: "5. Your rights (Art. 18, LGPD)",
        blocks: [
          {
            type: "p",
            text: "At any time, under Settings → Privacy, you can:",
          },
          {
            type: "list",
            items: [
              "Export your data (full CSV backup) before taking any other action.",
              "Permanently delete your account — removes all your personal and portfolio data from our servers (right to erasure), an irreversible action.",
            ],
          },
          {
            type: "p",
            text: "You may also, at any time, write to the Data Protection Officer's email (section 1) to: confirm what data we hold about you, correct inaccurate data, or ask questions about this document.",
          },
        ],
      },
      {
        id: "retencao",
        heading: "6. Data retention",
        blocks: [
          {
            type: "p",
            text: "We keep your data for as long as your account is active. When you delete your account via Settings → Privacy → Delete Account, your personal and portfolio data is permanently erased from our servers.",
          },
        ],
      },
      {
        id: "seguranca",
        heading: "7. Security",
        blocks: [
          {
            type: "p",
            text: "Data is stored in Firebase/Firestore with security rules that prevent any user from accessing another user's data. Write access to sensitive settings (e.g. subscription tier) is restricted to the backend and can never be written directly from the browser.",
          },
        ],
      },
      {
        id: "alteracoes",
        heading: "8. Changes to this policy",
        blocks: [
          {
            type: "p",
            text: "If we change relevant data collection practices (e.g. adding analytics), we will update this page and, when applicable, show a new consent notice before the change takes effect.",
          },
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    sections: [
      {
        id: "aceitacao",
        heading: "1. Acceptance",
        blocks: [
          {
            type: "p",
            text: "By creating an account or using Fuente Price Pro, you agree to these Terms of Use and to our {{privacyLink}}.",
          },
        ],
      },
      {
        id: "o-que-e",
        heading: "2. What the service is",
        blocks: [
          {
            type: "p",
            text: "Fuente Price Pro is an educational and quantitative analysis tool for dividend investors, covering the Brazilian (B3) and US markets. We offer: Ceiling Price calculation (Bazin, Graham, Gordon models), portfolio tracking, dividend cash-flow projection, and simulation tools.",
          },
        ],
      },
      {
        id: "nao-e-aconselhamento",
        heading: "3. This is NOT investment advice",
        blocks: [
          {
            type: "p",
            text: "This is the single most important point in these Terms. Nothing in Fuente Price Pro constitutes a recommendation, endorsement, securities analysis, or formal tax/accounting opinion. All projections, calculations, and valuation consensus figures are based on historical data and mathematical models — they are not a guarantee of future results. The final capital allocation decision is entirely your responsibility.",
          },
          {
            type: "p",
            text: "Consult a certified professional (a licensed securities analyst or financial planner) before making investment decisions.",
          },
        ],
      },
      {
        id: "sua-conta",
        heading: "4. Your account",
        blocks: [
          {
            type: "list",
            items: [
              "You are responsible for keeping your account credentials confidential.",
              "The portfolio data you enter (assets, transactions, amounts) is your responsibility to keep accurate — the platform calculates based on what you provide.",
              "The limits and features available between the Free and Pro plans may change as the product evolves; the limits in force are always the ones shown inside the platform at the time of use.",
            ],
          },
        ],
      },
      {
        id: "uso-aceitavel",
        heading: "5. Acceptable use",
        blocks: [
          { type: "p", text: "You agree not to:" },
          {
            type: "list",
            items: [
              "Attempt to access other users' data.",
              "Use the platform for illegal or fraudulent purposes.",
              "Reverse-engineer or attempt to extract the proprietary calculation models through automated, large-scale scraping.",
            ],
          },
        ],
      },
      {
        id: "propriedade-intelectual",
        heading: "6. Intellectual property",
        blocks: [
          {
            type: "p",
            text: "The code, design, brand, and valuation methodology of Fuente Price Pro are owned by Paulo Fuentealba (as an individual, until eventually formalized as a legal entity). The market data displayed (prices, fundamentals) is obtained from public/third-party sources (B3, SEC, Yahoo Finance, Banco Central do Brasil) and remains the property of their respective sources.",
          },
        ],
      },
      {
        id: "limitacao-responsabilidade",
        heading: "7. Limitation of liability",
        blocks: [
          {
            type: "p",
            text: 'To the maximum extent permitted by law, Fuente Price Pro is not liable for financial losses resulting from investment decisions made based on information from the platform. The service is provided "as is", without any guarantee of uninterrupted availability or the absence of errors in third-party market data.',
          },
        ],
      },
      {
        id: "cancelamento",
        heading: "8. Cancellation",
        blocks: [
          {
            type: "p",
            text: "You can delete your account at any time under Settings → Privacy. Paid Pro subscriptions follow the cancellation terms described on the subscription screen at the time of purchase.",
          },
        ],
      },
      {
        id: "alteracoes-termos",
        heading: "9. Changes to these Terms",
        blocks: [
          {
            type: "p",
            text: "We may update these Terms periodically. Material changes will be communicated via a notice on the platform.",
          },
        ],
      },
      {
        id: "contato",
        heading: "10. Contact",
        blocks: [
          {
            type: "p",
            text: `Questions about these Terms: ${LEGAL_CONTACT_EMAIL} (same contact email as the Privacy Policy).`,
          },
        ],
      },
    ],
  },
};

const es: LegalContent = {
  privacy: {
    title: "Política de Privacidad",
    sections: [
      {
        id: "quem-somos",
        heading: "1. Quiénes somos",
        blocks: [
          {
            type: "p",
            text: 'Fuente Price Pro ("nosotros", "la plataforma") es una herramienta de valuación de cartera e ingeniería de renta pasiva, ofrecida por Paulo Fuentealba, persona física, hasta la eventual formalización como persona jurídica — esta sección se actualizará cuando eso ocurra. Esta política explica qué datos personales recopilamos, por qué, y qué derechos tiene usted sobre ellos, en conformidad con la Ley General de Protección de Datos de Brasil (LGPD, Ley n.º 13.709/2018) y, cuando corresponda, el RGPD para usuarios de la UE.',
          },
          {
            type: "p",
            text: `Encargado de datos / contacto: Paulo Fuentealba — ${LEGAL_CONTACT_EMAIL}. Como agente de tratamiento de pequeña escala (persona física/startup en etapa inicial), el fundador asume esta función directamente — práctica habitual y permitida para operaciones de este tamaño.`,
          },
        ],
      },
      {
        id: "dados-conta",
        heading: "2.1 Datos de cuenta",
        blocks: [
          {
            type: "list",
            items: [
              "Nombre, correo electrónico y foto de perfil (mediante inicio de sesión con Google o correo/contraseña, Firebase Authentication).",
              "Nombre completo, teléfono y ubicación (opcionales, si los completa en Configuración → Perfil).",
            ],
          },
        ],
      },
      {
        id: "dados-portfolio",
        heading: "2.2 Datos de cartera (el núcleo del servicio)",
        blocks: [
          {
            type: "list",
            items: [
              "Activos que agrega a su lista de seguimiento (ticker, tipo, clase).",
              "Transacciones que registra (compra/venta, fecha, cantidad, precio, comisiones).",
              "Metas personales (yield objetivo, meta de gastos mensuales, aporte mensual estimado) — usadas para calcular su progreso hacia la independencia financiera.",
              "Respuestas al cuestionario de perfil de inversor (si lo completa), usadas solo para personalizar recomendaciones dentro de la aplicación.",
            ],
          },
        ],
      },
      {
        id: "dados-tecnicos",
        heading: "2.3 Datos técnicos mínimos",
        blocks: [
          {
            type: "list",
            items: [
              "Registro de fecha/hora de acceso e identificadores de sesión de Firebase Authentication, necesarios para mantenerlo conectado de forma segura.",
            ],
          },
          {
            type: "p",
            text: "Lo que NO recopilamos hoy: cookies de seguimiento/analítica, publicidad de terceros, o cualquier dato de navegación fuera de la propia aplicación. Si esto cambia (por ejemplo, si activamos herramientas de analítica para entender el uso del producto), se le avisará mediante un banner de consentimiento específico antes de que comience cualquier recopilación de ese tipo.",
          },
        ],
      },
      {
        id: "base-legal",
        heading: "3. Por qué los recopilamos (base legal)",
        blocks: [
          {
            type: "list",
            items: [
              "Ejecución de contrato (Art. 7, V, LGPD): los datos de cuenta y cartera se recopilan porque son el servicio en sí mismo — sin ellos no podemos calcular su Precio Techo, proyectar su renta pasiva, o mostrar su historial de cartera.",
              "Consentimiento (Art. 7, I, LGPD): los datos opcionales (teléfono, ubicación, cuestionario de perfil de inversor) y cualquier recopilación futura de analítica/cookies no esenciales dependen de su consentimiento explícito, que puede revocarse en cualquier momento.",
            ],
          },
        ],
      },
      {
        id: "compartilhamento",
        heading: "4. Con quién compartimos",
        blocks: [
          {
            type: "list",
            items: [
              "Google Cloud / Firebase (autenticación y almacenamiento de la base de datos) — actúa como operador de datos, bajo contrato, siguiendo los estándares de seguridad de Google Cloud. Los servidores pueden estar ubicados fuera de Brasil (infraestructura global de Google Cloud); esta transferencia internacional sigue las salvaguardas contractuales estándar de Google Cloud para el cumplimiento de LGPD/RGPD.",
              "Fuentes de datos de mercado (Brapi, Yahoo Finance, SEC EDGAR, CVM, Banco Central de Brasil): consultamos estas fuentes para obtener precios y fundamentos de activos públicos — nunca enviamos sus datos personales o de cartera a estas fuentes, solo consultamos información de mercado pública usando el ticker que usted busca.",
              "No vendemos ni compartimos sus datos con terceros con fines publicitarios.",
            ],
          },
        ],
      },
      {
        id: "seus-direitos",
        heading: "5. Sus derechos (Art. 18, LGPD)",
        blocks: [
          {
            type: "p",
            text: "En cualquier momento, en Configuración → Privacidad, usted puede:",
          },
          {
            type: "list",
            items: [
              "Exportar sus datos (copia de seguridad completa en CSV) antes de cualquier otra acción.",
              "Eliminar su cuenta permanentemente — elimina todos sus datos personales y de cartera de nuestros servidores (derecho al olvido), acción irreversible.",
            ],
          },
          {
            type: "p",
            text: "También puede, en cualquier momento, escribir al correo del Encargado (sección 1) para: confirmar qué datos tenemos sobre usted, corregir datos incorrectos, o resolver dudas sobre este documento.",
          },
        ],
      },
      {
        id: "retencao",
        heading: "6. Retención de datos",
        blocks: [
          {
            type: "p",
            text: "Mantenemos sus datos mientras su cuenta esté activa. Al eliminar su cuenta mediante el flujo de Configuración → Privacidad → Eliminar Cuenta, sus datos personales y de cartera se borran permanentemente de nuestros servidores.",
          },
        ],
      },
      {
        id: "seguranca",
        heading: "7. Seguridad",
        blocks: [
          {
            type: "p",
            text: "Los datos se almacenan en Firebase/Firestore con reglas de seguridad que impiden que cualquier usuario acceda a los datos de otro usuario. El acceso de escritura a configuraciones sensibles (por ejemplo, el nivel de suscripción) está restringido al backend y nunca puede escribirse directamente desde el navegador.",
          },
        ],
      },
      {
        id: "alteracoes",
        heading: "8. Cambios en esta política",
        blocks: [
          {
            type: "p",
            text: "Si cambiamos prácticas relevantes de recopilación de datos (por ejemplo, si agregamos analítica), actualizaremos esta página y, cuando corresponda, mostraremos un nuevo aviso de consentimiento antes de que el cambio entre en vigor.",
          },
        ],
      },
    ],
  },
  terms: {
    title: "Términos de Uso",
    sections: [
      {
        id: "aceitacao",
        heading: "1. Aceptación",
        blocks: [
          {
            type: "p",
            text: "Al crear una cuenta o usar Fuente Price Pro, usted acepta estos Términos de Uso y nuestra {{privacyLink}}.",
          },
        ],
      },
      {
        id: "o-que-e",
        heading: "2. Qué es el servicio",
        blocks: [
          {
            type: "p",
            text: "Fuente Price Pro es una herramienta educativa y de análisis cuantitativo para inversores de dividendos, que cubre los mercados brasileño (B3) y estadounidense. Ofrecemos: cálculo de Precio Techo (modelos Bazin, Graham, Gordon), seguimiento de cartera, proyección de flujo de caja de dividendos, y herramientas de simulación.",
          },
        ],
      },
      {
        id: "nao-e-aconselhamento",
        heading: "3. Esto NO es asesoramiento de inversión",
        blocks: [
          {
            type: "p",
            text: "Este es el punto más importante de estos Términos. Nada en Fuente Price Pro constituye una recomendación, indicación, análisis de valores mobiliarios o dictamen fiscal/tributario formal. Todas las proyecciones, cálculos y consensos de valuación se basan en datos históricos y modelos matemáticos — no son garantía de resultados futuros. La decisión final de asignación de capital es enteramente su responsabilidad.",
          },
          {
            type: "p",
            text: "Consulte a un profesional certificado (analista autorizado, planificador financiero) antes de tomar decisiones de inversión.",
          },
        ],
      },
      {
        id: "sua-conta",
        heading: "4. Su cuenta",
        blocks: [
          {
            type: "list",
            items: [
              "Usted es responsable de mantener la confidencialidad de su cuenta.",
              "Los datos de cartera que usted ingresa (activos, transacciones, valores) son de su responsabilidad en cuanto a su exactitud — la plataforma calcula en base a lo que usted informa.",
              "Los límites y funciones disponibles entre los planes Gratuito y Pro pueden variar conforme evoluciona el producto; los límites vigentes son siempre los que se muestran dentro de la propia plataforma en el momento del uso.",
            ],
          },
        ],
      },
      {
        id: "uso-aceitavel",
        heading: "5. Uso aceptable",
        blocks: [
          { type: "p", text: "Usted se compromete a no:" },
          {
            type: "list",
            items: [
              "Intentar acceder a los datos de otros usuarios.",
              "Usar la plataforma con fines ilegales o fraudulentos.",
              "Realizar ingeniería inversa o intentar extraer los modelos de cálculo propietarios de forma automatizada y a gran escala.",
            ],
          },
        ],
      },
      {
        id: "propriedade-intelectual",
        heading: "6. Propiedad intelectual",
        blocks: [
          {
            type: "p",
            text: "El código, diseño, marca y metodología de valuación de Fuente Price Pro son propiedad de Paulo Fuentealba (persona física, hasta la eventual formalización como persona jurídica). Los datos de mercado mostrados (precios, fundamentos) se obtienen de fuentes públicas/terceros (B3, SEC, Yahoo Finance, Banco Central de Brasil) y permanecen como propiedad de sus respectivas fuentes.",
          },
        ],
      },
      {
        id: "limitacao-responsabilidade",
        heading: "7. Limitación de responsabilidad",
        blocks: [
          {
            type: "p",
            text: 'En la máxima medida permitida por la ley, Fuente Price Pro no se responsabiliza por pérdidas financieras derivadas de decisiones de inversión tomadas en base a la información de la plataforma. El servicio se proporciona "tal cual", sin garantía de disponibilidad ininterrumpida ni de ausencia de errores en los datos de mercado de terceros.',
          },
        ],
      },
      {
        id: "cancelamento",
        heading: "8. Cancelación",
        blocks: [
          {
            type: "p",
            text: "Usted puede eliminar su cuenta en cualquier momento en Configuración → Privacidad. Las suscripciones Pro pagas siguen los términos de cancelación descritos en la pantalla de suscripción en el momento de la contratación.",
          },
        ],
      },
      {
        id: "alteracoes-termos",
        heading: "9. Cambios en estos Términos",
        blocks: [
          {
            type: "p",
            text: "Podemos actualizar estos Términos periódicamente. Los cambios materiales se comunicarán mediante un aviso en la plataforma.",
          },
        ],
      },
      {
        id: "contato",
        heading: "10. Contacto",
        blocks: [
          {
            type: "p",
            text: `Dudas sobre estos Términos: ${LEGAL_CONTACT_EMAIL} (mismo correo de contacto que la Política de Privacidad).`,
          },
        ],
      },
    ],
  },
};

export const legalContent: Record<Locale, LegalContent> = { ptBR, en, es };
