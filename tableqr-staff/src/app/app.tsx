import { Navigate, Route, Routes } from 'react-router-dom'
import { StaffShell } from './staff-shell'
export function App() { return <StaffShell><Routes><Route path="/login" element={<div className="staff-placeholder">Đăng nhập bếp</div>} /><Route path="/orders" element={<div className="staff-placeholder">Đơn bếp</div>} /><Route path="*" element={<Navigate replace to="/login" />} /></Routes></StaffShell> }
