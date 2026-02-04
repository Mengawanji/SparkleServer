import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './entities/booking.entity';
import { Prisma, Booking } from '@prisma/client';
import {
  parseISO,
  addDays,
  isBefore,
  isAfter,
  startOfDay,
  parse,
  format,
  addMinutes,
} from 'date-fns';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new booking
   */
  async create(createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    // 1. Validate service exists and is active
    const service = await this.validateService(createBookingDto.serviceId);

    // 2. Validate scheduling (date/time)
    this.validateScheduling(
      createBookingDto.scheduledDate,
      createBookingDto.scheduledTime
    );

    // 3. Check availability
    await this.checkAvailability(
      createBookingDto.scheduledDate,
      createBookingDto.scheduledTime
    );

    // 4. Calculate total price
    const totalPrice = this.calculatePrice(service.basePrice);

    // 5. Create or find customer
    const customer = await this.upsertCustomer(createBookingDto.customer);

    // 6. Create address
    const address = await this.createAddress(
      customer.id,
      createBookingDto.address
    );

    // 7. Generate booking reference
    const bookingReference = await this.generateBookingReference();

    // 8. Create booking in transaction
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            customerId: customer.id,
            serviceId: service.id,
            addressId: address.id,
            scheduledDate: parseISO(createBookingDto.scheduledDate),
            scheduledTime: parse(createBookingDto.scheduledTime, 'HH:mm', new Date()),
            durationMinutes: service.durationMinutes,
            totalPrice: new Prisma.Decimal(totalPrice),
            status: 'pending',
            bookingReference,
            specialInstructions: createBookingDto.specialInstructions || null,
          },
          include: {
            customer: true,
            service: true,
            address: true,
          },
        });

        // Create status history entry
        await tx.bookingStatusHistory.create({
          data: {
            bookingId: newBooking.id,
            fromStatus: null,
            toStatus: 'pending',
            changedBy: 'system',
            notes: 'Booking created',
          },
        });

        return newBooking;
      });

      this.logger.log(`Booking created successfully: ${booking.bookingReference}`);

      return this.mapToResponseDto(booking);
    } catch (error) {
      this.logger.error('Failed to create booking', error);
      throw new InternalServerErrorException('Failed to create booking');
    }
  }

  /**
   * Validate that service exists and is active
   */
  private async validateService(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${serviceId} not found`);
    }

    if (!service.isActive) {
      throw new BadRequestException('Selected service is not available');
    }

    return service;
  }

  /**
   * Validate scheduling rules
   */
  private validateScheduling(scheduledDate: string, scheduledTime: string): void {
    const bookingDate = parseISO(scheduledDate);
    const today = startOfDay(new Date());
    const minDate = addDays(today, 1); // Must book at least 1 day in advance
    const maxDate = addDays(today, 90); // Can book up to 90 days ahead

    // Check if date is in the past
    if (isBefore(bookingDate, minDate)) {
      throw new BadRequestException(
        'Booking must be made at least 1 day in advance'
      );
    }

    // Check if date is too far in the future
    if (isAfter(bookingDate, maxDate)) {
      throw new BadRequestException(
        'Bookings can only be made up to 90 days in advance'
      );
    }

    // Validate time format and business hours
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    
    if (hours < 8 || hours >= 18) {
      throw new BadRequestException(
        'Bookings are only available between 8:00 AM and 6:00 PM'
      );
    }

    // Only allow bookings on the hour or half-hour
    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestException(
        'Bookings must be scheduled on the hour or half-hour (e.g., 10:00, 10:30)'
      );
    }
  }

  /**
   * Check if time slot is available
   */
  private async checkAvailability(
    scheduledDate: string,
    scheduledTime: string
  ): Promise<void> {
    const date = parseISO(scheduledDate);
    const time = parse(scheduledTime, 'HH:mm', new Date());

    // Check for existing bookings at this time
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        scheduledDate: date,
        scheduledTime: time,
        status: {
          in: ['pending', 'confirmed'],
        },
      },
    });

    // For MVP, allow only 1 booking per slot (can be configured later)
    const maxConcurrentBookings = 1;

    if (existingBookings.length >= maxConcurrentBookings) {
      throw new BadRequestException(
        'This time slot is no longer available. Please select a different time.'
      );
    }

    // Check availability_slots table if it exists
    const availabilitySlot = await this.prisma.availabilitySlot.findUnique({
      where: {
        slotDate_slotTime: {
          slotDate: date,
          slotTime: time,
        },
      },
    });

    if (availabilitySlot && !availabilitySlot.isAvailable) {
      throw new BadRequestException(
        'This time slot is blocked. Please select a different time.'
      );
    }
  }

  /**
   * Calculate total price based on service
   * For MVP, price = base price
   * Can be extended with: square footage multipliers, add-ons, discounts, etc.
   */
  private calculatePrice(basePrice: Prisma.Decimal): number {
    return Number(basePrice);
  }

  /**
   * Create or update customer (upsert by email)
   */
  private async upsertCustomer(customerDto: CreateBookingDto['customer']) {
    return this.prisma.customer.upsert({
      where: { email: customerDto.email },
      update: {
        firstName: customerDto.firstName,
        lastName: customerDto.lastName,
        phone: customerDto.phone,
      },
      create: {
        email: customerDto.email,
        firstName: customerDto.firstName,
        lastName: customerDto.lastName,
        phone: customerDto.phone,
      },
    });
  }

  /**
   * Create address for customer
   */
  private async createAddress(
    customerId: string,
    addressDto: CreateBookingDto['address']
  ) {
    return this.prisma.address.create({
      data: {
        customerId,
        streetAddress: addressDto.streetAddress,
        apartmentUnit: addressDto.apartmentUnit || null,
        city: addressDto.city,
        stateProvince: addressDto.stateProvince,
        postalCode: addressDto.postalCode,
        country: addressDto.country || 'US',
      },
    });
  }

  /**
   * Generate unique booking reference
   * Format: BK-YYYY-NNNNNN (e.g., BK-2024-000001)
   */
  private async generateBookingReference(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = process.env.BOOKING_REFERENCE_PREFIX || 'BK';

    // Get count of bookings this year
    const count = await this.prisma.booking.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    // Generate reference with zero-padded counter
    const counter = (count + 1).toString().padStart(6, '0');
    const reference = `${prefix}-${year}-${counter}`;

    // Verify uniqueness (should be unique due to counter, but double-check)
    const existing = await this.prisma.booking.findUnique({
      where: { bookingReference: reference },
    });

    if (existing) {
      // Fallback: add random suffix
      const randomSuffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      return `${reference}-${randomSuffix}`;
    }

    return reference;
  }

  /**
   * Find booking by reference
   */
  async findByReference(reference: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference: reference },
      include: {
        customer: true,
        service: true,
        address: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${reference} not found`);
    }

    return this.mapToResponseDto(booking);
  }

  /**
   * Get all bookings (for admin)
   */
  async findAll(status?: string): Promise<BookingResponseDto[]> {
    const bookings = await this.prisma.booking.findMany({
      where: status ? { status } : undefined,
      include: {
        customer: true,
        service: true,
        address: true,
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    return bookings.map((booking) => this.mapToResponseDto(booking));
  }

  /**
   * Map Prisma booking to response DTO
   */
  private mapToResponseDto(booking: any): BookingResponseDto {
    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.status,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      durationMinutes: booking.durationMinutes,
      totalPrice: Number(booking.totalPrice),
      customer: {
        id: booking.customer.id,
        email: booking.customer.email,
        firstName: booking.customer.firstName,
        lastName: booking.customer.lastName,
        phone: booking.customer.phone,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        description: booking.service.description,
        basePrice: Number(booking.service.basePrice),
      },
      address: {
        id: booking.address.id,
        streetAddress: booking.address.streetAddress,
        apartmentUnit: booking.address.apartmentUnit,
        city: booking.address.city,
        stateProvince: booking.address.stateProvince,
        postalCode: booking.address.postalCode,
        country: booking.address.country,
      },
      specialInstructions: booking.specialInstructions,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }
}