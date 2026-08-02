import { ChefHat, Volume2, VolumeX } from 'lucide-react'
import { type ReactNode } from 'react'
import { useStaffAuth } from '../features/auth/auth-context'
import { CallBell } from '../features/calls/call-bell'
import { useSound } from '../features/sound/sound-context'
export function StaffShell({ children }: { readonly children: ReactNode }) { const { auth, logout } = useStaffAuth(); const {muted,ready,toggle}=useSound(); return <div className="staff-app"><header className="staff-header"><ChefHat size={28} /><strong>Bếp Kim Thành</strong><span>{auth?.displayName}</span>{!ready?<small>Chạm để bật âm báo</small>:null}<button aria-label={muted?'Bật âm báo':'Tắt âm báo'} onClick={toggle} type="button">{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button><CallBell/><button onClick={logout} type="button">Đăng xuất</button></header><main>{children}</main></div> }
