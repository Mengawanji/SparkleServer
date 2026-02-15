import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { generateInvoiceEmail } from './templates/invoice.template';
import { Booking } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailConfig = this.configService.get('email');
    
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      },
    });
  }

  async sendInvoiceEmail(booking: Booking): Promise<void> {
    try {
      const htmlContent = generateInvoiceEmail(booking);
      
      const mailOptions = {
        from: `"CleanHome Services" <${this.configService.get('email.from')}>`,
        to: booking.email,
        subject: `Booking Confirmation - ${booking.cleaningType} Cleaning`,
        html: htmlContent,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Invoice email sent to ${booking.email}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send invoice email to ${booking.email}`, error.stack);
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email service connection verified');
      return true;
    } catch (error) {
      this.logger.error('Email service connection failed', error.stack);
      return false;
    }
  }
}