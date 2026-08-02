import { API_BASE_PATH, type AuthResponse } from '@kimthanh-tableqr/contracts'

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_PATH}/admin/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'Không thể đăng nhập.')
  }
  return response.json() as Promise<AuthResponse>
}
