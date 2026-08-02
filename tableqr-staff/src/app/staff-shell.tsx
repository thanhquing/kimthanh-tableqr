import { ChefHat } from 'lucide-react'
import { type ReactNode } from 'react'
import { useStaffAuth } from '../features/auth/auth-context'
export function StaffShell({ children }: { readonly children: ReactNode }) { const { auth, logout } = useStaffAuth(); return <div className="staff-app"><header className="staff-header"><ChefHat size={28} /><strong>Bếp Kim Thành</strong><span>{auth?.displayName}</span><button onClick={logout} type="button">Đăng xuất</button></header><main>{children}</main></div> }
