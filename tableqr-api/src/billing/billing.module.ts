import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { EntitlementService } from './entitlement.service'

@Module({ imports: [AuthModule], providers: [EntitlementService], exports: [EntitlementService] })
export class BillingModule {}
