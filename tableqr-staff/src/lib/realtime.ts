import type { StaffOrderDto } from '@kimthanh-tableqr/contracts'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useStaffAuth } from '../features/auth/auth-context'
import { getStaffOrders } from './api/staff'

export interface OrderStream { readonly error: unknown; readonly isLoading: boolean; readonly orders: readonly StaffOrderDto[]; readonly refetch: () => void; readonly replaceOrder: (order: StaffOrderDto) => void }
export function useOrderStream(): OrderStream {
  const { auth } = useStaffAuth()
  const since = useRef<string | undefined>(undefined)
  const [orders, setOrders] = useState<readonly StaffOrderDto[]>([])
  const query = useQuery({ enabled: Boolean(auth), queryFn: () => getStaffOrders(auth!.token, since.current), queryKey: ['staff-order-stream'], refetchInterval: 3_000 })
  useEffect(() => { if (!query.data) return; since.current = query.data.serverTime; setOrders((current) => { const next = new Map(current.map((order) => [order.id, order])); query.data.orders.forEach((order) => next.set(order.id, order)); return [...next.values()].sort((a,b) => a.createdAt.localeCompare(b.createdAt)) }) }, [query.data])
  return { error: query.error, isLoading: query.isPending, orders, refetch: () => void query.refetch(), replaceOrder: (order) => setOrders((items) => items.map((item) => item.id === order.id ? order : item)) }
}
