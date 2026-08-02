import { REQUEST_ID_HEADER, type CreateOrderRequest, type CreateStaffCallRequest, type GuestBootstrapResponse, type GuestOrdersResponse, type OrderDto, type StaffCallDto } from '@kimthanh-tableqr/contracts'
import { apiClient } from './client'

export function getGuestBootstrap(qrToken: string): Promise<GuestBootstrapResponse> {
  return apiClient<GuestBootstrapResponse>(`/guest/tables/${encodeURIComponent(qrToken)}`)
}

export function createGuestOrder(sessionId: string, request: CreateOrderRequest, requestId: string): Promise<OrderDto> {
  return apiClient<OrderDto>(`/guest/sessions/${encodeURIComponent(sessionId)}/orders`, {
    body: request,
    headers: { [REQUEST_ID_HEADER]: requestId },
    method: 'POST',
  })
}

export function getGuestOrders(sessionId: string): Promise<GuestOrdersResponse> {
  return apiClient<GuestOrdersResponse>(`/guest/sessions/${encodeURIComponent(sessionId)}/orders`)
}

export function createStaffCall(sessionId: string, request: CreateStaffCallRequest): Promise<StaffCallDto> {
  return apiClient<StaffCallDto>(`/guest/sessions/${encodeURIComponent(sessionId)}/calls`, { body: request, method: 'POST' })
}
