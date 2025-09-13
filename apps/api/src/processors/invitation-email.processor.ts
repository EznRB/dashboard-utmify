import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../services/prisma.service';
import { TenantDatabaseService } from '../services/tenant-database.service';
import { UserRole } from '@prisma/client';

interface InvitationEmailJobData {
  invitationId: string;
  email: string;
  organizationName: string;
  inviterName: string;
  role: UserRole;
  token: string;
  customMessage?: string;
  expiresAt: Date;
}

interface ResendInvitationJobData {
  invitationId: string;
  email: string;
  organizationName: string;
  inviterName: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
}

interface InvitationAcceptedJobData {
  inviterEmail: string;
  inviterName?: string;
  acceptedUserName: string;
  acceptedUserEmail: string;
  organizationName: string;
}

@Injectable()
@Processor('email')
export class InvitationEmailProcessor {
  private readonly logger = new Logger(InvitationEmailProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabaseService: TenantDatabaseService,
  ) {}

  @Process('send-invitation')
  async handleSendInvitation(job: Job<InvitationEmailJobData>): Promise<void> {
    const { data } = job;
    
    try {
      this.logger.log(`Processing invitation email for ${data.email}`);

      // Aqui você integraria com seu provedor de email (SendGrid, AWS SES, etc.)
      // Por enquanto, vamos simular o envio
      const emailContent = this.generateInvitationEmailContent(data);
      
      // Simular envio de email
      await this.simulateEmailSend({
        to: data.email,
        subject: `Convite para ${data.organizationName}`,
        html: emailContent,
      });

      // Registrar log de email enviado
      await this.logEmailSent({
        type: 'invitation',
        recipient: data.email,
        invitationId: data.invitationId,
        status: 'sent',
      });

      this.logger.log(`Invitation email sent successfully to ${data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${data.email}: ${error.message}`,
        error.stack,
      );
      
      // Registrar log de erro
      await this.logEmailSent({
        type: 'invitation',
        recipient: data.email,
        invitationId: data.invitationId,
        status: 'failed',
        error: error.message,
      });
      
      throw error;
    }
  }

  @Process('resend-invitation')
  async handleResendInvitation(job: Job<ResendInvitationJobData>): Promise<void> {
    const { data } = job;
    
    try {
      this.logger.log(`Processing resend invitation email for ${data.email}`);

      const emailContent = this.generateResendInvitationEmailContent(data);
      
      await this.simulateEmailSend({
        to: data.email,
        subject: `Lembrete: Convite para ${data.organizationName}`,
        html: emailContent,
      });

      await this.logEmailSent({
        type: 'invitation-resend',
        recipient: data.email,
        invitationId: data.invitationId,
        status: 'sent',
      });

      this.logger.log(`Resend invitation email sent successfully to ${data.email}`);
    } catch (error) {
      this.logger.error(
        `Failed to resend invitation email to ${data.email}: ${error.message}`,
        error.stack,
      );
      
      await this.logEmailSent({
        type: 'invitation-resend',
        recipient: data.email,
        invitationId: data.invitationId,
        status: 'failed',
        error: error.message,
      });
      
      throw error;
    }
  }

  @Process('invitation-accepted')
  async handleInvitationAccepted(job: Job<InvitationAcceptedJobData>): Promise<void> {
    const { data } = job;
    
    try {
      this.logger.log(`Processing invitation accepted notification for ${data.inviterEmail}`);

      const emailContent = this.generateInvitationAcceptedEmailContent(data);
      
      await this.simulateEmailSend({
        to: data.inviterEmail,
        subject: `${data.acceptedUserName} aceitou seu convite para ${data.organizationName}`,
        html: emailContent,
      });

      await this.logEmailSent({
        type: 'invitation-accepted',
        recipient: data.inviterEmail,
        status: 'sent',
      });

      this.logger.log(`Invitation accepted notification sent to ${data.inviterEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invitation accepted notification to ${data.inviterEmail}: ${error.message}`,
        error.stack,
      );
      
      await this.logEmailSent({
        type: 'invitation-accepted',
        recipient: data.inviterEmail,
        status: 'failed',
        error: error.message,
      });
      
      throw error;
    }
  }

