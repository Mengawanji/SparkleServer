import { IsEmail, IsNotEmpty } from 'class-validator';

export class SubscribeDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;
}