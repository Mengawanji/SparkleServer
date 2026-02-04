import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ServiceType {
  REGULAR = 'regular',
  DEEP = 'deep',
  MOVE_IN_OUT = 'move-in-out',
}

export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  apartmentUnit?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  stateProvince: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter ISO code' })
  country?: string = 'US';
}

export class CreateCustomerDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be a valid E.164 format (e.g., +12125551234)',
  })
  phone: string;
}

export class CreateBookingDto {
  // Customer information
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  @IsNotEmpty()
  customer: CreateCustomerDto;

  // Address information
  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsNotEmpty()
  address: CreateAddressDto;

  // Service selection
  @IsUUID()
  @IsNotEmpty()
  serviceId: string;

  // Scheduling
  @IsDateString()
  @IsNotEmpty()
  scheduledDate: string; // Format: YYYY-MM-DD

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'scheduledTime must be in HH:mm format (e.g., 14:30)',
  })
  scheduledTime: string; // Format: HH:mm (24-hour)

  // Optional fields
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  specialInstructions?: string;
}