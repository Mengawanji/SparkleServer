import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PricingService } from 'src/pricing/pricing.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { Booking, CleaningType as PrismaCleaningType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    // Validate date is in the future
    const selectedDate = new Date(createBookingDto.preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException('Preferred date must be in the future');
    }

    // Calculate pricing
    const pricing = this.pricingService.calculatePrice(
      createBookingDto.cleaningType as unknown as PrismaCleaningType,
      createBookingDto.numberOfBedrooms,
      createBookingDto.numberOfBathrooms,
    );

    this.logger.log(
      `Creating booking for ${createBookingDto.email}. Total: $${pricing.totalPrice}`,
    );

    // Create booking in database
    const booking = await this.prisma.booking.create({
      data: {
        fullName: createBookingDto.fullName,
        email: createBookingDto.email,
        phone: createBookingDto.phone,
        address: createBookingDto.address,
        cleaningType: createBookingDto.cleaningType as unknown as PrismaCleaningType,
        numberOfBedrooms: createBookingDto.numberOfBedrooms,
        numberOfBathrooms: createBookingDto.numberOfBathrooms,
        preferredDate: new Date(createBookingDto.preferredDate),
        preferredTime: createBookingDto.preferredTime,
        additionalNotes: createBookingDto.additionalNotes,
        bedroomPrice: pricing.bedroomPrice,
        bathroomPrice: pricing.bathroomPrice,
        totalPrice: pricing.totalPrice,
      },
    });

    // Send emails asynchronously
    await this.sendBookingEmails(booking);

    return this.mapToResponseDto(booking);
  }

  private async sendBookingEmails(booking: Booking): Promise<void> {
    try {
      // Send invoice to customer
      await this.sendInvoiceAsync(booking);
      
      // Send notification to admin
      await this.sendAdminNotificationAsync(booking);
      
      this.logger.log(`All emails sent successfully for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(`Error sending emails for booking ${booking.id}`, error.stack);
      // Don't throw - booking already created
    }
  }

  private async sendInvoiceAsync(booking: Booking): Promise<void> {
    try {
      await this.emailService.sendInvoiceEmail(booking);
      
      // Update booking to mark invoice as sent
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: {
          invoiceSent: true,
          invoiceSentAt: new Date(),
        },
      });

      this.logger.log(`✅ Invoice sent successfully to customer ${booking.email} for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send invoice to customer for booking ${booking.id}`,
        error.stack,
      );
    }
  }

  private async sendAdminNotificationAsync(booking: Booking): Promise<void> {
    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      
      if (!adminEmail) {
        this.logger.error('ADMIN_EMAIL not configured in .env file');
        return;
      }

      this.logger.log(`📧 Sending admin notification to ${adminEmail} for booking ${booking.id}`);
      
      // You'll need to create this method in your EmailService
      await this.emailService.sendAdminNotification(booking, adminEmail);
      
      this.logger.log(`✅ Admin notification sent successfully for booking ${booking.id}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to send admin notification for booking ${booking.id}`,
        error.stack,
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: BookingResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count(),
    ]);

    return {
      data: bookings.map(this.mapToResponseDto),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new BadRequestException('Booking not found');
    }

    return this.mapToResponseDto(booking);
  }

  private mapToResponseDto(booking: Booking): BookingResponseDto {
    return {
      id: booking.id,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      address: booking.address,
      cleaningType: booking.cleaningType,
      numberOfBedrooms: booking.numberOfBedrooms,
      numberOfBathrooms: booking.numberOfBathrooms,
      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,
      additionalNotes: booking.additionalNotes, 
      pricing: {
        bedroomPrice: booking.bedroomPrice.toNumber(),
        bathroomPrice: booking.bathroomPrice.toNumber(),
        totalPrice: booking.totalPrice.toNumber(),
      },
      status: booking.status,
      createdAt: booking.createdAt,
    };
  }
}