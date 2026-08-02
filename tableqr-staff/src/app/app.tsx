import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffShell } from './staff-shell'
import { useStaffAuth } from '../features/auth/auth-context'
import { LoginPage } from '../pages/login-page'
import { OrdersPage } from '../pages/orders-page'
import { TablesPage } from '../pages/tables-page'
import { type ReactNode } from 'react'
import { SessionPage } from '../pages/session-page'
export function App() { const { auth } = useStaffAuth(); const protectedRoute=(node:ReactNode)=>auth?<StaffShell>{node}</StaffShell>:<Navigate replace to="/login"/>;return <Routes><Route path="/login" element={auth ? <Navigate replace to="/orders" /> : <LoginPage />} /><Route path="/orders" element={protectedRoute(<OrdersPage/>)} /><Route path="/tables" element={protectedRoute(<TablesPage/>)} /><Route path="/tables/:code" element={protectedRoute(<SessionPage/>)} /><Route path="*" element={<Navigate replace to={auth ? '/orders' : '/login'} />} /></Routes> }
