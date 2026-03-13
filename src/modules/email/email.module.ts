import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ContactController } from 'src/contact/contact.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [ContactController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}