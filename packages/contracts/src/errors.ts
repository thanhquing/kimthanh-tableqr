/** Shape loi thong nhat. Nguon: ai-docs/04-api-contract.md §Dang loi chung
 *
 *  `message` la TIENG VIET, hien thang cho nguoi dung. FE uu tien dung message
 *  tu server; chi tu che chuoi khi mat mang hoan toan (khong co response).
 */

export const API_ERROR_CODE = [
  'TABLE_NOT_FOUND',
  'SESSION_CLOSED',
  'ITEMS_UNAVAILABLE',
  'EMPTY_ORDER',
  'INVALID_TRANSITION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'CONFLICT',
  'INTERNAL_ERROR',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODE)[number]

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    details: Record<string, unknown> | null
  }
}

/** details cua ITEMS_UNAVAILABLE — UI dung de to do dung mon da het. */
export interface ItemsUnavailableDetails {
  unavailableItemIds: string[]
}

/** details cua VALIDATION_ERROR — UI dung de gan loi vao dung o nhap. */
export interface ValidationErrorDetails {
  fields: Record<string, string>
}

/** Chuoi hien khi khong co response nao tu server (mat mang, DNS hong). */
export const NETWORK_ERROR_MESSAGE = 'Không có kết nối mạng. Vui lòng thử lại.'

/** Chuoi du phong khi server tra loi khong dung shape tren. */
export const UNKNOWN_ERROR_MESSAGE = 'Đã có lỗi xảy ra. Vui lòng thử lại.'

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null) return false
  const err = (value as { error?: unknown }).error
  if (typeof err !== 'object' || err === null) return false
  const code = (err as { code?: unknown }).code
  return typeof code === 'string' && (API_ERROR_CODE as readonly string[]).includes(code)
}

/** Lay chuoi hien cho nguoi dung tu bat ky thu gi bat duoc trong catch. */
export function getErrorMessage(caught: unknown): string {
  if (isApiErrorBody(caught)) return caught.error.message
  if (caught instanceof TypeError) return NETWORK_ERROR_MESSAGE
  return UNKNOWN_ERROR_MESSAGE
}
