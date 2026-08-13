import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'
import { PrismaService } from '../prisma.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { RolesGuard } from './roles.guard'
import { StaffStreamTicketGuard } from './staff-stream-ticket.guard'

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET ?? 'dev-only-secret' }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    AuthService,
    JwtAuthGuard,
    StaffStreamTicketGuard,
    RolesGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [JwtModule, AuthService, JwtAuthGuard, StaffStreamTicketGuard, RolesGuard, PrismaService],
})
export class AuthModule {}
