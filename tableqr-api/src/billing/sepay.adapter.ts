import { createHmac, timingSafeEqual } from 'node:crypto'
import { HttpException, Injectable, Logger } from '@nestjs/common'
import type { PaymentProviderAdapter, VerifiedPaymentEvent } from './payment-provider'

const reject = (reason: string): never => {
  Logger.warn(`SePay webhook rejected: ${reason}`, 'SepayAdapter')
  throw new HttpException({ error: { code: 'WEBHOOK_INVALID', message: 'Webhook thanh toán không hợp lệ.', details: null } }, 401)
}

@Injectable()
export class SepayAdapter implements PaymentProviderAdapter {
  readonly provider = 'sepay'

  paymentInstruction(input: { paymentCode: string; amountVnd: number }) {
    return {
      provider: this.provider,
      paymentCode: input.paymentCode,
      amountVnd: input.amountVnd,
      transferContent: input.paymentCode,
      bankName: process.env.SEPAY_BANK_NAME?.trim() || null,
      bankAccount: process.env.SEPAY_BANK_ACCOUNT?.trim() || null,
    }
  }

  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): VerifiedPaymentEvent {
    const secret = process.env.SEPAY_WEBHOOK_SECRET
    const timestamp = typeof headers['x-sepay-timestamp'] === 'string' ? headers['x-sepay-timestamp'] : ''
    const signature = typeof headers['x-sepay-signature'] === 'string' ? headers['x-sepay-signature'] : ''
    if (!secret) reject('missing_secret')
    if (!/^\d+$/.test(timestamp)) reject('invalid_timestamp')
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) reject('expired_timestamp')
    if (!signature.startsWith('sha256=')) reject('invalid_signature_format')
    const expected = `sha256=${createHmac('sha256', secret as string).update(`${timestamp}.${rawBody.toString('utf8')}`).digest('hex')}`
    if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) reject(`signature_mismatch_body_bytes=${rawBody.length}`)
    let payload: Record<string, unknown>
    try { payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown> } catch { reject('invalid_json') }
    const eventId = typeof payload!.id === 'number' || typeof payload!.id === 'string' ? String(payload!.id) : ''
    const paymentCode = typeof payload!.code === 'string' ? payload!.code : ''
    const amountVnd = typeof payload!.transferAmount === 'number' ? payload!.transferAmount : 0
    if (!eventId || !paymentCode || !Number.isInteger(amountVnd) || amountVnd < 1) reject('invalid_payment_payload')
    return { provider: this.provider, eventId, paymentCode, amountVnd, isIncoming: payload!.transferType === 'in', payload: payload! }
  }
}
