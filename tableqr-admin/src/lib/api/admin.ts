import { API_BASE_PATH, type AdminCategoriesResponse, type AdminItemsResponse, type AdminTableDto, type AdminTablesResponse, type AuthResponse, type CreateCategoryRequest, type CreateMenuItemRequest, type CreateTableRequest, type MenuCategory, type MenuItem, type Restaurant, type UpdateCategoryRequest, type UpdateMenuItemRequest, type UpdateRestaurantRequest, type UpdateTableRequest, type UploadImageResponse } from '@kimthanh-tableqr/contracts'

const adminApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? API_BASE_PATH
const adminApiUrl = (path: string) => `${adminApiBaseUrl.replace(/\/$/, '')}${path}`

export async function loginAdmin(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(adminApiUrl('/admin/auth/login'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'Không thể đăng nhập.')
  }
  return response.json() as Promise<AuthResponse>
}

async function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(adminApiUrl(path), { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) { const body = await response.json().catch(() => null) as { error?: { message?: string } } | null; throw new Error(body?.error?.message ?? 'Không thể cập nhật dữ liệu.') }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}
export const getCategories = (token: string) => adminRequest<AdminCategoriesResponse>(token, '/admin/categories')
export const getItems = (token: string) => adminRequest<AdminItemsResponse>(token, '/admin/items')
export async function uploadMenuImage(token: string, file: File): Promise<UploadImageResponse> {
  const form = new FormData()
  form.set('file', file)
  const response = await fetch(adminApiUrl('/admin/uploads/images'), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? 'Không thể tải ảnh lên.')
  }
  return response.json() as Promise<UploadImageResponse>
}
export const createCategory = (token: string, body: CreateCategoryRequest) => adminRequest<MenuCategory>(token, '/admin/categories', { method: 'POST', body: JSON.stringify(body) })
export const updateCategory = (token: string, id: string, body: UpdateCategoryRequest) => adminRequest<MenuCategory>(token, `/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteCategory = (token: string, id: string) => adminRequest<void>(token, `/admin/categories/${id}`, { method: 'DELETE' })
export const updateItem = (token: string, id: string, body: UpdateMenuItemRequest) => adminRequest<MenuItem>(token, `/admin/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteItem = (token: string, id: string) => adminRequest<void>(token, `/admin/items/${id}`, { method: 'DELETE' })
export const createItem = (token: string, body: CreateMenuItemRequest) => adminRequest<MenuItem>(token, '/admin/items', { method: 'POST', body: JSON.stringify(body) })
export const getTables = (token: string) => adminRequest<AdminTablesResponse>(token, '/admin/tables')
export const createTable = (token: string, body: CreateTableRequest) => adminRequest<AdminTableDto>(token, '/admin/tables', { method: 'POST', body: JSON.stringify(body) })
export const updateTable = (token: string, id: string, body: UpdateTableRequest) => adminRequest<AdminTableDto>(token, `/admin/tables/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteTable = (token: string, id: string) => adminRequest<void>(token, `/admin/tables/${id}`, { method: 'DELETE' })
export const getRestaurant = (token: string) => adminRequest<Restaurant>(token, '/admin/restaurant')
export const updateRestaurant = (token: string, body: UpdateRestaurantRequest) => adminRequest<Restaurant>(token, '/admin/restaurant', { method: 'PATCH', body: JSON.stringify(body) })
