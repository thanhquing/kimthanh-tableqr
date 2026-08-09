import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthService } from './auth.service'

type StaffLoginBody = { pin?: unknown }
type OwnerLoginBody = { email?: unknown; password?: unknown }

@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('staff/auth/login')
  @HttpCode(HttpStatus.OK)
  async loginStaff(@Body() body: StaffLoginBody) {
    if (typeof body.pin !== 'string' || body.pin.length === 0) return this.auth.loginStaff('')
    return this.auth.loginStaff(body.pin)
  }

  @Post('admin/auth/login')
  @HttpCode(HttpStatus.OK)
  async loginOwner(@Body() body: OwnerLoginBody) {
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      return this.auth.loginOwner('', '')
    }
    return this.auth.loginOwner(body.email, body.password)
  }
}
