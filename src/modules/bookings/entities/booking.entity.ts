import { Prisma } from '@prisma/client';

export class BookingResponseDto {
  id: string;
  bookingReference: string;
  status: string;

  // Scheduling
  scheduledDate: Date;
  scheduledTime: Date;
  durationMinutes: number;

  // Pricing
  totalPrice: Prisma.Decimal | number;

  // Relationships
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };

  service: {
    id: string;
    name: string;
    description: string | null;
    basePrice: Prisma.Decimal | number;
  };

  address: {
    id: string;
    streetAddress: string;
    apartmentUnit: string | null;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
  };

  // Optional
  specialInstructions?: string | null;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export class BookingCreatedResponseDto {
  success: boolean;
  message: string;
  booking: BookingResponseDto;
}
