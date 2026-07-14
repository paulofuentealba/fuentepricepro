import { Resend } from 'resend';

// Inicializa a Resend com a chave da variável de ambiente.
// Se não existir (desenvolvimento local), ela será undefined, e nós faremos um "mock" (simulação) dos envios.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// E-mail padrão do sistema
const DEFAULT_FROM = 'Fuente Price Pro <noreply@fuentepricepro.com>';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Serviço centralizado de envio de E-mails
 */
export const emailService = {
  /**
   * Envia um e-mail genérico
   */
  async sendEmail({ to, subject, html }: SendEmailOptions) {
    if (!resend) {
      // Em ambiente de desenvolvimento local (sem chave de API), apenas imprime no console para debug
      console.log('--- 📧 SIMULAÇÃO DE ENVIO DE E-MAIL (LOCAL) ---');
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Conteúdo HTML: ${html}`);
      console.log('-----------------------------------------------');
      return { id: 'mock-id-local-dev' };
    }

    try {
      const data = await resend.emails.send({
        from: DEFAULT_FROM,
        to,
        subject,
        html,
      });
      return data;
    } catch (error) {
      console.error('Erro ao enviar e-mail via Resend:', error);
      throw error;
    }
  },

  /**
   * Template: E-mail de Boas-Vindas
   */
  async sendWelcomeEmail(to: string, userName: string) {
    const subject = 'Bem-vindo ao Fuente Price Pro! 🚀';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Olá, ${userName}!</h2>
        <p>Estamos muito felizes em ter você no <strong>Fuente Price Pro</strong>.</p>
        <p>A partir de agora, você tem em mãos a ferramenta mais poderosa para Valuation e Engenharia de Renda Passiva.</p>
        <br/>
        <p>Comece calculando o Preço Teto do seu primeiro ativo!</p>
        <p>Abraços,<br/>Equipe Fuente</p>
      </div>
    `;
    return this.sendEmail({ to, subject, html });
  },

  /**
   * Template: Recuperação de Senha
   */
  async sendPasswordReset(to: string, resetLink: string) {
    const subject = 'Recuperação de Senha - Fuente Price Pro';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou a redefinição da sua senha.</p>
        <p>Clique no link abaixo para criar uma nova senha:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #fff; text-decoration: none; border-radius: 5px;">Redefinir Senha</a>
        <br/><br/>
        <p>Se você não solicitou isso, pode ignorar este e-mail em segurança.</p>
      </div>
    `;
    return this.sendEmail({ to, subject, html });
  }
};
