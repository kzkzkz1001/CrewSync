import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShiftController } from './shift.controller';
import { ShiftService } from './shift.service';

@Module({
  imports: [HttpModule],
  controllers: [ShiftController],
  providers: [ShiftService],
})
export class ShiftModule {}
