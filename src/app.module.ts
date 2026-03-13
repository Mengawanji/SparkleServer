import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EmailModule } from './modules/email/email.module';
import { PrismaModule } from './prisma/prisma.module';
import { PricingModule } from './pricing/pricing.module';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { ContactController } from './contact/contact.controller';
import { SubscribeModule } from './subscribe/subscribe.module';

@Module({
  imports: [
    PrismaModule, // makes PrismaService available globally
    BookingsModule,
    EmailModule,
    PricingModule,
        ConfigModule.forRoot({
      isGlobal: true, // VERY IMPORTANT
    }),
        SubscribeModule,
  ],
  controllers: [AppController, HealthController, ContactController],
  providers: [AppService],
})
export class AppModule {}