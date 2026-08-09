import type { StaffOrderDto } from '@kimthanh-tableqr/contracts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useStaffAuth } from '../features/auth/auth-context'
import { getStaffOrders, getStaffStreamUrl } from './api/staff'

export interface OrderStream { readonly error: unknown; readonly isLoading: boolean; readonly orders: readonly StaffOrderDto[]; readonly refetch: () => void; readonly replaceOrder: (order: StaffOrderDto) => void }
export function useOrderStream(): OrderStream {
  const { auth } = useStaffAuth()
  const queryClient = useQueryClient()
  const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  const since = useRef<string | undefined>(undefined)
  const [orders, setOrders] = useState<readonly StaffOrderDto[]>([])
  const [pollingFallback, setPollingFallback] = useState(useMock)
  const query = useQuery({ enabled: Boolean(auth), queryFn: () => getStaffOrders(auth!.token, since.current), queryKey: ['staff-order-stream'], refetchInterval: useMock || pollingFallback ? 3_000 : false })
  useEffect(() => { if (!query.data) return; since.current = query.data.serverTime; setOrders((current) => { const next = new Map(current.map((order) => [order.id, order])); query.data.orders.forEach((order) => next.set(order.id, order)); return [...next.values()].sort((a,b) => a.createdAt.localeCompare(b.createdAt)) }) }, [query.data])
  useEffect(() => {
    if (!auth || useMock || pollingFallback) return
    const source = new EventSource(getStaffStreamUrl(auth.token))
    let errors = 0
    const upsertOrder = (event: MessageEvent<string>) => {
      const order = JSON.parse(event.data) as StaffOrderDto
      setOrders((current) => {
        const next = new Map(current.map((item) => [item.id, item]))
        next.set(order.id, order)
        return [...next.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      })
    }
    const removeClosedSession = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as { sessionId?: unknown }
      if (typeof data.sessionId !== 'string') return
      setOrders((current) => current.filter((order) => order.sessionId !== data.sessionId))
      void queryClient.invalidateQueries({ queryKey: ['staff-tables'] })
    }
    const refreshCalls = () => { void queryClient.invalidateQueries({ queryKey: ['staff-calls'] }) }
    const onError = () => { errors += 1; if (errors >= 3) { source.close(); setPollingFallback(true) } }
    const onOpen = () => { errors = 0 }
    source.addEventListener('order.created', upsertOrder)
    source.addEventListener('order.status_changed', upsertOrder)
    source.addEventListener('call.created', refreshCalls)
    source.addEventListener('session.closed', removeClosedSession)
    source.addEventListener('error', onError)
    source.addEventListener('open', onOpen)
    return () => source.close()
  }, [auth, pollingFallback, queryClient, useMock])
  return { error: query.error, isLoading: query.isPending, orders, refetch: () => void query.refetch(), replaceOrder: (order) => setOrders((items) => items.map((item) => item.id === order.id ? order : item)) }
}
