import { 
  IsEmail, 
  IsEnum, 
  IsInt, 
  IsString, 
  Min, 
  IsDateString,
  Matches,
  MinLength,
  MaxLength
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CleaningType {
  REGULAR = 'REGULAR',
  DEEP = 'DEEP',
  MOVE_OUT_MOVE_IN = 'MOVE_OUT_MOVE_IN',
}

export class CreateBookingDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123 Main St, Apt 4B, New York, NY 10001' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  address: string;

  @ApiProperty({ enum: CleaningType })
  @IsEnum(CleaningType)
  cleaningType: CleaningType;

  @ApiProperty({ example: 3, minimum: 0 })
  @IsInt()
  @Min(0)
  numberOfBedrooms: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  numberOfBathrooms: number;

  @ApiProperty({ example: '2024-03-15' })
  @IsDateString()
  preferredDate: string;

  @ApiProperty({ example: '14:00', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format (24-hour)',
  })
  preferredTime: string;
}