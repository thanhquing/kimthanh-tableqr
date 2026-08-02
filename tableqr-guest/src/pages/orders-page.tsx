import { EmptyState } from '@kimthanh-tableqr/ui'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

export function OrdersPage() {
  const { qrToken } = useTableSessionContext()

  return (
    <main className="guest-route-state">
      <EmptyState
        action={<Link className="kt-btn kt-btn-secondary" to={`/t/${qrToken}`}>Gọi thêm món</Link>}
        description="Bạn có thể gọi thêm món bất cứ lúc nào."
        title="Chưa có đơn nào"
      />
    </main>
  )
}
