import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { generateInvoiceEmail } from './templates/invoice.template';
import { Booking, CleaningType } from '@prisma/client';

const cleaningTypeLabels: Record<CleaningType, string> = {
  REGULAR: 'Regular Cleaning',
  DEEP: 'Deep Cleaning',
  MOVE_OUT_MOVE_IN: 'Move-out / Move-in Cleaning'
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Log configuration for debugging (without password)
    this.logger.log('Initializing email transporter:', {
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: this.configService.get<string>('EMAIL_SECURE') === 'true',
      user: this.configService.get<string>('EMAIL_USER'),
    });

    const port = this.configService.get<number>('EMAIL_PORT');
    
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port: port,
      secure: port === 465,
      requireTLS: true, 
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
      // Add timeout settings to prevent hanging connections
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true,
      logger: true
    });
  }

  async sendAdminNotification(booking: Booking, adminEmail: string): Promise<void> {
  try {
    const cleaningLabel = cleaningTypeLabels[booking.cleaningType];

    this.logger.log(`Preparing admin notification for booking ${booking.id}`);
    
    const htmlContent = this.generateAdminEmailTemplate(booking);
    
    const mailOptions = {
      from: `"Sandy's Sparkle Touch" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: adminEmail,
      replyTo: booking.email, // So admin can reply directly to customer
      subject: `🔔 New Booking: ${cleaningLabel}`,
      html: htmlContent,
    };

      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Admin notification sent to ${adminEmail}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send admin notification to ${adminEmail}`, error.stack);
      throw error;
    }
  }

  async sendInvoiceEmail(booking: Booking): Promise<void> {
    try {
      // Verify connection first
      await this.verifyConnection();
      
      const htmlContent = generateInvoiceEmail(booking);
      
      // FIXED: Use EMAIL_USER instead of email.from
      const fromEmail = this.configService.get<string>('EMAIL_USER');
      
      const mailOptions = {
        from: `"Sparkle Cleaning Services" <${fromEmail}>`,
        to: booking.email,
        subject: `Booking Confirmation - ${booking.cleaningType} Cleaning`,
        html: htmlContent,
      };

      this.logger.log(`Attempting to send email to ${booking.email}`);
      const info = await this.transporter.sendMail(mailOptions);
      
      this.logger.log(`Invoice email sent to ${booking.email}. MessageId: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send invoice email to ${booking.email}`, error.stack);
      
      // Provide more specific error guidance
      if (error.message.includes('Connection closed')) {
        this.logger.error('Connection timeout. Check:');
        this.logger.error('1. Your internet connection');
        this.logger.error('2. Firewall blocking port ' + this.configService.get('EMAIL_PORT'));
        this.logger.error('3. SMTP host is correct (smtp.gmail.com)');
      }
      
      throw error;
    }
  }

  private generateAdminEmailTemplate(booking: Booking): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .details { background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .field { margin-bottom: 10px; }
          .label { font-weight: bold; color: #4b5563; }
          .value { color: #1f2937; }
          .price { font-size: 24px; color: #4F46E5; font-weight: bold; }
          .notes { background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Booking Received</h1>
          </div>
          
          <div class="content">
            <p>A new booking has been created with the following details:</p>
            
            <div class="details">
              <h2>Customer Information</h2>
              <div class="field">
                <span class="label">Name:</span>
                <span class="value">${booking.fullName}</span>
              </div>
              <div class="field">
                <span class="label">Email:</span>
                <span class="value">${booking.email}</span>
              </div>
              ${booking.phone ? `
              <div class="field">
                <span class="label">Phone:</span>
                <span class="value">${booking.phone}</span>
              </div>
              ` : ''}
              <div class="field">
                <span class="label">Address:</span>
                <span class="value">${booking.address}</span>
              </div>
            </div>
            
            <div class="details">
              <h2>Service Details</h2>
              <div class="field">
                <span class="label">Cleaning Type:</span>
                <span class="value">${booking.cleaningType}</span>
              </div>
              <div class="field">
                <span class="label">Bedrooms:</span>
                <span class="value">${booking.numberOfBedrooms}</span>
              </div>
              <div class="field">
                <span class="label">Bathrooms:</span>
                <span class="value">${booking.numberOfBathrooms}</span>
              </div>
              <div class="field">
                <span class="label">Preferred Date:</span>
                <span class="value">${new Date(booking.preferredDate).toLocaleDateString()}</span>
              </div>
              <div class="field">
                <span class="label">Preferred Time:</span>
                <span class="value">${booking.preferredTime}</span>
              </div>
            </div>
            
            ${booking.additionalNotes ? `
            <div class="notes">
              <h3 style="margin-top: 0; color: #856404;">Additional Notes</h3>
              <p style="margin-bottom: 0;">${booking.additionalNotes}</p>
            </div>
            ` : ''}
            
            <div class="details">
              <h2>Price Details</h2>
              <div class="field">
                <span class="label">Total Price:</span>
                <span class="price">$${booking.totalPrice}</span>
              </div>
            </div>
            
            <div style="margin-top: 30px; text-align: center;">
              <a href="${process.env.ADMIN_URL}/bookings/${booking.id}" 
                style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                View Booking Details
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from Sandy's Sparkle Touch</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async verifyConnection(): Promise<boolean> {
    try {
      this.logger.log('Verifying email connection...');
      await this.transporter.verify();
      this.logger.log('✅ Email service connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('❌ Email service connection failed', error);
      return false;
    }
  }
}