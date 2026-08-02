import { Button, EmptyState, ErrorState, LoadingSkeleton, OrderStatusBadge } from '@kimthanh-tableqr/ui'
import { formatTime, formatVnd } from '@kimthanh-tableqr/contracts'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'
import { getGuestOrders } from '../lib/api/guest'
import { getApiClientErrorMessage } from '../lib/api/client'
import { isApiClientError } from '../lib/api/client'
import { SessionClosedPage } from './session-closed-page'

export function OrdersPage() {
  const { bootstrap, qrToken } = useTableSessionContext()
  const query = useQuery({ queryFn: () => getGuestOrders(bootstrap.session.id), queryKey: ['guest-orders', bootstrap.session.id], refetchInterval: 10_000 })

  if (query.isPending) return <OrdersLoading />
  if (query.isError && isApiClientError(query.error) && query.error.body?.error.code === 'SESSION_CLOSED') return <SessionClosedPage />
  if (query.isError) return <main className="guest-route-state"><ErrorState action={<Button onClick={() => void query.refetch()} variant="secondary">Thử lại</Button>} description={getApiClientErrorMessage(query.error)} title="Không tải được đơn của bàn" /></main>
  if (!query.data.orders.length) return <main className="guest-route-state"><EmptyState action={<Link className="kt-btn kt-btn-primary" to={`/t/${qrToken}`}>Gọi thêm món</Link>} description="Bạn có thể gọi thêm món bất cứ lúc nào." title="Chưa có đơn nào" /></main>

  return <main className="guest-orders-page">
    <header className="guest-orders-page__title"><Link aria-label="Quay lại thực đơn" to={`/t/${qrToken}`}><ArrowLeft size={22} /></Link><h1>Đơn của bàn</h1></header>
    {query.data.orders.map((order) => <section className="guest-order-card" key={order.id}><header><strong>Lần gọi #{order.sequenceNo}</strong><time>{formatTime(order.createdAt)}</time><OrderStatusBadge status={order.status} /></header>{order.items.map((item) => <div className="guest-order-card__line" key={item.id}><span>{item.quantity}×</span><span><strong>{item.nameSnapshot}</strong>{item.note ? <small>↳ {item.note}</small> : null}</span><strong>{formatVnd(item.lineTotalVnd)}</strong></div>)}<footer><span>Tiền lần này</span><strong>{formatVnd(order.totalVnd)}</strong></footer></section>)}
    <section className="guest-orders-total"><small>Tổng cộng cả bàn</small><strong>{formatVnd(query.data.session.totalVnd)}</strong><em>{query.data.orders.length} lần gọi · thanh toán khi ra về</em></section>
    <footer className="guest-orders-page__footer"><Button variant="secondary">Xin tính tiền</Button><Link className="kt-btn kt-btn-primary" to={`/t/${qrToken}`}>Gọi thêm món</Link></footer>
  </main>
}

function OrdersLoading() { return <main className="guest-orders-page">{Array.from({ length: 2 }, (_, index) => <section className="guest-order-card" key={index}><LoadingSkeleton height={20} width="48%" /><LoadingSkeleton height={54} width="100%" /><LoadingSkeleton height={54} width="100%" /></section>)}</main> }
