import { type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './admin-shell'
import { useAdminAuth } from '../features/auth/auth-context'
import { LoginPage } from '../pages/login-page'
import { MenuPage } from '../pages/menu-page'
import { ItemFormPage } from '../pages/item-form-page'
import { TablesPage } from '../pages/tables-page'
import { PrintPage } from '../pages/print-page'
import { SettingsPage } from '../pages/settings-page'
import { BillingPage } from '../pages/billing-page'

export function App() { const { auth } = useAdminAuth(); const protectedRoute = (node: ReactNode) => auth ? node : <Navigate replace to="/login"/>; return <Routes><Route element={auth ? <Navigate replace to="/menu"/> : <LoginPage/>} path="/login"/><Route element={protectedRoute(<AdminShell><MenuPage/></AdminShell>)} path="/menu"/><Route element={protectedRoute(<AdminShell><ItemFormPage/></AdminShell>)} path="/menu/items/new"/><Route element={protectedRoute(<AdminShell><ItemFormPage/></AdminShell>)} path="/menu/items/:id"/><Route element={protectedRoute(<AdminShell><TablesPage/></AdminShell>)} path="/tables"/><Route element={protectedRoute(<PrintPage/>)} path="/tables/print"/><Route element={protectedRoute(<AdminShell><BillingPage/></AdminShell>)} path="/billing"/><Route element={protectedRoute(<AdminShell><SettingsPage/></AdminShell>)} path="/settings"/><Route element={<Navigate replace to={auth ? '/menu' : '/login'}/>} path="*"/></Routes> }
