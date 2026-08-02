import { type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminShell } from './admin-shell'
import { useAdminAuth } from '../features/auth/auth-context'
import { LoginPage } from '../pages/login-page'
import { MenuPage } from '../pages/menu-page'
import { ItemFormPage } from '../pages/item-form-page'
import { TablesPage } from '../pages/tables-page'
import { PrintPage } from '../pages/print-page'

const titles: Record<string, string> = { '/menu': 'Thực đơn', '/tables': 'Bàn & mã QR', '/tables/print': 'In mã QR', '/settings': 'Cài đặt' }
function Placeholder() { const { pathname } = useLocation(); return <div className="admin-placeholder"><h1>{titles[pathname] ?? 'Quản trị quán'}</h1><p>Màn hình này sẽ được hoàn thiện ở task kế tiếp.</p></div> }
function ShellRoute() { return <AdminShell><Placeholder /></AdminShell> }
export function App() { const { auth } = useAdminAuth(); const protectedRoute = (node: ReactNode) => auth ? node : <Navigate replace to="/login"/>; return <Routes><Route element={auth ? <Navigate replace to="/menu"/> : <LoginPage/>} path="/login"/><Route element={protectedRoute(<AdminShell><MenuPage/></AdminShell>)} path="/menu"/><Route element={protectedRoute(<AdminShell><ItemFormPage/></AdminShell>)} path="/menu/items/new"/><Route element={protectedRoute(<AdminShell><ItemFormPage/></AdminShell>)} path="/menu/items/:id"/><Route element={protectedRoute(<AdminShell><TablesPage/></AdminShell>)} path="/tables"/><Route element={protectedRoute(<PrintPage/>)} path="/tables/print"/><Route element={protectedRoute(<ShellRoute />)} path="/settings"/><Route element={<Navigate replace to={auth ? '/menu' : '/login'}/>} path="*"/></Routes> }
