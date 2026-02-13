import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EmailModule } from './modules/email/email.module';
import { PrismaModule } from './prisma/prisma.module'; // Add this import
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [
    PrismaModule, // Add this first - makes PrismaService available globally
    BookingsModule,
    EmailModule,
    PricingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}