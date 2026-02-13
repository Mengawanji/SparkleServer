import { Injectable } from '@nestjs/common';
import { CleaningType } from '@prisma/client';

interface PricingRates {
  bedroomRate: number;
  bathroomRate: number;
}

interface PriceCalculation {
  bedroomPrice: number;
  bathroomPrice: number;
  totalPrice: number;
}

@Injectable()
export class PricingService {
  private readonly rates: Record<CleaningType, PricingRates> = {
    [CleaningType.REGULAR]: {
      bedroomRate: 20,
      bathroomRate: 15,
    },
    [CleaningType.DEEP]: {
      bedroomRate: 22,
      bathroomRate: 18,
    },
    [CleaningType.MOVE_OUT_MOVE_IN]: {
      bedroomRate: 25,
      bathroomRate: 20,
    },
  };

  calculatePrice(
    cleaningType: CleaningType,
    bedrooms: number,
    bathrooms: number,
  ): PriceCalculation {
    const rates = this.rates[cleaningType];

    const bedroomPrice = bedrooms * rates.bedroomRate;
    const bathroomPrice = bathrooms * rates.bathroomRate;
    const totalPrice = bedroomPrice + bathroomPrice;

    return {
      bedroomPrice,
      bathroomPrice,
      totalPrice,
    };
  }

  getRates(cleaningType: CleaningType): PricingRates {
    return this.rates[cleaningType];
  }

  getAllRates(): Record<CleaningType, PricingRates> {
    return this.rates;
  }
}