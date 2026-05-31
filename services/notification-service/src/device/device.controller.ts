import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UsePipes(new ValidationPipe({ whitelist: true }))
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  /** Called by the staff/driver app on launch to register the FCM device token. */
  @Post('register')
  register(@Body() dto: RegisterDeviceDto) {
    return this.deviceService.register(dto);
  }
}
