import { CleaningType } from '@prisma/client';

export class PriceBreakdown {
  bedroomPrice: number;
  bathroomPrice: number;
  totalPrice: number;
}

export class BookingResponseDto {
  id: string;
  fullName: string;
  email: string;
  address: string;
  cleaningType: CleaningType;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  preferredDate: Date;
  preferredTime: string;
  pricing: PriceBreakdown;
  status: string;
  createdAt: Date;
}