import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto) {
    try {
      const booking = await this.bookingsService.create(createBookingDto);
      
      // Send confirmation email to customer
      if (booking.customer?.email) {
        try {
          await this.emailService.sendBookingConfirmation(
            booking.customer.email, 
            booking
          );
        } catch (emailError) {
          // Log but don't fail the booking if email fails
          console.error('Failed to send confirmation email:', emailError);
        }
      }

      return {
        success: true,
        message: 'Booking created successfully',
        booking,
      };
    } catch (error) {
      // Return the error message from the service
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(error.message);
    }
  }

  @Get()
  findAll(@Query('status') status?: BookingStatus) {
    return this.bookingsService.findAll(status);
  }

  @Get('customer/:userId')
  async findCustomerBookings(@Param('userId') userId: string) {
    return this.bookingsService.findByCustomer(userId);
  }

  @Get(':reference')
  async findOne(@Param('reference') reference: string) {
    return this.bookingsService.findByReference(reference);
  }

  @Post(':reference/cancel')
  async cancel(
    @Param('reference') reference: string,
    @Body('reason') reason?: string
  ) {
    return this.bookingsService.cancelBooking(reference, reason);
  }

  @Post(':reference/assign-cleaner')
  async assignCleaner(
    @Param('reference') reference: string,
    @Body('cleanerId') cleanerId: string
  ) {
    return this.bookingsService.assignCleaner(reference, cleanerId);
  }

  @Post(':reference/status')
  async updateStatus(
    @Param('reference') reference: string,
    @Body('status') status: BookingStatus,
    @Body('notes') notes?: string
  ) {
    return this.bookingsService.updateStatus(reference, status, notes);
  }
}