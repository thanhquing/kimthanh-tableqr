import {
  API_BASE_PATH,
  type AuthResponse,
  type CloseSessionResponse,
  type OrderStatus,
  type PaySessionResponse,
  type StaffCallDto,
  type StaffCallsResponse,
  type StaffOrderDto,
  type StaffOrdersResponse,
  type StaffSessionDetailResponse,
  type StaffTablesResponse,
} from '@kimthanh-tableqr/contracts'

export const staffApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? API_BASE_PATH

function staffApiUrl(path: string): string {
  return `${staffApiBaseUrl.replace(/\/$/, '')}${path}`
}

function staffHeaders(token: string, includeJson = false): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  }
}

async function staffRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(staffApiUrl(path), {
    ...init,
    headers: { ...staffHeaders(token, init?.body !== undefined), ...init?.headers },
  })
  if (!response.ok) throw new Error('Không thể cập nhật dữ liệu.')
  return response.json() as Promise<T>
}

export function getStaffStreamUrl(token: string): string {
  const url = new URL(staffApiUrl('/staff/stream'), window.location.origin)
  url.searchParams.set('access_token', token)
  return url.toString()
}

export async function loginStaff(pin: string): Promise<AuthResponse> {
  const response = await fetch(staffApiUrl('/staff/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  })
  if (!response.ok) throw new Error('Mã PIN không đúng. Thử lại.')
  return response.json() as Promise<AuthResponse>
}

export const getStaffOrders = (token: string, since?: string) =>
  staffRequest<StaffOrdersResponse>(token, `/staff/orders${since ? `?since=${encodeURIComponent(since)}` : ''}`)

/** Only available from the MSW debug handler. */
export const simulateStaffOrder = (token: string) =>
  staffRequest<void>(token, '/__debug/staff/orders', { method: 'POST' })

export const updateStaffOrder = (token: string, id: string, status: OrderStatus) =>
  staffRequest<StaffOrderDto>(token, `/staff/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const getStaffTables = (token: string) => staffRequest<StaffTablesResponse>(token, '/staff/tables')
export const getStaffSession = (token: string, id: string) => staffRequest<StaffSessionDetailResponse>(token, `/staff/sessions/${id}`)
export const paySession = (token: string, id: string) => staffRequest<PaySessionResponse>(token, `/staff/sessions/${id}/pay`, { method: 'POST' })
export const closeSession = (token: string, id: string) => staffRequest<CloseSessionResponse>(token, `/staff/sessions/${id}/close`, { method: 'POST' })
export const getStaffCalls = (token: string) => staffRequest<StaffCallsResponse>(token, '/staff/calls?status=PENDING')
export const completeStaffCall = (token: string, id: string) =>
  staffRequest<StaffCallDto>(token, `/staff/calls/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'DONE' }) })
