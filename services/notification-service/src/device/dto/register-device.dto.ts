import { IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  userId!: string;

  @IsString()
  fcmToken!: string;
}
