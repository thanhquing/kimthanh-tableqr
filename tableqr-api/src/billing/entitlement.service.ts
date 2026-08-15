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
