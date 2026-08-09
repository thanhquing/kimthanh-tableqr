import { Module } from '@nestjs/common'
import { AuthModule } from './auth/auth.module'
import { HealthController } from './health.controller'
import { GuestModule } from './guest/guest.module'

@Module({
  imports: [AuthModule, GuestModule],
  controllers: [HealthController],
})
export class AppModule {}
