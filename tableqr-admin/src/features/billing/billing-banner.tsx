import { graceWarningMessage, restaurantInactiveMessage } from '@kimthanh-tableqr/contracts'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getBillingSummary } from '../../lib/api/admin'
import { useAdminAuth } from '../auth/auth-context'

/**
 * Banner bắt buộc hiện suốt kỳ gia hạn và khi quá hạn (`SA-01`): chủ quán phải
 * thấy trạng thái và đường thanh toán ở mọi trang, không chỉ ở trang thanh toán.
 */
export function BillingBanner() {
  const { auth } = useAdminAuth()
  const summary = useQuery({ enabled: Boolean(auth), queryFn: () => getBillingSummary(auth!.token), queryKey: ['admin-billing'] })
  const subscription = summary.data?.subscription
  if (!subscription) return null

  const message = subscription.status === 'GRACE' && subscription.graceEndsAt
    ? graceWarningMessage(subscription.graceEndsAt)
    : subscription.status === 'PAST_DUE' || subscription.status === 'SUSPENDED'
      ? restaurantInactiveMessage('owner', subscription.status)
      : null
  if (!message) return null

  return <div className={`admin-billing-banner admin-billing-banner--${subscription.status.toLowerCase()}`} role="status">
    <AlertTriangle size={18} />
    <p>{message}</p>
    <Link to="/billing">{subscription.status === 'SUSPENDED' ? 'Xem chi tiết' : 'Thanh toán'}</Link>
  </div>
}
