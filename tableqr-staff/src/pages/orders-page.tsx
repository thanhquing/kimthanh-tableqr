import { Button } from '@kimthanh-tableqr/ui'
import { useStaffAuth } from '../features/auth/auth-context'
import { simulateStaffOrder } from '../lib/api/staff'
import { useOrderStream } from '../lib/realtime'
export function OrdersPage() { const { auth } = useStaffAuth(); const stream = useOrderStream(); return <div className="staff-orders-placeholder"><strong>Đơn bếp · {stream.orders.length}</strong>{import.meta.env.VITE_USE_MOCK === 'true' ? <Button onClick={() => auth && void simulateStaffOrder(auth.token).then(stream.refetch)} variant="secondary">Giả lập đơn mới</Button> : null}</div> }
