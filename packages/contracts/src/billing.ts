import { formatDate } from './format.js'

export const SUBSCRIPTION_STATUS = ['TRIAL', 'ACTIVE', 'GRACE', 'PAST_DUE', 'SUSPENDED'] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number]

/** Ai dang thao tac — quyet dinh copy hien ra, khong quyet dinh quyen. */
export type BillingAudience = 'guest' | 'staff' | 'owner'

/**
 * Nhom hanh dong ghi. Nguon: ai-docs/10-saas-evolution.md §4.
 * `admin-account-write` la duong thoat duy nhat khi qua han: owner van phai
 * thanh toan va cap nhat tai khoan de tu mo lai dich vu.
 */
export type BillingAction = 'guest-write' | 'staff-write' | 'admin-business-write' | 'admin-account-write'

export function canWriteBusiness(status: SubscriptionStatus): boolean {
  return status === 'TRIAL' || status === 'ACTIVE' || status === 'GRACE'
}

/** Quyet dinh duy nhat cho moi route ghi. FE va BE phai doc cung ham nay. */
export function allowsBillingAction(status: SubscriptionStatus, action: BillingAction): boolean {
  return canWriteBusiness(status) || action === 'admin-account-write'
}

/** `SUSPENDED` chi mo lai bang ho tro thu cong — thanh toan khong tu kich hoat. */
export function reactivatesOnPayment(status: SubscriptionStatus): boolean {
  return status !== 'SUSPENDED'
}

const DAY_MS = 24 * 60 * 60 * 1000
export const GRACE_DAYS = 7
const GRACE_MS = GRACE_DAYS * DAY_MS

/** Ngay nhac gia han tinh tu luc bat dau grace. Nguon: `SA-01`. */
export const DUNNING_DAYS = [1, 3, 7] as const

export function graceStartedAt(graceEndsAt: Date): Date {
  return new Date(graceEndsAt.getTime() - GRACE_MS)
}

export function dunningNoticeAt(graceEndsAt: Date, day: number): Date {
  return new Date(graceStartedAt(graceEndsAt).getTime() + day * DAY_MS)
}

/** Cac moc nhac da den han tinh den `now` — dung de ghi audit mot lan moi moc. */
export function dueDunningDays(graceEndsAt: Date, now: Date): number[] {
  return DUNNING_DAYS.filter((day) => dunningNoticeAt(graceEndsAt, day).getTime() <= now.getTime())
}

/** Copy da chot o ai-docs/10-saas-evolution.md §4. Khong tu che chuoi khac. */
export const BILLING_INACTIVE_MESSAGE = {
  guest: 'Quán đang tạm ngưng nhận đơn. Vui lòng gọi nhân viên hỗ trợ.',
  staff: 'Quán đã hết thời gian gia hạn. Vui lòng báo chủ quán thanh toán để tiếp tục nhận đơn.',
  owner: 'Dịch vụ đang tạm ngưng. Hãy thanh toán để tiếp tục quản lý quán.',
  ownerSuspended: 'Tài khoản quán đang tạm ngưng. Vui lòng liên hệ hỗ trợ.',
} as const

export function restaurantInactiveMessage(audience: BillingAudience, status: SubscriptionStatus): string {
  if (audience === 'guest') return BILLING_INACTIVE_MESSAGE.guest
  if (audience === 'staff') return BILLING_INACTIVE_MESSAGE.staff
  return status === 'SUSPENDED' ? BILLING_INACTIVE_MESSAGE.ownerSuspended : BILLING_INACTIVE_MESSAGE.owner
}

/** Banner grace trong admin — bat buoc hien suot ky gia han. */
export function graceWarningMessage(graceEndsAtIso: string): string {
  return `Quán sẽ tạm ngưng nhận đơn sau ngày ${formatDate(graceEndsAtIso)}. Hãy thanh toán để tiếp tục sử dụng.`
}

export function nextSubscriptionState(subscription: { status: SubscriptionStatus; trialEndsAt: Date; currentPeriodEndsAt: Date | null; graceEndsAt: Date | null }, now: Date): { status: SubscriptionStatus; graceEndsAt: Date | null } {
  if (subscription.status === 'SUSPENDED' || subscription.status === 'PAST_DUE') return { status: subscription.status, graceEndsAt: subscription.graceEndsAt }
  const deadline = subscription.status === 'TRIAL' ? subscription.trialEndsAt : subscription.currentPeriodEndsAt
  if ((subscription.status === 'TRIAL' || subscription.status === 'ACTIVE') && deadline && deadline <= now) return { status: 'GRACE', graceEndsAt: new Date(deadline.getTime() + GRACE_MS) }
  if (subscription.status === 'GRACE' && subscription.graceEndsAt && subscription.graceEndsAt <= now) return { status: 'PAST_DUE', graceEndsAt: subscription.graceEndsAt }
  return { status: subscription.status, graceEndsAt: subscription.graceEndsAt }
}
