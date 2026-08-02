import { List } from 'lucide-react'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTableSessionContext } from '../features/table-session/table-session-context'

interface GuestShellProps {
  readonly children: ReactNode
}

export function GuestShell({ children }: GuestShellProps) {
  const { bootstrap, qrToken } = useTableSessionContext()

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
    </div>
  )
}
