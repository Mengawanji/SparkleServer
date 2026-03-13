import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from 'src/modules/email/email.service';

@Injectable()
export class SubscribeService {
  private readonly logger = new Logger(SubscribeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async subscribe(email: string): Promise<void> {
    // Check if already subscribed
    const existing = await this.prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.active) {
        throw new ConflictException('This email is already subscribed.');
      }
      // Re-activate if previously unsubscribed
      await this.prisma.subscriber.update({
        where: { email },
        data: { active: true },
      });
    } else {
      // New subscriber
      await this.prisma.subscriber.create({
        data: { email },
      });
    }

    // Send welcome email (non-blocking — log but don't throw if it fails)
    try {
      await this.emailService.sendWelcomeEmail(email);
    } catch (err) {
      this.logger.error(`Welcome email failed for ${email}`, err);
    }
  }
}