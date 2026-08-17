import { Bell, Check, List, ReceiptText } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'
import { useCart } from '../features/cart/cart-context'
import { formatVnd } from '@kimthanh-tableqr/contracts'
import { ToastRegion } from '@kimthanh-tableqr/ui'
import { createStaffCall } from '../lib/api/guest'
import { getApiClientErrorMessage } from '../lib/api/client'

interface GuestShellProps {
  readonly children: ReactNode
}

export function GuestShell({ children }: GuestShellProps) {
  const { bootstrap, qrToken } = useTableSessionContext()
  const { itemCount, totalVnd } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isCalled, setIsCalled] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isCalled) return undefined
    const timeout = window.setTimeout(() => setIsCalled(false), 30_000)
    return () => window.clearTimeout(timeout)
  }, [isCalled])

  async function sendCall(type: 'CALL_STAFF' | 'REQUEST_BILL') {
    if (isSending || isCalled) return
    setIsSending(true)
    setErrorMessage(null)
    // Quán quá hạn trả 403 kèm copy dành cho khách — phải hiện, không im lặng.
    try { await createStaffCall(bootstrap.session.id, { type }); setIsCalled(true); setIsOpen(false) }
    catch (error) { setErrorMessage(getApiClientErrorMessage(error)); setIsOpen(false) }
    finally { setIsSending(false) }
  }

  return (
    <div className="guest-app">
      <header className="guest-header">
        <Link className="guest-header__orders" to={`/t/${qrToken}/orders`} aria-label="Xem đơn của bàn">
          <List aria-hidden="true" size={22} />
        </Link>
        <span className="guest-header__name">{bootstrap.restaurant.name}</span>
        <span className="guest-header__table">{bootstrap.table.displayName}</span>
      </header>
      {children}
      {itemCount ? <div className="guest-cart-bar"><div><div className="guest-cart-bar__count">{itemCount} món</div><div className="guest-cart-bar__total">{formatVnd(totalVnd)}</div></div><Link className="kt-btn kt-btn-primary" to={`/t/${qrToken}/cart`}>Xem giỏ</Link></div> : null}
      {isOpen ? <div className="guest-call-menu"><button disabled={isSending} onClick={() => void sendCall('CALL_STAFF')} type="button"><Bell size={18} />Gọi nhân viên</button><button disabled={isSending} onClick={() => void sendCall('REQUEST_BILL')} type="button"><ReceiptText size={18} />Xin tính tiền</button></div> : null}
      <button aria-expanded={isOpen} aria-label={isCalled ? 'Đã báo nhân viên' : 'Gọi nhân viên'} className={`guest-call-button ${itemCount ? 'guest-call-button--raised' : ''} ${isCalled ? 'guest-call-button--done' : ''}`} disabled={isCalled || isSending} onClick={() => setIsOpen((open) => !open)} type="button">{isCalled ? <Check size={24} /> : <Bell size={24} />}</button>
      <ToastRegion toasts={errorMessage ? [{ id: 'guest-call-error', message: errorMessage }] : []} />
    </div>
  )
}
