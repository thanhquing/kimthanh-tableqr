import type { AuthResponse } from '@kimthanh-tableqr/contracts'
import { createContext, type ReactNode, useContext, useState } from 'react'

const KEY = 'tableqr.adminAuth.v2'
const Context = createContext<{ auth: AuthResponse | null; login: (auth: AuthResponse) => void; logout: () => void } | null>(null)
function read() { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) as AuthResponse : null } catch { return null } }
export function AdminAuthProvider({ children }: { readonly children: ReactNode }) { const [auth, setAuth] = useState(read); const login = (next: AuthResponse) => { localStorage.setItem(KEY, JSON.stringify(next)); setAuth(next) }; const logout = () => { localStorage.removeItem(KEY); setAuth(null) }; return <Context.Provider value={{ auth, login, logout }}>{children}</Context.Provider> }
export function useAdminAuth() { const value = useContext(Context); if (!value) throw new Error('useAdminAuth phải nằm trong AdminAuthProvider.'); return value }
