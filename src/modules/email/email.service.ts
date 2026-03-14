import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { generateInvoiceEmail } from './templates/invoice.template';
import { Booking, CleaningType } from '@prisma/client';
import { ContactDto } from 'src/contact/dto/contact.dto';

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
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: true,
      logger: true
    });
  }

  // ── Booking emails ───────────────────────────────────────────────────────

  async sendAdminNotification(booking: Booking, adminEmail: string): Promise<void> {
    try {
      const cleaningLabel = cleaningTypeLabels[booking.cleaningType];
      this.logger.log(`Preparing admin notification for booking ${booking.id}`);
      const htmlContent = this.generateAdminEmailTemplate(booking);
      const mailOptions = {
        from: `"Sandy's Sparkle Touch" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: adminEmail,
        replyTo: booking.email,
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
      await this.verifyConnection();
      const htmlContent = generateInvoiceEmail(booking);
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
      if (error.message.includes('Connection closed')) {
        this.logger.error('Connection timeout. Check:');
        this.logger.error('1. Your internet connection');
        this.logger.error('2. Firewall blocking port ' + this.configService.get('EMAIL_PORT'));
        this.logger.error('3. SMTP host is correct (smtp.gmail.com)');
      }
      throw error;
    }
  }

  // ── Contact form emails ──────────────────────────────────────────────────

  async sendContactEmail(dto: ContactDto): Promise<void> {
    const adminEmail = this.configService.get<string>('EMAIL_USER');
    const fromEmail = this.configService.get<string>('EMAIL_USER');
    const now = new Date().toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    try {
      const adminInfo = await this.transporter.sendMail({
        from: `"Sandy's Sparkle Touch" <${fromEmail}>`,
        to: adminEmail,
        replyTo: dto.email,
        subject: `✨ New Contact: ${dto.name} — ${dto.service ?? 'General Enquiry'}`,
        html: this.generateContactAdminTemplate(dto, now),
      });
      this.logger.log(`Contact admin notification sent. MessageId: ${adminInfo.messageId}`);

      const replyInfo = await this.transporter.sendMail({
        from: `"Sandy's Sparkle Touch" <${fromEmail}>`,
        to: dto.email,
        subject: `We received your message, ${dto.name.split(' ')[0]}! ✨`,
        html: this.generateContactAutoReplyTemplate(dto),
      });
      this.logger.log(`Contact auto-reply sent to ${dto.email}. MessageId: ${replyInfo.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send contact email for ${dto.email}`, error.stack);
      throw error;
    }
  }

  // ── Newsletter welcome email ─────────────────────────────────────────────

  async sendWelcomeEmail(email: string): Promise<void> {
    const fromEmail = this.configService.get<string>('EMAIL_USER');
    const info = await this.transporter.sendMail({
      from: `"Sandy's Sparkle Touch" <${fromEmail}>`,
      to: email,
      subject: "Welcome to Sandy's Sparkle Touch!",
      html: this.generateWelcomeTemplate(email),
    });
    this.logger.log(`Welcome email sent to ${email}. MessageId: ${info.messageId}`);
  }

  private generateWelcomeTemplate(email: string): string {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'https://sparkle-client.vercel.app';
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d1340 0%,#1a2466 100%);padding:36px 40px;text-align:center;">
              <div style="font-size:28px;margin-bottom:8px;">✨</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Sandy's Sparkle Touch</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:12px;letter-spacing:2px;text-transform:uppercase;">You're on the list!</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 12px;color:#0d1340;font-size:20px;font-weight:700;">Welcome aboard! 🎉</h2>
              <p style="margin:0 0 20px;color:#4a5568;font-size:15px;line-height:1.7;">
                Thanks for subscribing to Sandy's Sparkle Touch. You'll be the first to know about:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f5;">
                    <span style="color:#2d3748;font-size:14px;font-weight:500;">Exclusive cleaning tips &amp; tricks</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0f0f5;">
                    <span style="color:#2d3748;font-size:14px;font-weight:500;">Special promos and seasonal offers</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <span style="color:#2d3748;font-size:14px;font-weight:500;">New service announcements</span>
                  </td>
                </tr>
              </table>

              <div style="margin-top:32px;text-align:center;">
                <a href="${frontendUrl}/book"
                   style="display:inline-block;background:#3B4FCC;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:12px;">
                  Book Your First Clean
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9ff;padding:24px 40px;border-top:1px solid #eef0f8;text-align:center;">
              <p style="margin:0;color:#a0aec0;font-size:12px;line-height:1.6;">
                You're receiving this because you subscribed at sandyssparkletouch.com<br/>
                <a href="${frontendUrl}/unsubscribe?email=${encodeURIComponent(email)}"
                   style="color:#3B4FCC;text-decoration:none;">Unsubscribe</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ── Contact templates ────────────────────────────────────────────────────

  private generateContactAdminTemplate(dto: ContactDto, timestamp: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="background:linear-gradient(135deg,#3B4FCC 0%,#5B6FEE 100%);border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
          <p style="margin:0 0 6px;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:3px;text-transform:uppercase;">Sandy's Sparkle Touch</p>
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">New Contact Message</h1>
          <p style="margin:10px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">${timestamp}</p>
        </td></tr>

        <tr><td style="background:#fff;padding:40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="50%" style="padding-right:10px;vertical-align:top;">
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">From</p>
                <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${dto.name}</p>
                <a href="mailto:${dto.email}" style="color:#3B4FCC;font-size:13px;text-decoration:none;">${dto.email}</a>
              </td>
              <td width="50%" style="padding-left:10px;vertical-align:top;">
                ${dto.phone ? `
                <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">Phone</p>
                <p style="margin:0;font-size:15px;color:#374151;">${dto.phone}</p>` : ''}
              </td>
            </tr>
          </table>

          ${dto.service ? `
          <div style="margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">Service Requested</p>
            <span style="display:inline-block;background:#EEF2FF;color:#3B4FCC;font-size:13px;font-weight:600;padding:6px 14px;border-radius:20px;border:1px solid #c7d0f8;">${dto.service}</span>
          </div>` : ''}

          <div style="margin-bottom:32px;">
            <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">Message</p>
            <div style="background:#f8fafc;border-left:3px solid #3B4FCC;border-radius:0 8px 8px 0;padding:18px 20px;">
              <p style="margin:0;font-size:15px;line-height:1.7;color:#374151;white-space:pre-wrap;">${dto.message}</p>
            </div>
          </div>

          <div style="text-align:center;">
            <a href="mailto:${dto.email}?subject=Re: Your message to Sandy's Sparkle Touch"
               style="display:inline-block;background:linear-gradient(135deg,#3B4FCC,#5B6FEE);color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:14px 32px;border-radius:10px;">
              ↩ Reply to ${dto.name.split(' ')[0]}
            </a>
          </div>
        </td></tr>

        <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Sandy's Sparkle Touch · Contact Form Notification</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private generateContactAutoReplyTemplate(dto: ContactDto): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <tr><td style="background:linear-gradient(135deg,#3B4FCC 0%,#5B6FEE 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
          <div style="font-size:40px;margin-bottom:12px;">✨</div>
          <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:700;">Thanks, ${dto.name.split(' ')[0]}!</h1>
          <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">We've received your message and will be in touch shortly.</p>
        </td></tr>

        <tr><td style="background:#fff;padding:40px;">
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">
            Hi ${dto.name.split(' ')[0]}, thank you for reaching out to <strong>Sandy's Sparkle Touch</strong>!
            We typically respond within <strong>1–2 business hours</strong> during working days.
          </p>

          <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;border:1px solid #e5e7eb;">
            <p style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">Your submission summary</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;width:100px;">Name</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${dto.name}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${dto.email}</td>
              </tr>
              ${dto.service ? `<tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;">Service</td>
                <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${dto.service}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:6px 0;font-size:13px;color:#6b7280;vertical-align:top;">Message</td>
                <td style="padding:6px 0;font-size:13px;color:#374151;line-height:1.6;">${dto.message.substring(0, 120)}${dto.message.length > 120 ? '...' : ''}</td>
              </tr>
            </table>
          </div>

          <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
            If you have any urgent questions, feel free to reply directly to this email.<br/>
            We look forward to making your space sparkle!
          </p>
        </td></tr>

        <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#3B4FCC;">Sandy's Sparkle Touch</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">Professional Cleaning Services · Est. 2026</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── Booking admin template ───────────────────────────────────────────────

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

  // ── Shared ───────────────────────────────────────────────────────────────

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