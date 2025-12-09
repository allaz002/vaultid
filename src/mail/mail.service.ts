import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly appBaseUrl: string;

  constructor(){
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';
    this.appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';

    if(apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend initialized for email sending.');
    } else{
      this.resend = null;
      this.logger.warn('RESEND_API_KEY not set - emails will only be logged, not sent.');
    }
  }

  async sendEmailVerification(email: string, token: string) {
    const verificationLink = `${this.appBaseUrl}/auth/verify-email?token=${token}`;

    if(!this.resend){
      this.logger.log(`FAKE email verification to ${email}: ${verificationLink}`,);
      return;
    }

    try{
      await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verify your VaultID email',
        html: `
          <p>Hi,</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}">Verify Email</a></p>
          <p>If you did not sign up, you can ignore this email.</p>
        `,
      });
    
    this.logger.log(`Sent email verification to ${email}`);
    } catch(error){
      this.logger.error(`Failed to send verification email to ${email}: ${error}`);
    }
  }


  async sendPasswordReset(email: string, token: string) {
    const resetLink = `${this.appBaseUrl}/auth/reset-password?token=${token}`;

    if(!this.resend){
      this.logger.log(`FAKE password reset to ${email}: ${resetLink}`);
      return;
    }

    try {
          await this.resend.emails.send({
            from: this.fromEmail,
            to: email,
            subject: 'Reset your VaultID password',
            html: `
              <p>Hi,</p>
              <p>You requested a password reset. Click the link below to set a new password:</p>
              <p><a href="${resetLink}">Reset Password</a></p>
              <p>If you did not request this, you can ignore this email.</p>
            `,
          });

          this.logger.log(`Sent password reset email to ${email}`);
        } catch (error) {
          this.logger.error(`Failed to send password reset email to ${email}: ${error}`);
        }
      }
}
