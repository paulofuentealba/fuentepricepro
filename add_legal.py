import sys

filepath = r'C:\Users\paulo\OneDrive\Fuente Price Pro\src\lib\legal-content.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update interface
content = content.replace(
    '  terms: LegalDocument;\n}',
    '  terms: LegalDocument;\n  subscriptionTerms: LegalDocument;\n}'
)

ptBR_str = '''  subscriptionTerms: {
    title: "Termos de Assinatura",
    sections: [
      {
        id: "aviso",
        heading: "Aviso",
        blocks: [{ type: "p", text: "Sujeito a alterações: Rascunho de trabalho — requer revisão de advogado humano antes de publicação final." }]
      },
      {
        id: "objeto",
        heading: "1. Objeto",
        blocks: [{ type: "p", text: "Estes Termos de Assinatura regem a contratação do plano pago (\\\"Pro\\\") do Fuente Price Pro, complementando os Termos de Uso gerais. Ao assinar o plano Pro, o usuário concorda com as condições abaixo." }]
      },
      {
        id: "planos",
        heading: "2. Planos e cobrança",
        blocks: [
          { type: "p", text: "2.1. O Fuente Price Pro oferece um plano gratuito (\\\"Free\\\"), com limite de ativos monitorados, e um plano pago (\\\"Pro\\\"), com acesso completo às funcionalidades descritas na página de preços." },
          { type: "p", text: "2.2. A cobrança do plano Pro é recorrente, processada via Stripe, nas periodicidades e valores exibidos no momento da contratação (mensal e/ou anual)." },
          { type: "p", text: "2.3. Sem período de teste gratuito / Com período de teste a ser definido, cobrado automaticamente ao final salvo cancelamento." }
        ]
      },
      {
        id: "cancelamento",
        heading: "3. Cancelamento",
        blocks: [
          { type: "p", text: "3.1. O usuário pode cancelar a assinatura a qualquer momento, em Configurações → Assinatura, sem necessidade de contato com suporte." },
          { type: "p", text: "3.2. O cancelamento interrompe a renovação automática. O acesso ao plano Pro permanece ativo até o fim do período já pago." },
          { type: "p", text: "3.3. Reembolso a ser definido conforme direito de arrependimento do CDC." }
        ]
      },
      {
        id: "efeito-downgrade",
        heading: "4. Efeito do cancelamento/downgrade sobre os dados",
        blocks: [
          { type: "p", text: "4.1. Ao encerrar o plano Pro (por cancelamento ou inadimplência), a conta retorna ao plano Free. Posições e transações que excedam o limite do plano Free permanecem armazenadas, porém com visualização/edição restrita até nova assinatura ou exclusão manual pelo usuário." },
          { type: "p", text: "4.2. Em nenhuma hipótese o downgrade resulta em exclusão automática de dados do usuário — exclusão só ocorre por ação explícita do usuário (Configurações → Privacidade → Excluir Conta)." }
        ]
      },
      {
        id: "reajuste",
        heading: "5. Reajuste de preço",
        blocks: [{ type: "p", text: "5.1. Qualquer reajuste de valor para assinantes ativos será comunicado com no mínimo 30 dias de antecedência, por e-mail e/ou aviso no aplicativo, antes de entrar em vigor na próxima renovação." }]
      },
      {
        id: "dados-pagamento",
        heading: "6. Dados de pagamento e transferência internacional",
        blocks: [
          { type: "p", text: "6.1. O processamento de pagamentos é feito pelo Stripe, que pode processar dados (nome, e-mail, forma de pagamento) em servidores fora do Brasil. Essa transferência internacional é amparada pela documentação contratual do Stripe." },
          { type: "p", text: "6.2. O Fuente Price Pro não armazena dados completos de cartão de crédito — o processamento é feito diretamente pelo Stripe." }
        ]
      },
      {
        id: "disclaimer",
        heading: "7. Natureza do serviço — Disclaimer regulatório",
        blocks: [{ type: "p", text: "7.1. O Fuente Price Pro é uma ferramenta de consolidação de dados e apoio à decisão. As informações, cálculos e projeções gerados pela plataforma não constituem recomendação, aconselhamento ou indicação de investimento. A decisão final de alocação de capital é de responsabilidade exclusiva do usuário." }]
      }
    ]
  }'''

