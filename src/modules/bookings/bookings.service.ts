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
import { Prisma, BookingStatus, ServiceFrequency, TimeSlot } from '@prisma/client';
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
    const { dateTime, timeSlot } = this.validateScheduling(
      createBookingDto.scheduledDate,
      createBookingDto.scheduledTime
    );

    // 3. Check availability
    await this.checkAvailability(dateTime);

    // 4. Calculate pricing
    const pricing = this.calculatePricing(service.basePrice);

    // 5. Create or find customer (via user)
    const user = await this.upsertUser(createBookingDto.customer);
    
    // Get or create customer record
    const customer = await this.getOrCreateCustomer(user.id);

    // 6. Create address
    const address = await this.createAddress(
      customer.id,
      createBookingDto.address
    );

    // 7. Generate booking reference
    const reference = await this.generateBookingReference();

    // 8. Create booking in transaction
    try {
      const booking = await this.prisma.$transaction(async (tx) => {
        // Create booking
        const newBooking = await tx.booking.create({
          data: {
            customerId: customer.id,
            serviceId: service.id,
            addressId: address.id,
            reference,
            status: BookingStatus.PENDING,
            date: dateTime,
            startTime: dateTime,
            timeSlot: timeSlot,
            estimatedHours: service.duration / 60, // Convert minutes to hours
            subtotal: pricing.subtotal,
            taxRate: pricing.taxRate,
            taxAmount: pricing.taxAmount,
            totalAmount: pricing.totalAmount,
            frequency: ServiceFrequency.ONE_TIME,
            isRecurring: false,
            specialInstructions: createBookingDto.specialInstructions || null,
          },
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            service: true,
            address: true,
          },
        });

        return newBooking;
      });

      this.logger.log(`Booking created successfully: ${booking.reference}`);

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
   * Validate scheduling rules and determine time slot
   */
  private validateScheduling(scheduledDate: string, scheduledTime: string): { 
    dateTime: Date; 
    timeSlot: TimeSlot 
  } {
    const date = parseISO(scheduledDate);
    const time = parse(scheduledTime, 'HH:mm', new Date());
    
    // Combine date and time
    const dateTime = new Date(date);
    dateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

    const today = startOfDay(new Date());
    const minDate = startOfDay(addDays(today, 1)); // Must book at least 1 day in advance
    const maxDate = startOfDay(addDays(today, 90)); // Can book up to 90 days ahead

    // Check if date is at least 1 day in advance
    if (isBefore(dateTime, minDate)) {
      throw new BadRequestException(
        'Booking must be made at least 1 day in advance'
      );
    }

    // Check if date is too far in the future
    if (isAfter(dateTime, maxDate)) {
      throw new BadRequestException(
        'Bookings can only be made up to 90 days in advance'
      );
    }

    // Validate business hours (8 AM to 8 PM based on your TimeSlot enum)
    const hour = time.getHours();
    if (hour < 8 || hour >= 20) {
      throw new BadRequestException(
        'Bookings are only available between 8:00 AM and 8:00 PM'
      );
    }

    // Only allow bookings on the hour or half-hour
    const minutes = time.getMinutes();
    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestException(
        'Bookings must be scheduled on the hour or half-hour (e.g., 10:00, 10:30)'
      );
    }

    // Determine time slot based on hour
    let timeSlot: TimeSlot;
    if (hour < 12) {
      timeSlot = TimeSlot.MORNING_8_12;
    } else if (hour < 16) {
      timeSlot = TimeSlot.AFTERNOON_12_4;
    } else {
      timeSlot = TimeSlot.EVENING_4_8;
    }

    return { dateTime, timeSlot };
  }

  /**
   * Check if time slot is available
   */
  private async checkAvailability(dateTime: Date): Promise<void> {
    // Check for existing bookings at this time
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        date: dateTime,
        status: {
          in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
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

    // Check availability slots for cleaners
    const availabilities = await this.prisma.availability.findMany({
      where: {
        date: dateTime,
        startTime: { lte: dateTime },
        endTime: { gte: addMinutes(dateTime, 30) }, // Assuming 30 min minimum
        isAvailable: true,
      },
      include: {
        cleaner: {
          include: {
            user: true,
          },
        },
      },
    });

    if (availabilities.length === 0) {
      throw new BadRequestException(
        'No cleaners available for this time slot. Please select a different time.'
      );
    }
  }

  /**
   * Calculate pricing details
   */
  private calculatePricing(basePrice: number): {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  } {
    const subtotal = basePrice;
    const taxRate = 0.08; // 8% tax rate (from your schema default)
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return {
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
    };
  }

  /**
   * Create or update user (by email)
   */
  private async upsertUser(customerDto: CreateBookingDto['customer']) {
    return this.prisma.user.upsert({
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
        passwordHash: '', // You might want to generate a temporary password
        role: 'CUSTOMER',
        isActive: true,
      },
    });
  }

  /**
   * Get or create customer record for user
   */
  private async getOrCreateCustomer(userId: string) {
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { userId },
    });

    if (existingCustomer) {
      return existingCustomer;
    }

    return this.prisma.customer.create({
      data: {
        userId,
        preferences: {},
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
    // Check if customer already has this address as default
    const existingDefaultAddress = await this.prisma.address.findFirst({
      where: {
        customerId,
        isDefault: true,
      },
    });

    return this.prisma.address.create({
      data: {
        customerId,
        label: 'Home', // Default label, you might want to make this configurable
        street: addressDto.streetAddress,
        apartment: addressDto.apartmentUnit || null,
        city: addressDto.city,
        state: addressDto.stateProvince,
        postalCode: addressDto.postalCode,
        country: addressDto.country || 'US',
        isDefault: !existingDefaultAddress, // Set as default if no default exists
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
      where: { reference },
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
      where: { reference },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
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
    // Convert string status to BookingStatus enum if provided
    const whereCondition: any = {};
    if (status) {
      whereCondition.status = status as BookingStatus;
    }
    
    const bookings = await this.prisma.booking.findMany({
      where: whereCondition,
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        service: true,
        address: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return bookings.map((booking) => this.mapToResponseDto(booking));
  }

  /**
   * Map Prisma booking to response DTO
   */
  private mapToResponseDto(booking: any): BookingResponseDto {
    // Create scheduledTime Date object from booking.startTime
    let scheduledTime: Date;
    if (booking.startTime instanceof Date) {
      scheduledTime = booking.startTime;
    } else if (typeof booking.startTime === 'string') {
      scheduledTime = new Date(booking.startTime);
    } else {
      // Create a default time if not available
      scheduledTime = new Date(booking.date);
      scheduledTime.setHours(9, 0, 0, 0); // Default to 9:00 AM
    }

    return {
      id: booking.id,
      bookingReference: booking.reference,
      status: booking.status,
      scheduledDate: booking.date,
      scheduledTime: scheduledTime,
      durationMinutes: booking.service?.duration || 0,
      totalPrice: booking.totalAmount || new Prisma.Decimal(0),
      customer: {
        id: booking.customer?.id || '',
        email: booking.customer?.user?.email || '',
        firstName: booking.customer?.user?.firstName || '',
        lastName: booking.customer?.user?.lastName || '',
        phone: booking.customer?.user?.phone || '',
      },
      service: {
        id: booking.service?.id || '',
        name: booking.service?.name || '',
        description: booking.service?.description || null,
        basePrice: booking.service?.basePrice || new Prisma.Decimal(0),
      },
      address: {
        id: booking.address?.id || '',
        streetAddress: booking.address?.street || '',
        apartmentUnit: booking.address?.apartment || null,
        city: booking.address?.city || '',
        stateProvince: booking.address?.state || '',
        postalCode: booking.address?.postalCode || '',
        country: booking.address?.country || 'US',
      },
      specialInstructions: booking.specialInstructions || null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  /**
   * Update booking status
   */
  async updateStatus(
    reference: string,
    status: BookingStatus,
    notes?: string
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${reference} not found`);
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status,
        ...(status === BookingStatus.CONFIRMED && { confirmedAt: new Date() }),
        ...(status === BookingStatus.COMPLETED && { completedAt: new Date() }),
        ...(status === BookingStatus.CANCELLED && { cancelledAt: new Date() }),
        ...(notes && { specialInstructions: notes }),
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        service: true,
        address: true,
      },
    });

    this.logger.log(`Booking ${reference} status updated to ${status}`);

    return this.mapToResponseDto(updatedBooking);
  }

  /**
   * Get bookings for a specific customer
   */
  async findByCustomer(userId: string): Promise<BookingResponseDto[]> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId },
      include: {
        bookings: {
          include: {
            customer: {
              include: {
                user: true,
              },
            },
            service: true,
            address: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!customer) {
      return [];
    }

    return customer.bookings.map((booking) => this.mapToResponseDto(booking));
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(reference: string, reason?: string): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${reference} not found`);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        service: true,
        address: true,
      },
    });

    this.logger.log(`Booking ${reference} cancelled`);

    return this.mapToResponseDto(updatedBooking);
  }

  /**
   * Assign cleaner to booking
   */
  async assignCleaner(
    reference: string,
    cleanerId: string
  ): Promise<BookingResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { reference },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference ${reference} not found`);
    }

    const cleaner = await this.prisma.cleaner.findUnique({
      where: { id: cleanerId },
    });

    if (!cleaner) {
      throw new NotFoundException(`Cleaner with ID ${cleanerId} not found`);
    }

    if (!cleaner.isAvailable) {
      throw new BadRequestException('Cleaner is not available');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: booking.id },
      data: {
        cleanerId,
        status: BookingStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
        service: true,
        address: true,
        cleaner: {
          include: {
            user: true,
          },
        },
      },
    });

    this.logger.log(`Booking ${reference} assigned to cleaner ${cleanerId}`);

    return this.mapToResponseDto(updatedBooking);
  }
}