import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [BookingsModule, EmailModule],
})
export class AppModule {}