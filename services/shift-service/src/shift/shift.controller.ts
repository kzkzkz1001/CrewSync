import { Body, Controller, Get, Param, Post, Patch } from '@nestjs/common';
import { ShiftService } from './shift.service';
import type { Shift } from '@crewsync/types';

@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post()
  create(@Body() dto: Partial<Shift>) {
    return this.shiftService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Get()
  findAll() {
    return this.shiftService.findAll();
  }

  @Patch(':id/optimize')
  optimize(@Param('id') id: string) {
    return this.shiftService.requestOptimization(id);
  }
}
