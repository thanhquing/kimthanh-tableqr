import {
  API_BASE_PATH,
  GUEST_TOKEN_HEADER,
  ORDER_STATUS,
  REQUEST_ID_HEADER,
  STAFF_CALL_STATUS,
  type OrderStatus,
  type StaffCallStatus,
  type StaffRole,
} from '@kimthanh-tableqr/contracts'
import { HttpResponse, http, type HttpHandler } from 'msw'
import { ADMIN_EMAIL, ADMIN_PASSWORD, STAFF_PIN } from './fixtures.js'
import { ChaosController, chaos } from './chaos.js'
import { MockApiError, validationError } from './mock-error.js'
import { MockStore, mockStore } from './store.js'
import {
  parseAdminLogin,
  parseCallStatus,
  parseCreateCall,
  parseCreateCategory,
  parseCreateItem,
  parseCreateOrder,
  parseCreateTable,
  parseOrderStatus,
  parseStaffLogin,
  parseUpdateCategory,
  parseUpdateItem,
  parseUpdateRestaurant,
  parseUpdateTable,
} from './validation.js'

export const STAFF_TOKEN = 'mock-token-staff'
export const OWNER_TOKEN = 'mock-token-owner'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface HandlerOptions {
  store?: MockStore
  chaos?: ChaosController
  guestBaseUrl?: string
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw validationError({ body: 'Body phải là JSON hợp lệ.' })
  }
}

function requireGuest(request: Request): void {
  const token = request.headers.get(GUEST_TOKEN_HEADER)
  if (!token?.trim()) throw new MockApiError(401, 'UNAUTHORIZED', 'Thiếu mã phiên khách.')
  if (!UUID_PATTERN.test(token)) throw new MockApiError(401, 'UNAUTHORIZED', 'Mã phiên khách không hợp lệ.')
}

function guestAccessToken(sessionId: string): string { return `mock-guest-access-${sessionId}` }
function requireGuestAccess(request: Request, sessionId: string): void {
  if (request.headers.get('X-Guest-Access') !== guestAccessToken(sessionId)) {
    throw new MockApiError(401, 'GUEST_ACCESS_INVALID', 'Phiên quét mã không hợp lệ. Vui lòng quét lại mã QR.')
  }
}

function bearerRole(request: Request): StaffRole | null {
  const authorization = request.headers.get('Authorization')
  if (authorization === `Bearer ${STAFF_TOKEN}`) return 'staff'
  if (authorization === `Bearer ${OWNER_TOKEN}`) return 'owner'
  return null
}

function requireRole(request: Request, allowed: readonly StaffRole[]): void {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new MockApiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.')
  const role = bearerRole(request)
  if (!role) throw new MockApiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ.')
  if (!allowed.includes(role)) throw new MockApiError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.')
}

function noContent(): Response {
  return new HttpResponse(null, { status: 204 })
}

async function execute(
  request: Request,
  chaosController: ChaosController,
  operation: () => Response | Promise<Response>,
): Promise<Response> {
  try {
    const chaosResponse = await chaosController.beforeRequest(request)
    if (chaosResponse) return chaosResponse
    return await operation()
  } catch (error) {
    if (error instanceof MockApiError) return HttpResponse.json(error.toBody(), { status: error.status })
    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
          details: null,
        },
      },
      { status: 500 },
    )
  }
}

