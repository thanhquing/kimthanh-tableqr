import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GuestController } from './guest.controller'
import { GuestRateLimitService } from './guest-rate-limit.service'
import { GuestService } from './guest.service'

@Module({ imports: [AuthModule], controllers: [GuestController], providers: [GuestRateLimitService, GuestService] })
export class GuestModule {}
