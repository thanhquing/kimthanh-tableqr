export const SUBSCRIPTION_STATUS = ['TRIAL', 'ACTIVE', 'GRACE', 'PAST_DUE', 'SUSPENDED'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

export function canWriteBusiness(status: SubscriptionStatus): boolean {
  return status === 'TRIAL' || status === 'ACTIVE' || status === 'GRACE'
}

const GRACE_MS = 7 * 24 * 60 * 60 * 1000

export function nextSubscriptionState(subscription: { status: SubscriptionStatus; trialEndsAt: Date; currentPeriodEndsAt: Date | null; graceEndsAt: Date | null }, now: Date): { status: SubscriptionStatus; graceEndsAt: Date | null } {
  if (subscription.status === 'SUSPENDED' || subscription.status === 'PAST_DUE') return { status: subscription.status, graceEndsAt: subscription.graceEndsAt }
  const deadline = subscription.status === 'TRIAL' ? subscription.trialEndsAt : subscription.currentPeriodEndsAt
  if ((subscription.status === 'TRIAL' || subscription.status === 'ACTIVE') && deadline && deadline <= now) return { status: 'GRACE', graceEndsAt: new Date(deadline.getTime() + GRACE_MS) }
  if (subscription.status === 'GRACE' && subscription.graceEndsAt && subscription.graceEndsAt <= now) return { status: 'PAST_DUE', graceEndsAt: subscription.graceEndsAt }
  return { status: subscription.status, graceEndsAt: subscription.graceEndsAt }
}
