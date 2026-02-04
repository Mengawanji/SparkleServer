import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  // Resend configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'bookings@yourcompany.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Your Cleaning Company',
  },
  
  // Nodemailer (SMTP) configuration
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  
  // General configuration
  useResend: process.env.USE_RESEND === 'true',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@yourcompany.com',
}));