import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ChaosController } from './chaos.js'
import { createHandlers, OWNER_TOKEN, STAFF_TOKEN } from './handlers.js'
import { MockStore } from './store.js'

const BASE = 'http://localhost/api/v1'
const guestHeaders = { 'X-Guest-Token': '00000000-0000-4000-8000-000000000001' }
const store = new MockStore()
const chaos = new ChaosController()
chaos.set({ minDelayMs: 0, maxDelayMs: 0, errorRate: 0, offline: false, forceSessionClosed: false, forceItemsUnavailable: false })
const server = setupServer(...createHandlers({ store, chaos, guestBaseUrl: 'https://guest.example' }))

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  store.reset()
  chaos.set({ minDelayMs: 0, maxDelayMs: 0, errorRate: 0, offline: false, forceSessionClosed: false, forceItemsUnavailable: false })
})
afterAll(() => server.close())

describe('handlers', () => {
  it('khai báo đúng 28 endpoint M1 và chưa khai báo SSE M7', () => {
    expect(createHandlers({ store, chaos }).map((handler) => handler.info.header)).toEqual([
      'GET */api/v1/guest/tables/:qrToken',
      'GET */api/v1/guest/sessions/:sessionId/orders',
      'POST */api/v1/guest/sessions/:sessionId/orders',
      'POST */api/v1/guest/sessions/:sessionId/calls',
      'POST */api/v1/staff/auth/login',
      'GET */api/v1/staff/orders',
      'PATCH */api/v1/staff/orders/:orderId/status',
      'GET */api/v1/staff/tables',
      'GET */api/v1/staff/sessions/:sessionId',
      'POST */api/v1/staff/sessions/:sessionId/pay',
      'POST */api/v1/staff/sessions/:sessionId/close',
      'GET */api/v1/staff/calls',
      'PATCH */api/v1/staff/calls/:callId',
      'POST */api/v1/admin/auth/login',
      'GET */api/v1/admin/categories',
      'POST */api/v1/admin/categories',
      'PATCH */api/v1/admin/categories/:id',
      'DELETE */api/v1/admin/categories/:id',
      'GET */api/v1/admin/items',
      'POST */api/v1/admin/items',
      'PATCH */api/v1/admin/items/:id',
      'DELETE */api/v1/admin/items/:id',
      'GET */api/v1/admin/tables',
      'POST */api/v1/admin/tables',
      'PATCH */api/v1/admin/tables/:id',
      'DELETE */api/v1/admin/tables/:id',
      'GET */api/v1/admin/restaurant',
      'PATCH */api/v1/admin/restaurant',
    ])
  })

  it('kiểm tra thiếu token và sai role', async () => {
    const missing = await fetch(`${BASE}/staff/tables`)
    expect(missing.status).toBe(401)
    expect(await missing.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } })

    const forbidden = await fetch(`${BASE}/admin/categories`, {
      headers: { Authorization: `Bearer ${STAFF_TOKEN}` },
    })
    expect(forbidden.status).toBe(403)
    expect(await forbidden.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })

    const owner = await fetch(`${BASE}/staff/tables`, {
      headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
    })
    expect(owner.status).toBe(200)
  })

  it('validate payload và bỏ qua giá client cố gửi lên', async () => {
    const bootstrap = await fetch(`${BASE}/guest/tables/qr-ban-01-a7f3k9m2xp`, { headers: guestHeaders })
    const bootstrapBody = await bootstrap.json() as { session: { id: string } }
    const response = await fetch(`${BASE}/guest/sessions/${bootstrapBody.session.id}/orders`, {
      method: 'POST',
      headers: { ...guestHeaders, 'Content-Type': 'application/json', 'X-Request-Id': '00000000-0000-4000-8000-000000000002' },
      body: JSON.stringify({
        note: null,
        items: [{ menuItemId: 'item-ca-phe-sua-da', quantity: 2, note: null, priceVnd: 1 }],
      }),
    })
    const body = await response.json() as { items: Array<{ unitPriceVndSnapshot: number }> }

    expect(response.status).toBe(201)
    expect(body.items[0]!.unitPriceVndSnapshot).toBe(25_000)

    const invalid = await fetch(`${BASE}/guest/sessions/${bootstrapBody.session.id}/orders`, {
      method: 'POST',
      headers: { ...guestHeaders, 'Content-Type': 'application/json', 'X-Request-Id': '00000000-0000-4000-8000-000000000003' },
      body: JSON.stringify({ note: null, items: [{ menuItemId: 'missing', quantity: 0, note: null }] }),
    })
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } })
  })

  it('chaos ép SESSION_CLOSED và ITEMS_UNAVAILABLE đúng code HTTP', async () => {
    const bootstrap = await fetch(`${BASE}/guest/tables/qr-ban-01-a7f3k9m2xp`, { headers: guestHeaders })
    const { session } = await bootstrap.json() as { session: { id: string } }

    chaos.set({ forceSessionClosed: true })
    const closed = await fetch(`${BASE}/guest/sessions/${session.id}/orders`, { headers: guestHeaders })
    expect(closed.status).toBe(409)
    expect(await closed.json()).toMatchObject({ error: { code: 'SESSION_CLOSED' } })

    chaos.set({ forceSessionClosed: false, forceItemsUnavailable: true })
    const unavailable = await fetch(`${BASE}/guest/sessions/${session.id}/orders`, {
      method: 'POST',
      headers: { ...guestHeaders, 'Content-Type': 'application/json', 'X-Request-Id': '00000000-0000-4000-8000-000000000004' },
      body: JSON.stringify({ note: null, items: [{ menuItemId: 'item-ca-phe-sua-da', quantity: 1, note: null }] }),
    })
    expect(unavailable.status).toBe(409)
    expect(await unavailable.json()).toMatchObject({
      error: {
        code: 'ITEMS_UNAVAILABLE',
        details: { unavailableItemIds: ['item-ca-phe-sua-da'] },
      },
    })
  })

  it('PATCH partial không làm mất các trường client không gửi', async () => {
    const response = await fetch(`${BASE}/admin/items/item-ca-phe-sua-da`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${OWNER_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: false }),
    })
    const item = await response.json() as { name: string; categoryId: string; isAvailable: boolean }

    expect(response.status).toBe(200)
    expect(item).toMatchObject({
      name: 'Cà phê sữa đá',
      categoryId: 'cat-do-uong',
      isAvailable: false,
    })
  })
})
