import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health.controller'
import { GuestModule } from './guest/guest.module'
import { StaffModule } from './staff/staff.module'

@Module({
  imports: [AuthModule, GuestModule, StaffModule],
  controllers: [HealthController],
})
export class AppModule {}
