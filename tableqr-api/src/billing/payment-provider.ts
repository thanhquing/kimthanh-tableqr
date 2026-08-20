export type VerifiedPaymentEvent = { provider: string; eventId: string; paymentCode: string; amountVnd: number; isIncoming: boolean; payload: Record<string, unknown> }

export type PaymentInstruction = {
  provider: string
  paymentCode: string
  amountVnd: number
  transferContent: string
  bankName: string | null
  bankAccount: string | null
}

export interface PaymentProviderAdapter {
  readonly provider: string
  paymentInstruction(input: { paymentCode: string; amountVnd: number }): PaymentInstruction
  verifyWebhook(rawBody: Buffer, headers: Record<string, string | string[] | undefined>): VerifiedPaymentEvent
  /**
   * Dựng lại sự kiện từ payload đã lưu trong audit để hỗ trợ replay
   * (`SA-12`). Không ký lại chữ ký: payload này đã qua `verifyWebhook` một lần.
   */
  eventFromPayload(payload: Record<string, unknown>): VerifiedPaymentEvent
}
