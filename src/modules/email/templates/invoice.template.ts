import { Booking, CleaningType } from '@prisma/client';
import { format } from 'date-fns';

const cleaningTypeLabels: Record<CleaningType, string> = {
  REGULAR: 'Regular Cleaning',
  DEEP: 'Deep Cleaning',
  MOVE_OUT_MOVE_IN: 'Move-out / Move-in Cleaning',
};

export function generateInvoiceEmail(booking: Booking): string {
  const formattedDate = format(new Date(booking.preferredDate), 'MMMM dd, yyyy');
  const cleaningLabel = cleaningTypeLabels[booking.cleaningType];

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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧹 CleanHome Services</h1>
      <p style="margin: 10px 0 0 0; color: #6b7280;">Your Booking is Confirmed!</p>
    </div>

    <div class="booking-id">
      Booking ID: <strong>${booking.id}</strong>
    </div>

    <div class="section">
      <h2>Customer Information</h2>
      <div class="info-row">
        <span class="info-label">Name:</span>
        <span class="info-value">${booking.fullName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Email:</span>
        <span class="info-value">${booking.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Service Address:</span>
        <span class="info-value">${booking.address}</span>
      </div>
    </div>

    <div class="section">
      <h2>Service Details</h2>
      <div class="info-row">
        <span class="info-label">Cleaning Type:</span>
        <span class="info-value">${cleaningLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bedrooms:</span>
        <span class="info-value">${booking.numberOfBedrooms}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bathrooms:</span>
        <span class="info-value">${booking.numberOfBathrooms}</span>
      </div>
    </div>

    <div class="section">
      <h2>Scheduled Date & Time</h2>
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Time:</span>
        <span class="info-value">${booking.preferredTime}</span>
      </div>
    </div>

    <div class="section">
      <h2>Price Breakdown</h2>
      <div class="price-breakdown">
        <div class="price-row">
          <span>Bedrooms (${booking.numberOfBedrooms} × $${booking.bedroomPrice.toNumber() / booking.numberOfBedrooms})</span>
          <span>$${booking.bedroomPrice.toNumber().toFixed(2)}</span>
        </div>
        <div class="price-row">
          <span>Bathrooms (${booking.numberOfBathrooms} × $${booking.bathroomPrice.toNumber() / booking.numberOfBathrooms})</span>
          <span>$${booking.bathroomPrice.toNumber().toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>Total Amount</span>
          <span>$${booking.totalPrice.toNumber().toFixed(2)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing CleanHome Services!</p>
      <p>If you have any questions, please contact us at support@cleanhome.com</p>
      <p style="margin-top: 15px; font-size: 12px;">
        This is an automated confirmation email. Please do not reply to this message.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}