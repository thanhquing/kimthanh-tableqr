import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BillingOpsService } from './billing-ops.service'
import { EntitlementGuard } from './entitlement.guard'
import { EntitlementService } from './entitlement.service'
import { PaymentIntentController } from './payment-intent.controller'
import { PaymentService } from './payment.service'
import { PaymentWebhookController } from './payment-webhook.controller'
import { SepayAdapter } from './sepay.adapter'

@Module({
  imports: [AuthModule],
  controllers: [PaymentWebhookController, PaymentIntentController],
  providers: [EntitlementService, EntitlementGuard, PaymentService, SepayAdapter, BillingOpsService],
  exports: [EntitlementService, EntitlementGuard, PaymentService, BillingOpsService],
})
export class BillingModule {}
