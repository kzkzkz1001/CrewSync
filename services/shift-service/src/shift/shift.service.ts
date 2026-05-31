import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import type { OptimizeRouteRequest } from '@crewsync/types';

const SHIFT_INCLUDE = {
  vehicle: true,
  staff: { include: { user: true } },
  pickupNodes: true,
} as const;

@Injectable()
export class ShiftService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly http: HttpService,
  ) {}

  async create(dto: CreateShiftDto) {
    const { eventName, destLat, destLng, startTime, vehicleId, staffIds } = dto;

    // Verify all referenced staff exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: staffIds } },
      select: { id: true },
    });
    if (users.length !== staffIds.length) {
      throw new BadRequestException('One or more staffIds do not exist');
    }

    return this.prisma.shift.create({
      data: {
        eventName,
        destLat,
        destLng,
        startTime: new Date(startTime),
        vehicleId,
        staff: {
          create: staffIds.map((userId) => ({ userId })),
        },
      },
      include: SHIFT_INCLUDE,
    });
  }

  async findAll() {
    return this.prisma.shift.findMany({
      orderBy: { createdAt: 'desc' },
      include: SHIFT_INCLUDE,
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: SHIFT_INCLUDE,
    });
    if (!shift) throw new NotFoundException(`Shift ${id} not found`);
    return shift;
  }

  async updateStatus(id: string, dto: UpdateShiftStatusDto) {
    await this.findOne(id); // 404 guard
    return this.prisma.shift.update({
      where: { id },
      data: { status: dto.status },
      include: SHIFT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // 404 guard
    // Delete join records first (cascade not enabled by default in Prisma)
    await this.prisma.shiftStaff.deleteMany({ where: { shiftId: id } });
    await this.prisma.pickupNode.deleteMany({ where: { shiftId: id } });
    return this.prisma.shift.delete({ where: { id } });
  }

  async requestOptimization(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { staff: { include: { user: true } } },
    });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== ShiftStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT shifts can be optimized');
    }

    // Resolve each staff member's departure coordinates
    const staffLocations = shift.staff
      .filter((s) => s.user.homeLat != null && s.user.homeLng != null)
      .map((s) => ({
        staffId: s.userId,
        location: { lat: s.user.homeLat!, lng: s.user.homeLng! },
      }));

    if (staffLocations.length === 0) {
      throw new BadRequestException('No staff have registered home coordinates');
    }

    // Get driver's current vehicle origin (placeholder — use driver's home coords for now)
    const driverOrigin = { lat: shift.destLat, lng: shift.destLng }; // TODO: real driver origin

    const payload: OptimizeRouteRequest = {
      shiftId,
      startTime: shift.startTime.toISOString(),
      driverOrigin,
      destination: { lat: shift.destLat, lng: shift.destLng },
      staffLocations,
    };

    const routeEngineUrl =
      process.env.ROUTE_ENGINE_URL ?? 'http://route-engine:3002';

    const { data: optimized } = await firstValueFrom(
      this.http.post(`${routeEngineUrl}/api/optimize`, payload),
    );

    // Persist the returned pickup nodes and mark shift as OPTIMIZED
    await this.prisma.$transaction([
      this.prisma.pickupNode.deleteMany({ where: { shiftId } }),
      ...optimized.pickupNodes.map((node: any) =>
        this.prisma.pickupNode.create({
          data: {
            id: node.id,
            shiftId,
            lat: node.location.lat,
            lng: node.location.lng,
            address: node.address,
            estimatedAt: new Date(node.estimatedArrivalTime),
            staff: {
              connect: node.assignedStaffIds.map((uid: string) => ({
                shiftId_userId: { shiftId, userId: uid },
              })),
            },
          },
        }),
      ),
      this.prisma.shift.update({
        where: { id: shiftId },
        data: { status: ShiftStatus.OPTIMIZED },
      }),
    ]);

    return this.findOne(shiftId);
  }
}
