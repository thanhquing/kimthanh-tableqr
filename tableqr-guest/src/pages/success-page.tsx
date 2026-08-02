import { EmptyState } from '@kimthanh-tableqr/ui'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

export function SuccessPage() {
  const { qrToken } = useTableSessionContext()

  return (
    <main className="guest-route-state">
      <EmptyState
        action={<Link className="kt-btn kt-btn-secondary" to={`/t/${qrToken}/orders`}>Xem đơn của bàn</Link>}
        description="Đơn của bạn đã được chuyển tới bếp."
        title="Đã gửi đơn tới bếp"
      />
    </main>
  )
}