  private generateInvitationEmailContent(data: InvitationEmailJobData): string {
    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${data.token}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/reject-invitation?token=${data.token}`;
    
    const roleTranslations = {
      [UserRole.OWNER]: 'Proprietário',
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.USER]: 'Usuário',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Convite para ${data.organizationName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .accept { background: #28a745; color: white; }
          .reject { background: #dc3545; color: white; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .expires { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Convite para ${data.organizationName}</h1>
          </div>
          
          <div class="content">
            <p>Olá!</p>
            
            <p><strong>${data.inviterName}</strong> convidou você para fazer parte da organização <strong>${data.organizationName}</strong> como <strong>${roleTranslations[data.role]}</strong>.</p>
            
            ${data.customMessage ? `
              <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Mensagem personalizada:</strong></p>
                <p style="font-style: italic;">${data.customMessage}</p>
              </div>
            ` : ''}
            
            <div class="expires">
              <strong>⏰ Este convite expira em:</strong> ${new Date(data.expiresAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            <p>Para aceitar este convite, clique no botão abaixo:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" class="button accept">Aceitar Convite</a>
              <a href="${rejectUrl}" class="button reject">Rejeitar Convite</a>
            </div>
            
            <p><small>Se os botões não funcionarem, copie e cole este link no seu navegador:</small></p>
            <p><small><a href="${acceptUrl}">${acceptUrl}</a></small></p>
          </div>
          
          <div class="footer">
            <p>Este email foi enviado automaticamente. Se você não esperava este convite, pode ignorá-lo com segurança.</p>
            <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateResendInvitationEmailContent(data: ResendInvitationJobData): string {
    const acceptUrl = `${process.env.FRONTEND_URL}/accept-invitation?token=${data.token}`;
    const rejectUrl = `${process.env.FRONTEND_URL}/reject-invitation?token=${data.token}`;
    
    const roleTranslations = {
      [UserRole.OWNER]: 'Proprietário',
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.USER]: 'Usuário',
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lembrete: Convite para ${data.organizationName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ffc107; color: #212529; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 5px; font-weight: bold; }
          .accept { background: #28a745; color: white; }
          .reject { background: #dc3545; color: white; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .expires { background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Lembrete: Convite Pendente</h1>
            <h2>${data.organizationName}</h2>
          </div>
          
          <div class="content">
            <p>Olá!</p>
            
            <p>Este é um lembrete sobre o convite que <strong>${data.inviterName}</strong> enviou para você fazer parte da organização <strong>${data.organizationName}</strong> como <strong>${roleTranslations[data.role]}</strong>.</p>
            
            <div class="expires">
              <strong>⏰ Este convite expira em:</strong> ${new Date(data.expiresAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            <p>Não perca esta oportunidade! Clique em um dos botões abaixo para responder:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" class="button accept">Aceitar Convite</a>
              <a href="${rejectUrl}" class="button reject">Rejeitar Convite</a>
            </div>
            
            <p><small>Se os botões não funcionarem, copie e cole este link no seu navegador:</small></p>
            <p><small><a href="${acceptUrl}">${acceptUrl}</a></small></p>
          </div>
          
          <div class="footer">
            <p>Este é um lembrete automático. Se você não esperava este convite, pode ignorá-lo com segurança.</p>
            <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvitationAcceptedEmailContent(data: InvitationAcceptedJobData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Convite Aceito - ${data.organizationName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Convite Aceito!</h1>
          </div>
          
          <div class="content">
            <p>Olá ${data.inviterName || 'Administrador'}!</p>
            
            <div class="success">
              <p><strong>Ótimas notícias!</strong> ${data.acceptedUserName} (${data.acceptedUserEmail}) aceitou seu convite para fazer parte da organização <strong>${data.organizationName}</strong>.</p>
            </div>
            
            <p>O novo membro já tem acesso à plataforma e pode começar a colaborar com a equipe.</p>
            
            <p>Você pode gerenciar os membros da sua organização através do painel administrativo.</p>
          </div>
          
          <div class="footer">
            <p>Este email foi enviado automaticamente quando um convite foi aceito.</p>
            <p>© ${new Date().getFullYear()} ${data.organizationName}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async simulateEmailSend(emailData: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    // Simular delay de envio de email
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Em produção, aqui você faria a integração real com o provedor de email
    // Exemplo com SendGrid:
    // const msg = {
    //   to: emailData.to,
    //   from: process.env.FROM_EMAIL,
    //   subject: emailData.subject,
    //   html: emailData.html,
    // };
    // await sgMail.send(msg);
    
    this.logger.debug(`Email simulated: ${emailData.subject} -> ${emailData.to}`);
  }

  private async logEmailSent(logData: {
    type: string;
    recipient: string;
    invitationId?: string;
    status: 'sent' | 'failed';
    error?: string;
  }): Promise<void> {
    try {
      // Registrar log no banco de dados
      // Em um cenário real, você poderia ter uma tabela de logs de email
      this.logger.log(
        `Email log: ${logData.type} to ${logData.recipient} - ${logData.status}${logData.error ? ` (${logData.error})` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log email: ${error.message}`);
    }
  }
}