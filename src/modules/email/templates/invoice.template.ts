import { Booking, Customer, Service, Address, User } from '@prisma/client';
import { format } from 'date-fns';

// Extended booking type with relations
type BookingWithRelations = Booking & {
  customer: Customer & {
    user: User;
  };
  service: Service;
  address: Address;
  cleaner?: {
    user: User;
  } | null;
};

export function generateInvoiceEmail(booking: BookingWithRelations): string {
  const formattedDate = format(new Date(booking.date), 'MMMM dd, yyyy');
  const formattedStartTime = format(new Date(booking.startTime), 'h:mm a');
  const formattedEndTime = booking.endTime ? format(new Date(booking.endTime), 'h:mm a') : 'TBD';
  
  const timeSlotLabels: Record<string, string> = {
    MORNING_8_12: '8:00 AM - 12:00 PM',
    AFTERNOON_12_4: '12:00 PM - 4:00 PM',
    EVENING_4_8: '4:00 PM - 8:00 PM',
    FLEXIBLE: 'Flexible (We\'ll contact you to confirm)',
  };

  const frequencyLabels: Record<string, string> = {
    ONE_TIME: 'One Time',
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Every 2 Weeks',
    MONTHLY: 'Monthly',
  };

  const customerName = `${booking.customer.user.firstName} ${booking.customer.user.lastName}`;
  const customerEmail = booking.customer.user.email;
  const customerPhone = booking.customer.user.phone;

  const fullAddress = [
    booking.address.street,
    booking.address.apartment,
    booking.address.floor,
    `${booking.address.city}, ${booking.address.state} ${booking.address.postalCode}`,
    booking.address.country
  ].filter(Boolean).join(', ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #3b82f6;
      margin: 0;
      font-size: 28px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      color: #1f2937;
      font-size: 18px;
      margin-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
    }
    .price-breakdown {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      margin-top: 10px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      margin-top: 10px;
      border-top: 2px solid #3b82f6;
      font-size: 20px;
      font-weight: bold;
      color: #3b82f6;
    }
    .status-badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-PENDING { background-color: #fef3c7; color: #92400e; }
    .status-CONFIRMED { background-color: #dbeafe; color: #1e40af; }
    .status-COMPLETED { background-color: #d1fae5; color: #065f46; }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .booking-id {
      background: #eff6ff;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
      margin-bottom: 20px;
      font-size: 12px;
      color: #1e40af;
    }
    .special-instructions {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 10px;
      margin-top: 10px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧹 CleanHome Services</h1>
      <p style="margin: 10px 0 0 0; color: #6b7280;">Your Booking is Confirmed!</p>
    </div>

    <div class="booking-id">
      <div>Booking Reference: <strong>${booking.reference}</strong></div>
      <div style="margin-top: 5px;">
        <span class="status-badge status-${booking.status}">${booking.status}</span>
      </div>
    </div>

    <div class="section">
      <h2>Customer Information</h2>
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">${customerName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${customerEmail}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Phone:</span>
        <span class="info-value">${customerPhone}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service Address:</span>
        <span class="info-value">${fullAddress}</span>
      </div>
      ${booking.address.instructions ? `
      <div class="info-row">
        <span class="info-label">Access Instructions:</span>
        <span class="info-value">${booking.address.instructions}</span>
      </div>
      ` : ''}
      ${booking.address.accessCode ? `
      <div class="info-row">
        <span class="info-label">Access Code:</span>
        <span class="info-value">${booking.address.accessCode}</span>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>Service Details</h2>
      <div class="info-row">
        <span class="info-label">Service Type:</span>
        <span class="info-value">${booking.service.name}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Category:</span>
        <span class="info-value">${booking.service.category}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duration:</span>
        <span class="info-value">${booking.service.duration} minutes (est. ${booking.estimatedHours} hours)</span>
      </div>
      ${booking.service.features && booking.service.features.length > 0 ? `
      <div class="info-row">
        <span class="info-label">Features:</span>
        <span class="info-value">${booking.service.features.map(f => f.replace('_', ' ')).join(', ')}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Frequency:</span>
        <span class="info-value">${frequencyLabels[booking.frequency] || booking.frequency}</span>
      </div>
    </div>

    <div class="section">
      <h2>Scheduled Date & Time</h2>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Time Slot:</span>
        <span class="info-value">${timeSlotLabels[booking.timeSlot] || booking.timeSlot}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Start Time:</span>
        <span class="info-value">${formattedStartTime}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Estimated End Time:</span>
        <span class="info-value">${formattedEndTime}</span>
      </div>
    </div>

    ${booking.cleaner ? `
    <div class="section">
      <h2>Assigned Cleaner</h2>
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">${booking.cleaner.user.firstName} ${booking.cleaner.user.lastName}</span>
      </div>
    </div>
    ` : ''}

    ${booking.specialInstructions ? `
    <div class="section">
      <h2>Special Instructions</h2>
      <div class="special-instructions">
        ${booking.specialInstructions}
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>Price Breakdown</h2>
      <div class="price-breakdown">
        <div class="price-row">
          <span>Base Service (${booking.service.name})</span>
          <span>$${(booking.subtotal - (booking.discountAmount || 0)).toFixed(2)}</span>
        </div>
        <div class="price-row">
          <span>Tax (${(booking.taxRate * 100).toFixed(0)}%)</span>
          <span>$${booking.taxAmount.toFixed(2)}</span>
        </div>
        ${booking.discountAmount > 0 ? `
        <div class="price-row" style="color: #059669;">
          <span>Discount</span>
          <span>-$${booking.discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-row">
          <span>Total Amount</span>
          <span>$${booking.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>

    ${booking.isRecurring ? `
    <div class="section">
      <h2>Recurring Booking Information</h2>
      <div class="info-row">
        <span class="info-label">Recurring ID:</span>
        <span class="info-value">${booking.recurringBookingId || 'N/A'}</span>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for choosing CleanHome Services!</p>
      <p>If you have any questions, please contact us at support@cleanhome.com or call (555) 123-4567</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This is an automated confirmation email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}