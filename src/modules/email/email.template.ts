import { format } from 'date-fns';
import { BookingResponseDto } from '../bookings/entities/booking.entity';

export class EmailTemplates {
  /**
   * Customer booking confirmation email
   */
  static bookingConfirmation(booking: BookingResponseDto): {
    subject: string;
    html: string;
    text: string;
  } {
    const formattedDate = format(booking.scheduledDate, 'EEEE, MMMM d, yyyy');
    const formattedTime = format(booking.scheduledTime, 'h:mm a');
    const { customer, service, address } = booking;

    const subject = `Booking Confirmation - ${booking.bookingReference}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" 
               style="margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                Booking Confirmed!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 24px; color: #333333;">
                Hi ${customer.firstName},
              </p>
              
              <p style="margin: 0 0 30px; font-size: 16px; line-height: 24px; color: #333333;">
                Thank you for booking with us! Your cleaning service has been confirmed.
              </p>
              
              <!-- Booking Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" 
                     style="background-color: #F9FAFB; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: bold; color: #111827;">
                      Booking Details
                    </h2>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280; width: 140px;">
                          <strong>Reference:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827; font-weight: 600;">
                          ${booking.bookingReference}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">
                          <strong>Service:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827;">
                          ${service.name}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">
                          <strong>Date:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827;">
                          ${formattedDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">
                          <strong>Time:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827;">
                          ${formattedTime}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">
                          <strong>Duration:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827;">
                          ${booking.durationMinutes} minutes
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6B7280;">
                          <strong>Location:</strong>
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #111827;">
                          ${address.streetAddress}${address.apartmentUnit ? `, ${address.apartmentUnit}` : ''}<br>
                          ${address.city}, ${address.stateProvince} ${address.postalCode}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 16px 0 8px; font-size: 14px; color: #6B7280; border-top: 1px solid #E5E7EB;">
                          <strong>Total Price:</strong>
                        </td>
                        <td style="padding: 16px 0 8px; font-size: 18px; color: #059669; font-weight: bold; border-top: 1px solid #E5E7EB;">
                          $${Number(booking.totalPrice).toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              ${
                booking.specialInstructions
                  ? `
              <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400E;">
                  <strong>Special Instructions:</strong><br>
                  ${booking.specialInstructions}
                </p>
              </div>
              `
                  : ''
              }
              
              <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: bold; color: #111827;">
                What to Expect
              </h3>
              
              <ul style="margin: 0 0 30px; padding-left: 20px; font-size: 14px; line-height: 22px; color: #4B5563;">
                <li style="margin-bottom: 8px;">Our team will arrive within 15 minutes of your scheduled time</li>
                <li style="margin-bottom: 8px;">Please ensure access to your property is available</li>
                <li style="margin-bottom: 8px;">All cleaning supplies and equipment will be provided</li>
                <li>You'll receive a notification when the service is complete</li>
              </ul>
              
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #6B7280;">
                Need to make changes? Contact us at 
                <a href="mailto:${process.env.EMAIL_FROM}" style="color: #4F46E5; text-decoration: none;">
                  ${process.env.EMAIL_FROM}
                </a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
              
              <p style="margin: 0; font-size: 14px; line-height: 22px; color: #6B7280; text-align: center;">
                Questions? Reply to this email or call us at (555) 123-4567
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                © ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Your Cleaning Company'}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const text = `
BOOKING CONFIRMED

Hi ${customer.firstName},

Thank you for booking with us! Your cleaning service has been confirmed.

BOOKING DETAILS
Reference: ${booking.bookingReference}
Service: ${service.name}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${booking.durationMinutes} minutes
Location: ${address.streetAddress}${address.apartmentUnit ? `, ${address.apartmentUnit}` : ''}
          ${address.city}, ${address.stateProvince} ${address.postalCode}
Total Price: $${Number(booking.totalPrice).toFixed(2)}

${booking.specialInstructions ? `Special Instructions: ${booking.specialInstructions}\n` : ''}
WHAT TO EXPECT
- Our team will arrive within 15 minutes of your scheduled time
- Please ensure access to your property is available
- All cleaning supplies and equipment will be provided
- You'll receive a notification when the service is complete

Need to make changes? Contact us at ${process.env.EMAIL_FROM}

Questions? Reply to this email or call us at (555) 123-4567

© ${new Date().getFullYear()} ${process.env.EMAIL_FROM_NAME || 'Your Cleaning Company'}. All rights reserved.
    `;

    return { subject, html, text };
  }

  /**
   * Admin notification email
   */
  static adminNotification(booking: BookingResponseDto): {
    subject: string;
    html: string;
    text: string;
  } {
    const formattedDate = format(booking.scheduledDate, 'EEEE, MMMM d, yyyy');
    const formattedTime = format(booking.scheduledTime, 'h:mm a');
    const { customer, service, address } = booking;

    const subject = `New Booking: ${booking.bookingReference}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Booking Notification</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 8px;">
    <h2 style="color: #DC2626; margin-top: 0;">🔔 New Booking Received</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr style="background-color: #F3F4F6;">
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Reference</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">${booking.bookingReference}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Customer</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">
          ${customer.firstName} ${customer.lastName}<br>
          ${customer.email}<br>
          ${customer.phone}
        </td>
      </tr>
      <tr style="background-color: #F3F4F6;">
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Service</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">${service.name}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Date & Time</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">${formattedDate} at ${formattedTime}</td>
      </tr>
      <tr style="background-color: #F3F4F6;">
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Location</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">
          ${address.streetAddress}${address.apartmentUnit ? `, ${address.apartmentUnit}` : ''}<br>
          ${address.city}, ${address.stateProvince} ${address.postalCode}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Total Price</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB; color: #059669; font-weight: bold;">
          $${Number(booking.totalPrice).toFixed(2)}
        </td>
      </tr>
      ${
        booking.specialInstructions
          ? `
      <tr style="background-color: #FEF3C7;">
        <td style="padding: 12px; border: 1px solid #E5E7EB; font-weight: bold;">Special Instructions</td>
        <td style="padding: 12px; border: 1px solid #E5E7EB;">${booking.specialInstructions}</td>
      </tr>
      `
          : ''
      }
    </table>
    
    <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">
      This is an automated notification. Please confirm this booking with the customer.
    </p>
  </div>
</body>
</html>
    `;

    const text = `
NEW BOOKING RECEIVED

Reference: ${booking.bookingReference}

CUSTOMER
${customer.firstName} ${customer.lastName}
${customer.email}
${customer.phone}

SERVICE
${service.name}

DATE & TIME
${formattedDate} at ${formattedTime}

LOCATION
${address.streetAddress}${address.apartmentUnit ? `, ${address.apartmentUnit}` : ''}
${address.city}, ${address.stateProvince} ${address.postalCode}

TOTAL PRICE
$${Number(booking.totalPrice).toFixed(2)}

${booking.specialInstructions ? `SPECIAL INSTRUCTIONS\n${booking.specialInstructions}\n` : ''}
This is an automated notification. Please confirm this booking with the customer.
    `;

    return { subject, html, text };
  }
}