import { EmptyState } from '@kimthanh-tableqr/ui'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

export function ItemPage() {
  const { qrToken } = useTableSessionContext()

  return (
    <main className="guest-route-state">
      <EmptyState
        action={<Link className="kt-btn kt-btn-secondary" to={`/t/${qrToken}`}>Quay lại thực đơn</Link>}
        description="Vui lòng chọn món trong thực đơn."
        title="Không mở được món"
      />
    </main>
  )
}
