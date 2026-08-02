import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TableSessionRoute } from './table-session-route'
import { InvalidPage } from '../pages/invalid-page'
import { ItemPage } from '../pages/item-page'
import { MenuPage } from '../pages/menu-page'
import { SuccessPage } from '../pages/success-page'

const CartPage = lazy(() => import('../pages/cart-page').then((module) => ({ default: module.CartPage })))
const OrdersPage = lazy(() => import('../pages/orders-page').then((module) => ({ default: module.OrdersPage })))

export function App() {
  return (
    <Suspense fallback={<div className="guest-lazy-fallback">Đang tải...</div>}>
      <Routes>
        <Route path="/t/invalid" element={<InvalidPage />} />
        <Route path="/t/:qrToken" element={<TableSessionRoute />}>
          <Route index element={<MenuPage />} />
          <Route path="item/:itemId" element={<ItemPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="success" element={<SuccessPage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/t/invalid" />} />
      </Routes>
    </Suspense>
  )
}
