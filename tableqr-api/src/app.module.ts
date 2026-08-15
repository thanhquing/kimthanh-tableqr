import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health.controller'
import { GuestModule } from './guest/guest.module'
import { StaffModule } from './staff/staff.module'
import { AdminModule } from './admin/admin.module'
import { BillingModule } from './billing/billing.module'

@Module({
  imports: [AuthModule, GuestModule, StaffModule, AdminModule, BillingModule],
  controllers: [HealthController],
})
export class AppModule {}
