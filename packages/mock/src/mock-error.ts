import type { ApiErrorBody, ApiErrorCode } from '@kimthanh-tableqr/contracts'

export class MockApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details: Record<string, unknown> | null = null,
  ) {
    super(message)
    this.name = 'MockApiError'
  }

  toBody(): ApiErrorBody {
    return { error: { code: this.code, message: this.message, details: this.details } }
  }
}

export function validationError(fields: Record<string, string>): MockApiError {
  return new MockApiError(400, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ.', { fields })
}

export function notFound(field: string, message = 'Dữ liệu không tồn tại.'): MockApiError {
  return validationError({ [field]: message })
}
