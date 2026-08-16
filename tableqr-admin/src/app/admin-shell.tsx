import { CreditCard, LayoutGrid, LogOut, Menu, Settings, TableProperties } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdminAuth } from '../features/auth/auth-context'

const links = [{ icon: Menu, label: 'Thực đơn', to: '/menu' }, { icon: TableProperties, label: 'Bàn & mã QR', to: '/tables' }, { icon: CreditCard, label: 'Thanh toán', to: '/billing' }, { icon: Settings, label: 'Cài đặt', to: '/settings' }]

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { auth, logout } = useAdminAuth()
  const restaurantName = auth?.restaurant?.name ?? 'Kim Thành'
  return <div className={open ? 'admin-app admin-app--open' : 'admin-app'}>
    <aside className="admin-sidebar"><div className="admin-brand"><LayoutGrid size={23} /><strong>{restaurantName}</strong><small>{auth?.displayName}</small></div><nav>{links.map(({ icon: Icon, label, to }) => <NavLink key={to} onClick={() => setOpen(false)} to={to}><Icon size={19} />{label}</NavLink>)}</nav><button className="admin-logout" onClick={logout} type="button"><LogOut size={18} />Đăng xuất</button></aside>
    <div className="admin-content"><header className="admin-mobile-header"><button aria-label="Mở điều hướng" onClick={() => setOpen((value) => !value)} type="button"><Menu size={22} /></button><strong>{restaurantName}</strong></header><main>{children}</main></div>
  </div>
}
