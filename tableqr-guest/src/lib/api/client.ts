import {
  API_BASE_PATH,
  GUEST_TOKEN_HEADER,
  isApiErrorBody,
  NETWORK_ERROR_MESSAGE,
  UNKNOWN_ERROR_MESSAGE,
  type ApiErrorBody,
} from '@kimthanh-tableqr/contracts'

const GUEST_TOKEN_STORAGE_KEY = 'tableqr.guestToken'

interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  readonly body?: unknown
  readonly headers?: HeadersInit
}

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.error.message ?? `HTTP ${status}`)
    this.name = 'ApiClientError'
  }
}

function createUuid(): string {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID()

  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}

export function getGuestToken(): string {
  const stored = sessionStorage.getItem(GUEST_TOKEN_STORAGE_KEY)
  if (stored) return stored

  const token = createUuid()
  sessionStorage.setItem(GUEST_TOKEN_STORAGE_KEY, token)
  return token
}

function apiUrl(path: string): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? API_BASE_PATH
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) return null
  return response.json()
}

export async function apiClient<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const headers = new Headers(options.headers)
  headers.set(GUEST_TOKEN_HEADER, getGuestToken())

  let body: BodyInit | undefined
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json; charset=utf-8')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    body,
    headers,
  })
  const parsed = await parseJson(response)

  if (!response.ok) {
    throw new ApiClientError(response.status, isApiErrorBody(parsed) ? parsed : null)
  }

  return parsed as TResponse
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError
}

export function getApiClientErrorMessage(error: unknown): string {
  if (isApiClientError(error)) return error.body?.error.message ?? UNKNOWN_ERROR_MESSAGE
  if (error instanceof TypeError) return NETWORK_ERROR_MESSAGE
  return UNKNOWN_ERROR_MESSAGE
}
