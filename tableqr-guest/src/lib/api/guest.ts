import { REQUEST_ID_HEADER, type CreateOrderRequest, type GuestBootstrapResponse, type OrderDto } from '@kimthanh-tableqr/contracts'
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
