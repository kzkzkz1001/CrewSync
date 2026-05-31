import {
  IsString,
  IsNumber,
  IsISO8601,
  IsArray,
  ArrayMinSize,
  Min,
  Max,
} from 'class-validator';

export class CreateShiftDto {
  @IsString()
  eventName!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  destLat!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  destLng!: number;

  @IsISO8601()
  startTime!: string;

  @IsString()
  vehicleId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  staffIds!: string[];
}
