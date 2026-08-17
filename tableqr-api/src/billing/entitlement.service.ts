import { HttpException, Injectable } from '@nestjs/common'
import {
  allowsBillingAction,
  dueDunningDays,
  dunningNoticeAt,
  graceStartedAt,
  nextSubscriptionState,
  reactivatesOnPayment,
  restaurantInactiveMessage,
  type BillingAction,
  type BillingAudience,
  type SubscriptionStatus,
} from '@kimthanh-tableqr/contracts'
import { PrismaService, type TenantTransaction } from '../prisma.service'

type SubscriptionRow = { id: string; status: SubscriptionStatus; trialEndsAt: Date; graceEndsAt: Date | null; currentPeriodEndsAt: Date | null }

@Injectable()
export class EntitlementService {
  constructor(private readonly prisma: PrismaService) {}

  async status(restaurantId: string, now = new Date()): Promise<SubscriptionStatus> {
    return this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { restaurantId } })
      // A restaurant can pay its next cycle before the trial/current period
      // expires. Promote that already-paid cycle only once its own period has
      // started; this preserves the promised trial and avoids shortening a
      // live subscription.
      const paidCycle = await tx.subscriptionCycle.findFirst({
        where: { subscriptionId: subscription.id, status: 'PAID', periodStartsAt: { lte: now }, periodEndsAt: { gt: now } },
        orderBy: { periodStartsAt: 'desc' },
      })
      // Quán bị tạm ngưng chỉ mở lại bằng hỗ trợ thủ công: tiền vào không tự kích hoạt.
      if (paidCycle && reactivatesOnPayment(subscription.status) && subscription.currentPeriodEndsAt?.valueOf() !== paidCycle.periodEndsAt.valueOf()) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE', graceEndsAt: null, currentPeriodStartsAt: paidCycle.periodStartsAt, currentPeriodEndsAt: paidCycle.periodEndsAt },
        })
        await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: 'ACTIVE' } })
        await this.recordEvents(tx, restaurantId, subscription.id, [{ type: 'ACTIVATED', dunningDay: 0, occurredAt: paidCycle.periodStartsAt }])
        return 'ACTIVE'
      }
      const next = nextSubscriptionState(subscription, now)
      if (next.status !== subscription.status || next.graceEndsAt?.valueOf() !== subscription.graceEndsAt?.valueOf()) {
        await tx.subscription.update({ where: { id: subscription.id }, data: next })
        await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: next.status } })
      }
      await this.recordDunning(tx, restaurantId, { ...subscription, ...next }, now)
      return next.status
    })
  }

  /** Chặn thao tác bị cấm bằng đúng copy của từng đối tượng. */
  async assert(restaurantId: string, action: BillingAction, audience: BillingAudience, now = new Date()): Promise<void> {
    const status = await this.status(restaurantId, now)
    if (allowsBillingAction(status, action)) return
    throw new HttpException({ error: { code: 'RESTAURANT_INACTIVE', message: restaurantInactiveMessage(audience, status), details: null } }, 403)
  }

  /** Nhắc gia hạn đã ghi trong kỳ grace hiện tại — admin phải hiển thị được. */
  async dunningNotices(tx: TenantTransaction, subscription: { id: string; graceEndsAt: Date | null }): Promise<Array<{ day: number; occurredAt: Date }>> {
    if (!subscription.graceEndsAt) return []
    const notices = await tx.subscriptionEvent.findMany({
      where: { subscriptionId: subscription.id, type: 'DUNNING_NOTICE', occurredAt: { gte: graceStartedAt(subscription.graceEndsAt) } },
      select: { dunningDay: true, occurredAt: true },
      orderBy: { occurredAt: 'asc' },
    })
    return notices.map(({ dunningDay, occurredAt }) => ({ day: dunningDay, occurredAt }))
  }

  /**
   * Ghi mốc grace/nhắc/quá hạn. `occurredAt` suy ra từ `graceEndsAt` nên hai
   * request song song ghi cùng một hàng và unique key nuốt bản trùng.
   */
  private async recordDunning(tx: TenantTransaction, restaurantId: string, subscription: SubscriptionRow & { status: SubscriptionStatus }, now: Date): Promise<void> {
    const graceEndsAt = subscription.graceEndsAt
    if (!graceEndsAt || (subscription.status !== 'GRACE' && subscription.status !== 'PAST_DUE')) return
    const events: Array<{ type: 'GRACE_STARTED' | 'DUNNING_NOTICE' | 'PAST_DUE'; dunningDay: number; occurredAt: Date }> = [
      { type: 'GRACE_STARTED', dunningDay: 0, occurredAt: graceStartedAt(graceEndsAt) },
      ...dueDunningDays(graceEndsAt, now).map((day) => ({ type: 'DUNNING_NOTICE' as const, dunningDay: day, occurredAt: dunningNoticeAt(graceEndsAt, day) })),
    ]
    if (subscription.status === 'PAST_DUE') events.push({ type: 'PAST_DUE', dunningDay: 0, occurredAt: graceEndsAt })
    await this.recordEvents(tx, restaurantId, subscription.id, events)
  }

  private async recordEvents(tx: TenantTransaction, restaurantId: string, subscriptionId: string, events: Array<{ type: 'GRACE_STARTED' | 'DUNNING_NOTICE' | 'PAST_DUE' | 'ACTIVATED'; dunningDay: number; occurredAt: Date }>): Promise<void> {
    if (!events.length) return
    await tx.subscriptionEvent.createMany({ data: events.map((event) => ({ restaurantId, subscriptionId, ...event })), skipDuplicates: true })
  }
}