en_str = '''  subscriptionTerms: {
    title: "Subscription Terms",
    sections: [
      {
        id: "aviso",
        heading: "Notice",
        blocks: [{ type: "p", text: "Subject to change: Working draft — requires human legal review before final publication." }]
      },
      {
        id: "objeto",
        heading: "1. Purpose",
        blocks: [{ type: "p", text: "These Subscription Terms govern the contracting of the paid plan (\\\"Pro\\\") of Fuente Price Pro, complementing the general Terms of Use. By subscribing to the Pro plan, the user agrees to the conditions below." }]
      },
      {
        id: "planos",
        heading: "2. Plans and Billing",
        blocks: [
          { type: "p", text: "2.1. Fuente Price Pro offers a free plan (\\\"Free\\\") with a limit on monitored assets, and a paid plan (\\\"Pro\\\") with full access to the features described on the pricing page." },
          { type: "p", text: "2.2. The Pro plan billing is recurring, processed via Stripe, in the periodicities and amounts displayed at the time of contracting (monthly and/or annual)." },
          { type: "p", text: "2.3. No free trial period / With a trial period to be defined, charged automatically at the end unless canceled." }
        ]
      },
      {
        id: "cancelamento",
        heading: "3. Cancellation",
        blocks: [
          { type: "p", text: "3.1. The user may cancel the subscription at any time in Settings → Subscription, without needing to contact support." },
          { type: "p", text: "3.2. Cancellation stops automatic renewal. Access to the Pro plan remains active until the end of the already paid period." },
          { type: "p", text: "3.3. Refund to be defined according to the withdrawal right of the consumer protection code." }
        ]
      },
      {
        id: "efeito-downgrade",
        heading: "4. Effect of cancellation/downgrade on data",
        blocks: [
          { type: "p", text: "4.1. Upon ending the Pro plan (due to cancellation or default), the account returns to the Free plan. Positions and transactions exceeding the Free plan limit remain stored, but with restricted viewing/editing until a new subscription or manual deletion by the user." },
          { type: "p", text: "4.2. Under no circumstances does a downgrade result in automatic deletion of user data — deletion only occurs by explicit action of the user (Settings → Privacy → Delete Account)." }
        ]
      },
      {
        id: "reajuste",
        heading: "5. Price adjustment",
        blocks: [{ type: "p", text: "5.1. Any price adjustment for active subscribers will be communicated at least 30 days in advance, by e-mail and/or in-app notice, before taking effect on the next renewal." }]
      },
      {
        id: "dados-pagamento",
        heading: "6. Payment data and international transfer",
        blocks: [
          { type: "p", text: "6.1. Payment processing is done by Stripe, which may process data (name, email, payment method) on servers outside your country. This international transfer is supported by Stripe's contractual documentation." },
          { type: "p", text: "6.2. Fuente Price Pro does not store full credit card data — processing is done directly by Stripe." }
        ]
      },
      {
        id: "disclaimer",
        heading: "7. Nature of service — Regulatory Disclaimer",
        blocks: [{ type: "p", text: "7.1. Fuente Price Pro is a data consolidation and decision support tool. The information, calculations, and projections generated by the platform do not constitute investment recommendations, advice, or indications. The final decision on capital allocation is the sole responsibility of the user." }]
      }
    ]
  }'''

