import { Module } from '@nestjs/common';
import { ShiftModule } from './shift/shift.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ShiftModule],
})
export class AppModule {}
