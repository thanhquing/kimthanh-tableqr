import { EmptyState } from '@kimthanh-tableqr/ui'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

export function CartPage() {
  const { qrToken } = useTableSessionContext()

  return (
    <main className="guest-route-state">
      <EmptyState
        action={<Link className="kt-btn kt-btn-secondary" to={`/t/${qrToken}`}>Quay lại thực đơn</Link>}
        description="Hãy chọn món trong thực đơn."
        title="Giỏ hàng đang trống"
      />
    </main>
  )
}