export function createHandlers(options: HandlerOptions = {}): HttpHandler[] {
  const store = options.store ?? mockStore
  const chaosController = options.chaos ?? chaos
  const guestBaseUrl = options.guestBaseUrl ?? 'http://localhost:5173'
  // Cùng một package phục vụ ba app khác origin (5173/5174/5175) và Vitest Node.
  const api = `*${API_BASE_PATH}`

  return [
    http.get(`${api}/guest/tables/:qrToken`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireGuest(request)
        const bootstrap = store.bootstrapGuest(String(params.qrToken))
        return HttpResponse.json({ ...bootstrap, guestAccessToken: guestAccessToken(bootstrap.session.id) })
      }),
    ),
    http.get(`${api}/guest/sessions/:sessionId/orders`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireGuest(request)
        const sessionId = String(params.sessionId)
        requireGuestAccess(request, sessionId)
        return HttpResponse.json(store.getGuestOrders(sessionId))
      }),
    ),
    http.post(`${api}/guest/sessions/:sessionId/orders`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireGuest(request)
        const sessionId = String(params.sessionId)
        requireGuestAccess(request, sessionId)
        const requestId = request.headers.get(REQUEST_ID_HEADER)
        if (!requestId?.trim()) throw validationError({ requestId: 'Thiếu header X-Request-Id.' })
        if (!UUID_PATTERN.test(requestId)) throw validationError({ requestId: 'X-Request-Id phải là UUID.' })
        const body = parseCreateOrder(await readJson(request))
        return HttpResponse.json(store.createOrder(sessionId, body, requestId), { status: 201 })
      }),
    ),
    http.post(`${api}/guest/sessions/:sessionId/calls`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireGuest(request)
        const sessionId = String(params.sessionId)
        requireGuestAccess(request, sessionId)
        const result = store.createCall(sessionId, parseCreateCall(await readJson(request)))
        return HttpResponse.json(result.call, { status: result.status })
      }),
    ),

    http.post(`${api}/staff/auth/login`, ({ request }) =>
      execute(request, chaosController, async () => {
        const body = parseStaffLogin(await readJson(request))
        if (body.staffLoginCode !== 'KIM-4821' || body.pin !== STAFF_PIN) throw new MockApiError(401, 'UNAUTHORIZED', 'Mã ghép thiết bị hoặc PIN không đúng.')
        return HttpResponse.json({ token: STAFF_TOKEN, role: 'staff', displayName: 'Nhân viên quầy' })
      }),
    ),
    http.get(`${api}/staff/orders`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        const url = new URL(request.url)
        const rawStatus = url.searchParams.get('status')
        if (rawStatus && !ORDER_STATUS.includes(rawStatus as OrderStatus)) {
          throw validationError({ status: 'Trạng thái đơn không hợp lệ.' })
        }
        return HttpResponse.json(store.getStaffOrders(rawStatus as OrderStatus | undefined, url.searchParams.get('since') ?? undefined))
      }),
    ),
    http.patch(`${api}/staff/orders/:orderId/status`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['staff', 'owner'])
        const body = parseOrderStatus(await readJson(request))
        return HttpResponse.json(store.updateOrderStatus(String(params.orderId), body.status))
      }),
    ),
    http.get(`${api}/staff/tables`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        return HttpResponse.json(store.getStaffTables())
      }),
    ),
    http.get(`${api}/staff/sessions/:sessionId`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        return HttpResponse.json(store.getStaffSession(String(params.sessionId)))
      }),
    ),
    http.post(`${api}/staff/sessions/:sessionId/pay`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        return HttpResponse.json(store.paySession(String(params.sessionId)))
      }),
    ),
    http.post(`${api}/staff/sessions/:sessionId/close`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        return HttpResponse.json(store.closeSession(String(params.sessionId)))
      }),
    ),
    http.get(`${api}/staff/calls`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['staff', 'owner'])
        const rawStatus = new URL(request.url).searchParams.get('status')
        if (rawStatus && !STAFF_CALL_STATUS.includes(rawStatus as StaffCallStatus)) {
          throw validationError({ status: 'Trạng thái yêu cầu không hợp lệ.' })
        }
        return HttpResponse.json(store.getStaffCalls(rawStatus as StaffCallStatus | undefined))
      }),
    ),
    http.patch(`${api}/staff/calls/:callId`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['staff', 'owner'])
        const body = parseCallStatus(await readJson(request))
        return HttpResponse.json(store.updateStaffCall(String(params.callId), body.status))
      }),
    ),

    http.post(`${api}/admin/auth/login`, ({ request }) =>
      execute(request, chaosController, async () => {
        const body = parseAdminLogin(await readJson(request))
        if (body.email !== ADMIN_EMAIL || body.password !== ADMIN_PASSWORD) {
          throw new MockApiError(401, 'UNAUTHORIZED', 'Email hoặc mật khẩu không đúng.')
        }
        return HttpResponse.json({ token: OWNER_TOKEN, role: 'owner', displayName: 'Chủ quán Kim Thành' })
      }),
    ),
    http.get(`${api}/admin/categories`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.getCategories())
      }),
    ),
    http.post(`${api}/admin/categories`, ({ request }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.createCategory(parseCreateCategory(await readJson(request))), { status: 201 })
      }),
    ),
    http.patch(`${api}/admin/categories/:id`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.updateCategory(String(params.id), parseUpdateCategory(await readJson(request))))
      }),
    ),
    http.delete(`${api}/admin/categories/:id`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        store.deleteCategory(String(params.id))
        return noContent()
      }),
    ),
    http.get(`${api}/admin/items`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.getItems(new URL(request.url).searchParams.get('categoryId') ?? undefined))
      }),
    ),
    http.post(`${api}/admin/uploads/images`, ({ request }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        const form = await request.formData()
        const value = form.get('file')
        if (!value || typeof value !== 'object' || !('size' in value) || !('type' in value)) {
          throw validationError({ file: 'Chọn một ảnh món để tải lên.' })
        }
        const file = value as { size: number; type: string }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw validationError({ file: 'Chỉ nhận ảnh JPG, PNG hoặc WebP.' })
        }
        if (file.size > 5 * 1024 * 1024) throw validationError({ file: 'Ảnh tối đa 5 MB.' })
        return HttpResponse.json({ imageUrl: '/menu-images/ca-phe-sua-da.jpg' }, { status: 201 })
      }),
    ),
    http.post(`${api}/admin/items`, ({ request }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.createItem(parseCreateItem(await readJson(request))), { status: 201 })
      }),
    ),
    http.patch(`${api}/admin/items/:id`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.updateItem(String(params.id), parseUpdateItem(await readJson(request))))
      }),
    ),
    http.delete(`${api}/admin/items/:id`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        store.deleteItem(String(params.id))
        return noContent()
      }),
    ),
    http.get(`${api}/admin/tables`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.getAdminTables(guestBaseUrl))
      }),
    ),
    http.post(`${api}/admin/tables`, ({ request }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.createTable(parseCreateTable(await readJson(request)), guestBaseUrl), { status: 201 })
      }),
    ),
    http.patch(`${api}/admin/tables/:id`, ({ request, params }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.updateTable(String(params.id), parseUpdateTable(await readJson(request)), guestBaseUrl))
      }),
    ),
    http.delete(`${api}/admin/tables/:id`, ({ request, params }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        store.deleteTable(String(params.id))
        return noContent()
      }),
    ),
    http.get(`${api}/admin/restaurant`, ({ request }) =>
      execute(request, chaosController, () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.getRestaurant())
      }),
    ),
    http.patch(`${api}/admin/restaurant`, ({ request }) =>
      execute(request, chaosController, async () => {
        requireRole(request, ['owner'])
        return HttpResponse.json(store.updateRestaurant(parseUpdateRestaurant(await readJson(request))))
      }),
    ),
  ]
}

export const handlers = createHandlers()

export const debugHandlers = [
  http.post(`*${API_BASE_PATH}/__debug/staff/orders`, ({ request }) =>
    execute(request, chaos, () => {
      requireRole(request, ['staff', 'owner'])
      return HttpResponse.json(mockStore.simulateStaffOrder(), { status: 201 })
    }),
  ),
]