es_str = '''  subscriptionTerms: {
    title: "Términos de Suscripción",
    sections: [
      {
        id: "aviso",
        heading: "Aviso",
        blocks: [{ type: "p", text: "Sujeto a cambios: Borrador de trabajo — requiere revisión legal humana antes de su publicación final." }]
      },
      {
        id: "objeto",
        heading: "1. Objeto",
        blocks: [{ type: "p", text: "Estos Términos de Suscripción rigen la contratación del plan de pago (\\\"Pro\\\") de Fuente Price Pro, complementando los Términos de Uso generales. Al suscribirse al plan Pro, el usuario acepta las condiciones a continuación." }]
      },
      {
        id: "planos",
        heading: "2. Planes y facturación",
        blocks: [
          { type: "p", text: "2.1. Fuente Price Pro ofrece un plan gratuito (\\\"Free\\\"), con límite de activos monitoreados, y un plan de pago (\\\"Pro\\\"), con acceso completo a las funciones descritas en la página de precios." },
          { type: "p", text: "2.2. El cobro del plan Pro es recurrente, procesado vía Stripe, en las periodicidades y valores mostrados en el momento de la contratación (mensual y/o anual)." },
          { type: "p", text: "2.3. Sin período de prueba gratuito / Con período de prueba a definir, cobrado automáticamente al final salvo cancelación." }
        ]
      },
      {
        id: "cancelamento",
        heading: "3. Cancelación",
        blocks: [
          { type: "p", text: "3.1. El usuario puede cancelar la suscripción en cualquier momento, en Configuración → Suscripción, sin necesidad de contactar al soporte." },
          { type: "p", text: "3.2. La cancelación detiene la renovación automática. El acceso al plan Pro permanece activo hasta el final del período ya pagado." },
          { type: "p", text: "3.3. Reembolso a definir según el derecho de desistimiento del código de defensa del consumidor." }
        ]
      },
      {
        id: "efeito-downgrade",
        heading: "4. Efecto de cancelación/downgrade sobre los datos",
        blocks: [
          { type: "p", text: "4.1. Al terminar el plan Pro (por cancelación o impago), la cuenta vuelve al plan Free. Las posiciones y transacciones que excedan el límite del plan Free permanecen almacenadas, pero con visualización/edición restringida hasta una nueva suscripción o eliminación manual por el usuario." },
          { type: "p", text: "4.2. En ningún caso el downgrade resulta en eliminación automática de los datos del usuario — la eliminación solo ocurre por acción explícita del usuario (Configuración → Privacidad → Eliminar Cuenta)." }
        ]
      },
      {
        id: "reajuste",
        heading: "5. Ajuste de precios",
        blocks: [{ type: "p", text: "5.1. Cualquier ajuste de valor para suscriptores activos se comunicará con al menos 30 días de antelación, por correo electrónico y/o aviso en la aplicación, antes de entrar en vigor en la próxima renovación." }]
      },
      {
        id: "dados-pagamento",
        heading: "6. Datos de pago y transferencia internacional",
        blocks: [
          { type: "p", text: "6.1. El procesamiento de pagos lo realiza Stripe, que puede procesar datos (nombre, correo electrónico, forma de pago) en servidores fuera de su país. Esta transferencia internacional está respaldada por la documentación contractual de Stripe." },
          { type: "p", text: "6.2. Fuente Price Pro no almacena datos completos de tarjetas de crédito — el procesamiento se realiza directamente a través de Stripe." }
        ]
      },
      {
        id: "disclaimer",
        heading: "7. Naturaleza del servicio — Disclaimer Regulatorio",
        blocks: [{ type: "p", text: "7.1. Fuente Price Pro es una herramienta de consolidación de datos y apoyo a la decisión. La información, cálculos y proyecciones generadas por la plataforma no constituyen recomendaciones, consejos ni indicaciones de inversión. La decisión final de asignación de capital es responsabilidad exclusiva del usuario." }]
      }
    ]
  }'''


content = content.replace(
    '  terms: {\n    title: "Termos de Uso",',
    ptBR_str + ',\n  terms: {\n    title: "Termos de Uso",'
)

content = content.replace(
    '  terms: {\n    title: "Terms of Use",',
    en_str + ',\n  terms: {\n    title: "Terms of Use",'
)

content = content.replace(
    '  terms: {\n    title: "Términos de Uso",',
    es_str + ',\n  terms: {\n    title: "Términos de Uso",'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
