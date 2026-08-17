import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health.controller'
import { GuestModule } from './guest/guest.module'
import { StaffModule } from './staff/staff.module'
import { AdminModule } from './admin/admin.module'
import { BillingModule } from './billing/billing.module'
import { EntitlementGuard } from './billing/entitlement.guard'

@Module({
  imports: [AuthModule, GuestModule, StaffModule, AdminModule, BillingModule],
  controllers: [HealthController],
  // Guard toàn cục: không route ghi nào lọt qua entitlement, kể cả route thêm sau này.
  providers: [{ provide: APP_GUARD, useClass: EntitlementGuard }],
})
export class AppModule {}
