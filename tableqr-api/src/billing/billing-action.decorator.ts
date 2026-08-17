import { SetMetadata } from '@nestjs/common'
import type { BillingAction as BillingActionName } from '@kimthanh-tableqr/contracts'

export const BILLING_ACTION_KEY = 'billing-action'

/**
 * `exempt` chỉ dành cho route không phải ghi nghiệp vụ: đăng nhập, đăng ký,
 * webhook provider và ticket đọc stream. Mọi route ghi khác phải khai báo đúng
 * nhóm hành động, nếu không `EntitlementGuard` sẽ từ chối phục vụ.
 */
export type BillingRouteAction = BillingActionName | 'exempt'

export const BillingAction = (action: BillingRouteAction) => SetMetadata(BILLING_ACTION_KEY, action)
