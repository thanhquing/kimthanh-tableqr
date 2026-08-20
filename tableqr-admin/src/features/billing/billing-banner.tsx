import { cancellationNoticeMessage, graceWarningMessage, restaurantInactiveMessage } from '@kimthanh-tableqr/contracts'
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

  // Đã yêu cầu ngừng gia hạn thì nhắc thanh toán là sai: nói đúng ngày dừng và
  // chỉ sang đường bật lại.
  // Trừ khi quán bị tạm ngưng: lúc đó phải chỉ sang hỗ trợ, huỷ gia hạn là phụ.
  const canceled = subscription.cancelAtPeriodEnd && subscription.status !== 'SUSPENDED'
  const message = canceled
    ? cancellationNoticeMessage(subscription.serviceEndsAt)
    : subscription.status === 'GRACE' && subscription.graceEndsAt
      ? graceWarningMessage(subscription.graceEndsAt)
      : subscription.status === 'PAST_DUE' || subscription.status === 'SUSPENDED'
        ? restaurantInactiveMessage('owner', subscription.status)
        : null
  if (!message) return null

  const tone = canceled ? 'canceled' : subscription.status.toLowerCase()
  return <div className={`admin-billing-banner admin-billing-banner--${tone}`} role="status">
    <AlertTriangle size={18} />
    <p>{message}</p>
    <Link to="/billing">{canceled ? 'Bật lại dịch vụ' : subscription.status === 'SUSPENDED' ? 'Xem chi tiết' : 'Thanh toán'}</Link>
  </div>
}
