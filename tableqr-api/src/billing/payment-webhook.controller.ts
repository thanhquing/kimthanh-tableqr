import { Controller, HttpCode, Post, Req } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { PaymentService } from './payment.service'
import { SepayAdapter } from './sepay.adapter'

@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly sepay: SepayAdapter, private readonly payments: PaymentService) {}
  @Post('sepay') @HttpCode(200)
  async receiveSepay(@Req() request: RawBodyRequest<Request>) {
    const event = this.sepay.verifyWebhook(request.rawBody ?? Buffer.from(''), request.headers)
    const outcome = await this.payments.processWebhook(event)
    return { success: true, duplicate: outcome.duplicate }
  }
}
