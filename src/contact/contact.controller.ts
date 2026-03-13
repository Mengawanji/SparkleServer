import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from 'src/modules/email/email.service';

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() dto: ContactDto) {
    try {
      await this.emailService.sendContactEmail(dto);
      return {
        success: true,
        message: "Your message has been sent. We'll be in touch shortly!",
      };
    } catch (error) {
      this.logger.error('Failed to send contact email', error);
      throw new BadRequestException(
        'Failed to send your message. Please try again or contact us directly.',
      );
    }
  }
}