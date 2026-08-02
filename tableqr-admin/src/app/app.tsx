import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AdminShell } from './admin-shell'

const titles: Record<string, string> = { '/menu': 'Thực đơn', '/tables': 'Bàn & mã QR', '/tables/print': 'In mã QR', '/settings': 'Cài đặt' }
function Placeholder() { const { pathname } = useLocation(); return <div className="admin-placeholder"><h1>{titles[pathname] ?? 'Quản trị quán'}</h1><p>Màn hình này sẽ được hoàn thiện ở task kế tiếp.</p></div> }
function ShellRoute() { return <AdminShell><Placeholder /></AdminShell> }
export function App() { return <Routes><Route element={<ShellRoute />} path="/menu"/><Route element={<ShellRoute />} path="/tables"/><Route element={<ShellRoute />} path="/tables/print"/><Route element={<ShellRoute />} path="/settings"/><Route element={<Navigate replace to="/menu"/>} path="*"/></Routes> }
