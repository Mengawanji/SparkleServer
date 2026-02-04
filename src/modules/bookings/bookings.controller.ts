import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseFilters,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { EmailService } from '../email/email.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  BookingCreatedResponseDto,
  BookingResponseDto,
} from './entities/booking.entity';

@Controller('bookings')
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new booking
   * POST /api/v1/bookings
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingCreatedResponseDto> {
    this.logger.log(`Creating booking for ${createBookingDto.customer.email}`);

    try {
      // Create booking
      const booking = await this.bookingsService.create(createBookingDto);

      // Send confirmation emails (don't wait for completion)
      this.sendBookingEmails(booking).catch((error) => {
        this.logger.error('Failed to send booking emails', error);
        // Don't fail the request if email fails
      });

      return {
        success: true,
        message: 'Booking created successfully',
        booking,
      };
    } catch (error) {
      this.logger.error('Failed to create booking', error);
      throw error;
    }
  }

  /**
   * Get booking by reference number
   * GET /api/v1/bookings/:reference
   */
  @Get(':reference')
  async findByReference(
    @Param('reference') reference: string,
  ): Promise<BookingResponseDto> {
    this.logger.log(`Fetching booking: ${reference}`);
    return this.bookingsService.findByReference(reference);
  }

  /**
   * Get all bookings (admin endpoint)
   * GET /api/v1/bookings
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
  ): Promise<BookingResponseDto[]> {
    this.logger.log(`Fetching all bookings${status ? ` with status: ${status}` : ''}`);
    return this.bookingsService.findAll(status);
  }

  /**
   * Send booking confirmation and admin notification emails
   */
  private async sendBookingEmails(booking: BookingResponseDto): Promise<void> {
    try {
      // Send customer confirmation
      await this.emailService.sendBookingConfirmation(booking);
      this.logger.log(
        `Sent confirmation email to ${booking.customer.email} for booking ${booking.bookingReference}`,
      );

      // Send admin notification
      await this.emailService.sendAdminNotification(booking);
      this.logger.log(
        `Sent admin notification for booking ${booking.bookingReference}`,
      );
    } catch (error) {
      this.logger.error('Error sending booking emails', error);
      throw error;
    }
  }
}