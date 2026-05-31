import { IsEnum } from 'class-validator';
import { ShiftStatus } from '@prisma/client';

export class UpdateShiftStatusDto {
  @IsEnum(ShiftStatus)
  status!: ShiftStatus;
}
