import type { GuestBootstrapResponse } from '@kimthanh-tableqr/contracts'
import { apiClient } from './client'

export function getGuestBootstrap(qrToken: string): Promise<GuestBootstrapResponse> {
  return apiClient<GuestBootstrapResponse>(`/guest/tables/${encodeURIComponent(qrToken)}`)
}
