import { ChefHat } from 'lucide-react'
import { type ReactNode } from 'react'
export function StaffShell({ children }: { readonly children: ReactNode }) { return <div className="staff-app"><header className="staff-header"><ChefHat size={28} /><strong>Bếp Kim Thành</strong></header><main>{children}</main></div> }
