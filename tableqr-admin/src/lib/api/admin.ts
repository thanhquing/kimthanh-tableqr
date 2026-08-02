import { API_BASE_PATH, type AdminCategoriesResponse, type AdminItemsResponse, type AuthResponse, type CreateCategoryRequest, type CreateMenuItemRequest, type MenuCategory, type MenuItem, type UpdateCategoryRequest, type UpdateMenuItemRequest } from '@kimthanh-tableqr/contracts'

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_PATH}/admin/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'Không thể đăng nhập.')
  }
  return response.json() as Promise<AuthResponse>
}

async function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(body?.error?.message ?? 'Không thể cập nhật dữ liệu.') }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
export const getCategories = (token: string) => adminRequest<AdminCategoriesResponse>(token, '/admin/categories')
export const getItems = (token: string) => adminRequest<AdminItemsResponse>(token, '/admin/items')
export const createCategory = (token: string, body: CreateCategoryRequest) => adminRequest<MenuCategory>(token, '/admin/categories', { method: 'POST', body: JSON.stringify(body) })
export const updateCategory = (token: string, id: string, body: UpdateCategoryRequest) => adminRequest<MenuCategory>(token, `/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteCategory = (token: string, id: string) => adminRequest<void>(token, `/admin/categories/${id}`, { method: 'DELETE' })
export const updateItem = (token: string, id: string, body: UpdateMenuItemRequest) => adminRequest<MenuItem>(token, `/admin/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteItem = (token: string, id: string) => adminRequest<void>(token, `/admin/items/${id}`, { method: 'DELETE' })
export const createItem = (token: string, body: CreateMenuItemRequest) => adminRequest<MenuItem>(token, '/admin/items', { method: 'POST', body: JSON.stringify(body) })
