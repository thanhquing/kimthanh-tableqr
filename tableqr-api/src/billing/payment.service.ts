import { HttpException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { randomInt } from 'node:crypto'
import { reactivatesOnPayment } from '@kimthanh-tableqr/contracts'
import { PrismaService } from '../prisma.service'
import type { PaymentProviderAdapter, VerifiedPaymentEvent } from './payment-provider'
import { EntitlementService } from './entitlement.service'
import { SepayAdapter } from './sepay.adapter'

type PaymentOutcome = { received: boolean; duplicate: boolean; settled: boolean; reason: 'settled' | 'duplicate' | 'unknown_payment' | 'not_incoming' | 'amount_mismatch' | 'already_finalized' }

const fail = (status: number, code: string, message: string): never => {
  throw new HttpException({ error: { code, message, details: null } }, status)
}

function addCalendarMonth(value: Date): Date {
  const next = new Date(value)
  next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}

@Injectable()
export class PaymentService {
  private readonly adapters: Map<string, PaymentProviderAdapter>

  constructor(private readonly prisma: PrismaService, private readonly entitlement: EntitlementService, sepay: SepayAdapter) {
    this.adapters = new Map([[sepay.provider, sepay]])
  }

  async createIntent(restaurantId: string, provider = 'sepay') {
    const adapter = this.adapters.get(provider) ?? fail(400, 'PAYMENT_PROVIDER_UNSUPPORTED', 'Nhà cung cấp thanh toán chưa được hỗ trợ.')

    return this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { restaurantId } })
      const existing = await tx.payment.findFirst({
        where: { restaurantId, provider, status: 'PENDING' },
        include: { subscriptionCycle: true },
        orderBy: { createdAt: 'desc' },
      })
      if (existing) return { paymentId: existing.id, status: existing.status, instruction: adapter.paymentInstruction(existing) }

      const now = new Date()
      const startsAt = subscription.currentPeriodEndsAt && subscription.currentPeriodEndsAt > now
        ? subscription.currentPeriodEndsAt
        : subscription.status === 'TRIAL' && subscription.trialEndsAt > now
          ? subscription.trialEndsAt
          : now
      const latestCycle = await tx.subscriptionCycle.findFirst({ where: { subscriptionId: subscription.id }, orderBy: { sequenceNo: 'desc' } })
      const cycle = await tx.subscriptionCycle.create({
        data: {
          restaurantId,
          subscriptionId: subscription.id,
          sequenceNo: (latestCycle?.sequenceNo ?? 0) + 1,
          amountVnd: subscription.priceVndSnapshot,
          periodStartsAt: startsAt,
          periodEndsAt: addCalendarMonth(startsAt),
          dueAt: startsAt,
        },
      })
      const payment = await tx.payment.create({
        data: {
          restaurantId,
          subscriptionCycleId: cycle.id,
          provider,
          paymentCode: await this.nextPaymentCode(tx),
          amountVnd: cycle.amountVnd,
        },
      })
      return { paymentId: payment.id, status: payment.status, instruction: adapter.paymentInstruction(payment) }
    })
  }

  async summary(restaurantId: string) {
    // Đọc trước khi hiển thị: trạng thái và mốc nhắc gia hạn phải đúng tại thời
    // điểm owner mở trang, không đợi request ghi kế tiếp kích hoạt lifecycle.
    await this.entitlement.status(restaurantId)
    return this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({
        where: { restaurantId },
        include: {
          plan: true,
          // Chi tra dung cac truong co trong `BillingSummaryResponse`: khong ro ri
          // khoa noi bo (restaurantId/subscriptionId) hay secret provider ra owner.
          cycles: {
            select: {
              id: true, sequenceNo: true, status: true, amountVnd: true,
              periodStartsAt: true, periodEndsAt: true, dueAt: true, paidAt: true,
              payments: { select: { id: true, provider: true, paymentCode: true, amountVnd: true, status: true, paidAt: true }, orderBy: { createdAt: 'desc' } },
            },
            orderBy: { sequenceNo: 'desc' },
            take: 12,
          },
        },
      })
      return {
        plan: { code: subscription.plan.code, name: subscription.plan.name, priceVnd: subscription.priceVndSnapshot, interval: subscription.plan.interval, featureLimits: subscription.featureLimitsSnapshot },
        subscription: { status: subscription.status, trialEndsAt: subscription.trialEndsAt, graceEndsAt: subscription.graceEndsAt, currentPeriodStartsAt: subscription.currentPeriodStartsAt, currentPeriodEndsAt: subscription.currentPeriodEndsAt },
        cycles: subscription.cycles,
        dunningNotices: await this.entitlement.dunningNotices(tx, subscription),
      }
    })
  }

  async processWebhook(event: VerifiedPaymentEvent): Promise<PaymentOutcome> {
    const candidate = await this.prisma.withPaymentCode(event.paymentCode, (tx) =>
      tx.payment.findUnique({ where: { paymentCode: event.paymentCode }, select: { id: true, restaurantId: true } }),
    )
    if (!candidate) return { received: true, duplicate: false, settled: false, reason: 'unknown_payment' }

    return this.prisma.withTenant(candidate.restaurantId, async (tx) => {
      const duplicate = await tx.paymentWebhookEvent.findUnique({ where: { provider_providerEventId: { provider: event.provider, providerEventId: event.eventId } } })
      if (duplicate) return { received: true, duplicate: true, settled: false, reason: 'duplicate' }

      let audit: { id: string }
      try {
        audit = await tx.paymentWebhookEvent.create({
          data: { restaurantId: candidate.restaurantId, provider: event.provider, providerEventId: event.eventId, payload: event.payload as Prisma.InputJsonValue },
          select: { id: true },
        })
      } catch (error) {
        // Two provider retries can arrive concurrently. The unique audit key is
        // the idempotency fence; do not turn a harmless replay into a 5xx.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return { received: true, duplicate: true, settled: false, reason: 'duplicate' }
        }
        throw error
      }
      const payment = await tx.payment.findUniqueOrThrow({ where: { id: candidate.id }, include: { subscriptionCycle: true } })
      const finalize = async (reason: PaymentOutcome['reason'], settled = false): Promise<PaymentOutcome> => {
        await tx.paymentWebhookEvent.update({ where: { id: audit.id }, data: { processedAt: new Date() } })
        return { received: true, duplicate: false, settled, reason }
      }

      if (!event.isIncoming) return finalize('not_incoming')
      if (event.amountVnd !== payment.amountVnd) return finalize('amount_mismatch')
      const claimed = await tx.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'SUCCEEDED', providerTransactionId: event.eventId, paidAt: new Date() } })
      if (!claimed.count) return finalize('already_finalized')

      const paidAt = new Date()
      await tx.subscriptionCycle.update({ where: { id: payment.subscriptionCycleId }, data: { status: 'PAID', paidAt } })
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { id: payment.subscriptionCycle.subscriptionId }, select: { status: true } })
      // Quán `SUSPENDED` chỉ mở lại bằng hỗ trợ thủ công: tiền vẫn được ghi nhận
      // và cycle vẫn `PAID`, nhưng trạng thái thuê bao không tự đổi.
      if (payment.subscriptionCycle.periodStartsAt <= paidAt && reactivatesOnPayment(subscription.status)) {
        await tx.subscription.update({
          where: { id: payment.subscriptionCycle.subscriptionId },
          data: {
            status: 'ACTIVE',
            graceEndsAt: null,
            currentPeriodStartsAt: payment.subscriptionCycle.periodStartsAt,
            currentPeriodEndsAt: payment.subscriptionCycle.periodEndsAt,
          },
        })
        await tx.restaurant.update({ where: { id: candidate.restaurantId }, data: { billingStatus: 'ACTIVE' } })
      }
      return finalize('settled', true)
    })
  }

  private async nextPaymentCode(tx: Prisma.TransactionClient): Promise<string> {
    const prefix = (process.env.SEPAY_PAYMENT_CODE_PREFIX ?? 'TQR').trim().toUpperCase()
    if (!/^[A-Z]{2,5}$/.test(prefix)) throw new Error('SEPAY_PAYMENT_CODE_PREFIX phải có 2–5 chữ cái in hoa.')
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `${prefix}${randomInt(0, 10_000_000_000).toString().padStart(10, '0')}`
      if (!await tx.payment.findUnique({ where: { paymentCode: code }, select: { id: true } })) return code
    }
    throw new Error('Không thể tạo mã thanh toán duy nhất.')
  }
}
