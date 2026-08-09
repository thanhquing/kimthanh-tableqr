import { Body, Controller, Get, Headers, HttpCode, Param, Post, Res } from '@nestjs/common'
import type { Response } from 'express'
import { GuestService } from './guest.service'

type CreateOrderBody = { note?: unknown; items?: unknown }
type CreateCallBody = { type?: unknown }

@Controller('guest')
export class GuestController {
  constructor(private readonly guest: GuestService) {}

  @Get('tables/:qrToken') bootstrap(@Param('qrToken') qrToken: string) { return this.guest.bootstrap(qrToken) }
  @Get('sessions/:sessionId/orders') orders(@Param('sessionId') sessionId: string) { return this.guest.orders(sessionId) }
  @Post('sessions/:sessionId/orders') async createOrder(@Param('sessionId') sessionId: string, @Headers('x-request-id') requestId: string | undefined, @Body() body: CreateOrderBody, @Res({ passthrough: true }) response: Response) {
    const result = await this.guest.createOrder(sessionId, requestId, body)
    response.status(result.reused ? 200 : 201)
    return result.order
  }
  @Post('sessions/:sessionId/calls') @HttpCode(201)
  async createCall(@Param('sessionId') sessionId: string, @Body() body: CreateCallBody, @Res({ passthrough: true }) response: Response) {
    const result = await this.guest.createCall(sessionId, body)
    response.status(result.reused ? 200 : 201)
    return result.call
  }
}
