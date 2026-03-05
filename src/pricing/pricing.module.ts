import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Module({
  providers: [PricingService],
  exports: [PricingService], // 👈 VERY IMPORTANT
})
export class PricingModule {}