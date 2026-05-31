import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  homeLat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  homeLng?: number;
}
