import { List } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'
import { useCart } from '../features/cart/cart-context'
import { formatVnd } from '@kimthanh-tableqr/contracts'

interface GuestShellProps {
  readonly children: ReactNode
}

export function GuestShell({ children }: GuestShellProps) {
  const { bootstrap, qrToken } = useTableSessionContext()
  const { itemCount, totalVnd } = useCart()

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
    </div>
  )
}
