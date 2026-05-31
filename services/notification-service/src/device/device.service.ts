import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDeviceDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`User ${dto.userId} not found`);

    return this.prisma.user.update({
      where: { id: dto.userId },
      data: { fcmToken: dto.fcmToken },
      select: { id: true, fcmToken: true },
    });
  }
}
