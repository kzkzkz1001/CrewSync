import { Module } from '@nestjs/common';
import { ShiftModule } from './shift/shift.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ShiftModule, UserModule],
})
export class AppModule {}
