import { LayoutGrid, Menu, Settings, TableProperties } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'

const links = [{ icon: Menu, label: 'Thực đơn', to: '/menu' }, { icon: TableProperties, label: 'Bàn & mã QR', to: '/tables' }, { icon: Settings, label: 'Cài đặt', to: '/settings' }]

export function AdminShell({ children }: { readonly children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <div className={open ? 'admin-app admin-app--open' : 'admin-app'}>
    <aside className="admin-sidebar"><div className="admin-brand"><LayoutGrid size={23} /><strong>Kim Thành</strong><small>Quản trị quán</small></div><nav>{links.map(({ icon: Icon, label, to }) => <NavLink key={to} onClick={() => setOpen(false)} to={to}><Icon size={19} />{label}</NavLink>)}</nav></aside>
    <div className="admin-content"><header className="admin-mobile-header"><button aria-label="Mở điều hướng" onClick={() => setOpen((value) => !value)} type="button"><Menu size={22} /></button><strong>Kim Thành</strong></header><main>{children}</main></div>
  </div>
}
