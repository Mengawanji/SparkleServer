import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { EmailModule } from '../email/email.module';
import { PricingModule } from 'src/pricing/pricing.module';

@Module({
  imports: [EmailModule, PricingModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}