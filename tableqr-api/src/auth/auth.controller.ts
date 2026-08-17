import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { BillingAction } from '../billing/billing-action.decorator'

type StaffLoginBody = { staffLoginCode?: unknown; pin?: unknown }
type OwnerLoginBody = { email?: unknown; password?: unknown }
type OwnerRegistrationBody = { restaurantName?: unknown; ownerDisplayName?: unknown; email?: unknown; password?: unknown; staffPin?: unknown }

@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Controller()
// Đăng nhập/đăng ký/ghép thiết bị không phải ghi nghiệp vụ: chủ quán quá hạn vẫn
// phải vào được để thanh toán.
@BillingAction('exempt')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('staff/auth/login')
  @HttpCode(HttpStatus.OK)
  async loginStaff(@Body() body: StaffLoginBody) {
    if (typeof body.staffLoginCode !== 'string' || typeof body.pin !== 'string') return this.auth.loginStaff('', '')
    return this.auth.loginStaff(body.staffLoginCode, body.pin)
  }

  @Post('staff/device-pairings/:pairingToken/claim')
  @HttpCode(HttpStatus.OK)
  claimStaffDevicePairing(@Param('pairingToken') pairingToken: string) {
    return this.auth.claimStaffDevicePairing(pairingToken)
  }

  @Post('admin/auth/login')
  @HttpCode(HttpStatus.OK)
  async loginOwner(@Body() body: OwnerLoginBody) {
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return this.auth.loginOwner('', '')
    }
    return this.auth.loginOwner(body.email, body.password)
  }

  @Post('public/owner-registration')
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  registerOwner(@Body() body: OwnerRegistrationBody) {
    return this.auth.registerOwner(body)
  }
}
