import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { PrismaService } from './prisma.service'
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('healthz')
  healthz() {
    return { status: 'ok' }
  }

  @Get('readyz')
  async readyz() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready' })
    }
  }
}
