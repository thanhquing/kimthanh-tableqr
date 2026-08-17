import { calcSessionTotal, formatTime, formatVnd } from '@kimthanh-tableqr/contracts'
import { Button, EmptyState, Modal, ToastRegion } from '@kimthanh-tableqr/ui'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStaffAuth } from '../features/auth/auth-context'
import { closeSession, getStaffSession, getStaffTables, paySession } from '../lib/api/staff'

export function SessionPage() {
  const { code } = useParams()
  const { auth } = useStaffAuth()
  const navigate = useNavigate()
  const [confirmReset, setConfirmReset] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [paid, setPaid] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const tables = useQuery({
    queryKey: ['staff-tables'],
    queryFn: () => getStaffTables(auth!.token),
  })
  const table = tables.data?.tables.find((item) => item.code === code)
  const detail = useQuery({
    enabled: Boolean(table?.session),
    queryKey: ['staff-session', table?.session?.id],
    queryFn: () => getStaffSession(auth!.token, table!.session!.id),
  })

  if (!table?.session) {
    return <EmptyState title="Không tìm thấy phiên" description="Bàn này hiện không có phiên phục vụ." />
  }

  if (!detail.data) {
    return <div className="staff-placeholder">Đang tải phiên...</div>
  }

  const session = table.session
  const sessionId = session.id
  const isPaid = paid || Boolean(detail.data.session.paidAt)
  const total = calcSessionTotal(detail.data.orders)

  async function pay() {
    setIsPaying(true)
    setMessage(null)
    try {
      await paySession(auth!.token, sessionId)
      setPaid(true)
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Không thể cập nhật thanh toán. Vui lòng thử lại.')
    } finally {
      setIsPaying(false)
    }
  }

  async function reset() {
    setIsResetting(true)
    setMessage(null)
    try {
      await closeSession(auth!.token, sessionId)
      navigate('/tables')
    } catch (caught) {
      setConfirmReset(false)
      setMessage(caught instanceof Error ? caught.message : 'Không thể reset bàn. Vui lòng thử lại.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="staff-session">
      <p className="staff-session__crumb"><Link to="/tables">Sơ đồ bàn</Link> › {table.displayName}</p>
      <h1>{table.displayName}</h1>
      <div className="staff-session__layout">
        <div className="staff-session__orders">
          {detail.data.orders.map((order) => (
            <article className={order.status === 'CANCELLED' ? 'staff-session-order staff-session-order--cancelled' : 'staff-session-order'} key={order.id}>
              <header><strong>Lần gọi #{order.sequenceNo}</strong><span>{formatTime(order.createdAt)}</span></header>
              {order.items.map((item) => (
                <div key={item.id}>
                  <b>{item.quantity}×</b>
                  <span>{item.nameSnapshot}{item.note ? <small>↳ {item.note}</small> : null}</span>
                  <b>{formatVnd(item.lineTotalVnd)}</b>
                </div>
              ))}
              <footer><span>{order.status === 'CANCELLED' ? 'Đã hủy - không tính tiền' : 'Tiền lần này'}</span><b>{formatVnd(order.totalVnd)}</b></footer>
            </article>
          ))}
        </div>
        <aside className="staff-session__summary">
          <section>
            <small>Tổng bill cả bàn</small>
            <strong>{formatVnd(total)}</strong>
            <p>Số lần gọi: {detail.data.orders.filter((order) => order.status !== 'CANCELLED').length}</p>
            <p>Mở phiên lúc: {formatTime(detail.data.session.openedAt)}</p>
            <p>Thanh toán: <b>{isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</b></p>
          </section>
          {isPaid ? (
            <Button block disabled={isResetting} onClick={() => setConfirmReset(true)}>Reset bàn</Button>
          ) : (
            <>
              <Button block disabled={isPaying} onClick={() => void pay()}>{isPaying ? 'Đang cập nhật...' : 'Đã thanh toán'}</Button>
              <Button block disabled={isResetting} onClick={() => setConfirmReset(true)} variant="secondary">Reset bàn</Button>
              <p className="staff-session__warning">Nên bấm “Đã thanh toán” trước khi reset</p>
            </>
          )}
        </aside>
      </div>
      <Modal
        actions={<><Button disabled={isResetting} onClick={() => setConfirmReset(false)} variant="secondary">Không</Button><Button disabled={isResetting} onClick={() => void reset()} variant={isPaid ? 'primary' : 'danger'}>{isResetting ? 'Đang reset...' : 'Reset bàn'}</Button></>}
        description={`Bàn sẽ về trạng thái trống, khách mới quét mã sẽ bắt đầu phiên mới. Đơn cũ vẫn được lưu lại.${isPaid ? '' : ' Bàn này chưa được đánh dấu đã thanh toán.'}`}
        isOpen={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={`Reset ${table.displayName}?`}
      />
      <ToastRegion toasts={message ? [{ id: 'staff-session-error', message }] : []} />
    </div>
  )
}
