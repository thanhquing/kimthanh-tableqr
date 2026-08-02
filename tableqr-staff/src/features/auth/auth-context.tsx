import type { AuthResponse } from '@kimthanh-tableqr/contracts'
import { createContext, type ReactNode, useContext, useState } from 'react'

const KEY = 'tableqr.staffAuth'
const AuthContext = createContext<{ auth: AuthResponse | null; login: (auth: AuthResponse) => void; logout: () => void } | null>(null)
function read(): AuthResponse | null { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as AuthResponse : null } catch { return null } }
export function StaffAuthProvider({ children }: { readonly children: ReactNode }) { const [auth, setAuth] = useState(read); return <AuthContext.Provider value={{ auth, login: (next) => { localStorage.setItem(KEY, JSON.stringify(next)); setAuth(next) }, logout: () => { localStorage.removeItem(KEY); setAuth(null) } }}>{children}</AuthContext.Provider> }
export function useStaffAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useStaffAuth phải nằm trong StaffAuthProvider.'); return value }
