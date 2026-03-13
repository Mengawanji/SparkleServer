import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscribeService } from './subscribe.service';

@Controller('subscribe')
export class SubscribeController {
  private readonly logger = new Logger(SubscribeController.name);

  constructor(private readonly subscribeService: SubscribeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeDto) {
    try {
      await this.subscribeService.subscribe(dto.email);
      return { success: true, message: "You're subscribed! Check your inbox for a welcome email." };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Subscription failed', error);
      throw new BadRequestException('Something went wrong. Please try again.');
    }
  }
}