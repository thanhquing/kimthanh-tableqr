import { REQUEST_ID_HEADER, type CreateOrderRequest, type CreateStaffCallRequest, type GuestBootstrapResponse, type GuestOrdersResponse, type OrderDto, type StaffCallDto } from '@kimthanh-tableqr/contracts'
import { apiClient, guestAccessHeaders, setGuestAccessToken } from './client'

export async function getGuestBootstrap(qrToken: string): Promise<GuestBootstrapResponse> {
  const response = await apiClient<GuestBootstrapResponse>(`/guest/tables/${encodeURIComponent(qrToken)}`)
  setGuestAccessToken(response.session.id, response.guestAccessToken)
  return response
}

export function createGuestOrder(sessionId: string, request: CreateOrderRequest, requestId: string): Promise<OrderDto> {
  return apiClient<OrderDto>(`/guest/sessions/${encodeURIComponent(sessionId)}/orders`, {
    body: request,
    headers: { ...guestAccessHeaders(sessionId), [REQUEST_ID_HEADER]: requestId },
    method: 'POST',
  })
}

export function getGuestOrders(sessionId: string): Promise<GuestOrdersResponse> {
  return apiClient<GuestOrdersResponse>(`/guest/sessions/${encodeURIComponent(sessionId)}/orders`, { headers: guestAccessHeaders(sessionId) })
}

export function createStaffCall(sessionId: string, request: CreateStaffCallRequest): Promise<StaffCallDto> {
  return apiClient<StaffCallDto>(`/guest/sessions/${encodeURIComponent(sessionId)}/calls`, { body: request, headers: guestAccessHeaders(sessionId), method: 'POST' })
}
