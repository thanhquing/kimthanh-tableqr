import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffShell } from './staff-shell'
import { useStaffAuth } from '../features/auth/auth-context'
import { LoginPage } from '../pages/login-page'
export function App() { const { auth } = useStaffAuth(); return <Routes><Route path="/login" element={auth ? <Navigate replace to="/orders" /> : <LoginPage />} /><Route path="/orders" element={auth ? <StaffShell><div className="staff-placeholder">Đơn bếp</div></StaffShell> : <Navigate replace to="/login" />} /><Route path="*" element={<Navigate replace to={auth ? '/orders' : '/login'} />} /></Routes> }
