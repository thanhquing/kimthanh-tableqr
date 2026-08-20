import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { PaymentService } from './payment.service'
import { BillingAction } from './billing-action.decorator'

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
// Đường thoát khi quá hạn: owner luôn tạo được hướng dẫn thanh toán.
@BillingAction('admin-account-write')
export class PaymentIntentController {
  constructor(private readonly payments: PaymentService) {}

  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) { return this.payments.summary(user.restaurantId) }

  @Post('payment-intents')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: { provider?: unknown }) {
    return this.payments.createIntent(user.restaurantId, typeof body.provider === 'string' ? body.provider : 'sepay')
  }

  @Post('cancel') @HttpCode(200)
  cancel(@CurrentUser() user: AuthenticatedUser) { return this.payments.cancel(user.restaurantId, `owner:${user.id}`) }

  @Post('reactivate') @HttpCode(200)
  reactivate(@CurrentUser() user: AuthenticatedUser) { return this.payments.reactivate(user.restaurantId, `owner:${user.id}`) }
}
