import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EmailModule } from './modules/email/email.module';
import { PrismaModule } from './prisma/prisma.module'; // Add this import

@Module({
  imports: [
    PrismaModule, // Add this first - makes PrismaService available globally
    BookingsModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}