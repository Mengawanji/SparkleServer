import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;
  private readonly defaultFromName: string;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }

    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD');
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);

    if (smtpHost && smtpPort && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    this.defaultFrom = this.configService.get<string>('EMAIL_FROM', 'noreply@example.com');
    this.defaultFromName = this.configService.get<string>('EMAIL_FROM_NAME', 'Your App');
  }

  /**
   * Send email using available services
   */
  async send(options: EmailOptions, from?: string, fromName?: string): Promise<boolean> {
    const fromEmail = from || this.defaultFrom;
    const fromNameValue = fromName || this.defaultFromName;
    const fromWithName = `${fromNameValue} <${fromEmail}>`;

    // Try Resend first if available
    if (this.resend) {
      try {
        const result = await this.sendWithResend(options, fromEmail, fromNameValue);
        if (result.success) {
          this.logger.debug(`Email sent via Resend: ${result.id}`);
          return true;
        }
        this.logger.warn('Resend failed, falling back to SMTP');
      } catch (error) {
        this.logger.error('Resend error:', error);
      }
    }

    // Fall back to SMTP
    if (this.transporter) {
      return this.sendWithNodemailer(options, fromWithName);
    }

    this.logger.error('No email service configured');
    throw new Error('No email service configured');
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(
    options: EmailOptions,
    from: string,
    fromName: string
  ): Promise<{ success: boolean; id?: string }> {
    try {
      const response = await this.resend.emails.send({
        from: `${fromName} <${from}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      });

      if (response.error) {
        this.logger.error('Resend error:', response.error);
        return { success: false };
      }

      return { success: true, id: response.data?.id };
    } catch (error) {
      this.logger.error('Resend error:', error);
      return { success: false };
    }
  }

  /**
   * Send email using Nodemailer (SMTP)
   */
  private async sendWithNodemailer(
    options: EmailOptions,
    fromWithName: string
  ): Promise<boolean> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: fromWithName,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.debug(`Email sent via SMTP: ${info.messageId}`);
      return true;
    } catch (error) {
      this.logger.error('SMTP error:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(to: string, token: string, userName?: string): Promise<boolean> {
    const verificationUrl = `${this.configService.get('APP_URL')}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Email Verification</h2>
          <p>Hello ${userName || 'User'},</p>
          <p>Please verify your email by clicking the link below:</p>
          <p><a href="${verificationUrl}">Verify Email</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        </body>
      </html>
    `;

    return this.send({
      to,
      subject: 'Verify Your Email',
      html,
      text: `Please verify your email by visiting: ${verificationUrl}`,
    });
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmation(to: string, bookingDetails: any): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h2>Booking Confirmed</h2>
          <p>Your booking has been confirmed!</p>
          <p><strong>Reference:</strong> ${bookingDetails.reference}</p>
          <p><strong>Date:</strong> ${new Date(bookingDetails.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${new Date(bookingDetails.startTime).toLocaleTimeString()}</p>
          <p><strong>Service:</strong> ${bookingDetails.service?.name}</p>
          <p><strong>Total:</strong> $${bookingDetails.totalAmount}</p>
        </body>
      </html>
    `;

    return this.send({
      to,
      subject: `Booking Confirmed: ${bookingDetails.reference}`,
      html,
    });
  }
}