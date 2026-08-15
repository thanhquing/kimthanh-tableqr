import { Injectable } from '@nestjs/common'
import { nextSubscriptionState } from '@kimthanh-tableqr/contracts'
import { PrismaService } from '../prisma.service'

export type BillingAction = 'guest-write' | 'staff-write' | 'admin-business-write' | 'admin-account-write'
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'GRACE' | 'PAST_DUE' | 'SUSPENDED'

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
      if (paidCycle && subscription.currentPeriodEndsAt?.valueOf() !== paidCycle.periodEndsAt.valueOf()) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { status: 'ACTIVE', graceEndsAt: null, currentPeriodStartsAt: paidCycle.periodStartsAt, currentPeriodEndsAt: paidCycle.periodEndsAt },
        })
        await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: 'ACTIVE' } })
        return 'ACTIVE'
      }
      const next = nextSubscriptionState(subscription, now)
      if (next.status !== subscription.status || next.graceEndsAt?.valueOf() !== subscription.graceEndsAt?.valueOf()) {
        await tx.subscription.update({ where: { id: subscription.id }, data: next })
        await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: next.status } })
      }
      return next.status
    })
  }

  async allows(restaurantId: string, action: BillingAction, now = new Date()): Promise<boolean> {
    const status = await this.status(restaurantId, now)
    return status === 'TRIAL' || status === 'ACTIVE' || status === 'GRACE' || action === 'admin-account-write' && status === 'PAST_DUE'
  }
}
