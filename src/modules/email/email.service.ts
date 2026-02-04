import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as nodemailer from 'nodemailer';
import { BookingResponseDto } from '../bookings/entities/booking.entity';
import { EmailTemplates } from './templates/email.templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient: Resend | null = null;
  private nodemailerTransporter: nodemailer.Transporter | null = null;
  private useResend: boolean;

  constructor(private configService: ConfigService) {
    this.useResend = this.configService.get<boolean>('email.useResend', false);

    if (this.useResend) {
      // Initialize Resend
      const apiKey = this.configService.get<string>('email.resend.apiKey');
      if (apiKey) {
        this.resendClient = new Resend(apiKey);
        this.logger.log('Email service initialized with Resend');
      } else {
        this.logger.warn('Resend API key not found, falling back to Nodemailer');
        this.useResend = false;
      }
    }

    if (!this.useResend) {
      // Initialize Nodemailer
      this.nodemailerTransporter = nodemailer.createTransport({
        host: this.configService.get<string>('email.smtp.host'),
        port: this.configService.get<number>('email.smtp.port'),
        secure: false,
        auth: {
          user: this.configService.get<string>('email.smtp.auth.user'),
          pass: this.configService.get<string>('email.smtp.auth.pass'),
        },
      });
      this.logger.log('Email service initialized with Nodemailer');
    }
  }

  /**
   * Send booking confirmation email to customer
   */
  async sendBookingConfirmation(booking: BookingResponseDto): Promise<void> {
    const { subject, html, text } = EmailTemplates.bookingConfirmation(booking);

    try {
      await this.sendEmail({
        to: booking.customer.email,
        subject,
        html,
        text,
      });

      this.logger.log(
        `Booking confirmation sent to ${booking.customer.email} for ${booking.bookingReference}`,
      );
    } catch (error) {
      this.logger.error('Failed to send booking confirmation', error);
      throw error;
    }
  }

  /**
   * Send admin notification email
   */
  async sendAdminNotification(booking: BookingResponseDto): Promise<void> {
    const adminEmail = this.configService.get<string>('email.adminEmail');
    if (!adminEmail) {
      this.logger.warn('Admin email not configured, skipping notification');
      return;
    }

    const { subject, html, text } = EmailTemplates.adminNotification(booking);

    try {
      await this.sendEmail({
        to: adminEmail,
        subject,
        html,
        text,
      });

      this.logger.log(`Admin notification sent for ${booking.bookingReference}`);
    } catch (error) {
      this.logger.error('Failed to send admin notification', error);
      // Don't throw - admin notification failure shouldn't break the booking
    }
  }

  /**
   * Generic email sending method
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const from = this.configService.get<string>('email.resend.from');
    const fromName = this.configService.get<string>('email.resend.fromName');

    if (this.useResend && this.resendClient) {
      return this.sendWithResend(options, from, fromName);
    } else {
      return this.sendWithNodemailer(options, from, fromName);
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(
    options: { to: string; subject: string; html: string; text: string },
    from: string,
    fromName: string,
  ): Promise<void> {
    try {
      const result = await this.resendClient!.emails.send({
        from: `${fromName} <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.debug(`Email sent via Resend: ${result.id}`);
    } catch (error) {
      this.logger.error('Resend send failed', error);
      throw new Error(`Failed to send email via Resend: ${error.message}`);
    }
  }

  /**
   * Send email using Nodemailer
   */
  private async sendWithNodemailer(
    options: { to: string; subject: string; html: string; text: string },
    from: string,
    fromName: string,
  ): Promise<void> {
    try {
      const info = await this.nodemailerTransporter!.sendMail({
        from: `"${fromName}" <${from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.debug(`Email sent via Nodemailer: ${info.messageId}`);
      
      // Log preview URL for Ethereal (dev testing)
      if (process.env.NODE_ENV === 'development') {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          this.logger.debug(`Preview URL: ${previewUrl}`);
        }
      }
    } catch (error) {
      this.logger.error('Nodemailer send failed', error);
      throw new Error(`Failed to send email via Nodemailer: ${error.message}`);
    }
  }

  /**
   * Verify email service connection (useful for health checks)
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (this.useResend && this.resendClient) {
        // Resend doesn't have a verify method, assume OK if client exists
        return true;
      } else if (this.nodemailerTransporter) {
        await this.nodemailerTransporter.verify();
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error('Email service verification failed', error);
      return false;
    }
  }
}