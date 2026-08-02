import { afterEach, describe, expect, it, vi } from 'vitest'
import { MENU_ITEMS } from './fixtures.js'
import { MockApiError } from './mock-error.js'
import { MockStore, type StorageLike } from './store.js'

const QR_BAN_1 = 'qr-ban-01-a7f3k9m2xp'

function availableLine(quantity = 1) {
  return { menuItemId: 'item-ca-phe-sua-da', quantity, note: null }
}

function expectApiError(action: () => unknown, code: string, status: number): void {
  try {
    action()
    throw new Error('Không ném lỗi như mong đợi')
  } catch (error) {
    expect(error).toBeInstanceOf(MockApiError)
    expect(error).toMatchObject({ code, status })
  }
}

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
  removeItem(key: string): void { this.values.delete(key) }
}

afterEach(() => vi.useRealTimers())

describe('MockStore — 7 quy tắc bất biến', () => {
  it('chỉ mở một session cho mỗi bàn và bootstrap lặp lại trả cùng session', () => {
    const store = new MockStore()
    const first = store.bootstrapGuest(QR_BAN_1)
    const second = store.bootstrapGuest(QR_BAN_1)

    expect(second.session.id).toBe(first.session.id)
    expect(store.snapshot().sessions.filter((session) => session.tableId === 'tbl-01' && session.status === 'OPEN')).toHaveLength(1)
  })

  it('chỉ tạo đơn trong session OPEN và close không xoá đơn cũ', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const order = store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'request-1')
    store.closeSession(sessionId)

    expectApiError(
      () => store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'request-2'),
      'SESSION_CLOSED',
      409,
    )
    expect(store.snapshot().orders.some((candidate) => candidate.id === order.id)).toBe(true)
    expect(store.snapshot().orderItems.some((item) => item.orderId === order.id)).toBe(true)
  })

  it('đánh sequenceNo liên tục trong từng session', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id

    const first = store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'request-1')
    const second = store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'request-2')

    expect([first.sequenceNo, second.sequenceNo]).toEqual([1, 2])
  })

  it('chặn đơn rỗng và quantity không phải số nguyên dương', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id

    expectApiError(() => store.createOrder(sessionId, { note: null, items: [] }, 'empty'), 'EMPTY_ORDER', 400)
    expectApiError(
      () => store.createOrder(sessionId, { note: null, items: [availableLine(0)] }, 'quantity'),
      'VALIDATION_ERROR',
      400,
    )
  })

  it('chặn món hết hàng với danh sách id chi tiết', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id

    try {
      store.createOrder(
        sessionId,
        { note: null, items: [{ menuItemId: 'item-banh-xeo', quantity: 1, note: null }] },
        'unavailable',
      )
      throw new Error('Không ném lỗi như mong đợi')
    } catch (error) {
      expect(error).toMatchObject({
        code: 'ITEMS_UNAVAILABLE',
        status: 409,
        details: { unavailableItemIds: ['item-banh-xeo'] },
      })
    }
  })

  it('snapshot tên và giá khi gửi, không tính lại sau khi admin đổi món', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const original = MENU_ITEMS.find((item) => item.id === 'item-ca-phe-sua-da')!
    const order = store.createOrder(sessionId, { note: null, items: [availableLine(2)] }, 'snapshot')

    store.updateItem(original.id, { name: 'Tên mới', priceVnd: 999_999 })
    const saved = store.getGuestOrders(sessionId).orders.find((candidate) => candidate.id === order.id)!

    expect(saved.items[0]).toMatchObject({
      nameSnapshot: original.name,
      unitPriceVndSnapshot: original.priceVnd,
      lineTotalVnd: original.priceVnd * 2,
    })
  })

  it('không cho caller sửa OrderItem đã gửi qua object response hoặc snapshot', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const order = store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'immutable')
    order.items[0]!.quantity = 99
    const state = store.snapshot()
    const internalItem = state.orderItems.find((item) => item.orderId === order.id)!
    internalItem.quantity = 88

    expect(store.getGuestOrders(sessionId).orders[0]!.items[0]!.quantity).toBe(1)
  })
})

describe('MockStore — hành vi server quan trọng', () => {
  it('idempotency trả lại cùng đơn trong cửa sổ 60 giây', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const request = { note: null, items: [availableLine()] }

    const first = store.createOrder(sessionId, request, 'same-request')
    const second = store.createOrder(sessionId, request, 'same-request')

    expect(second.id).toBe(first.id)
    expect(store.getGuestOrders(sessionId).orders).toHaveLength(1)
  })

  it('persist state qua storage và resetStore khôi phục fixture', () => {
    const storage = new MemoryStorage()
    const firstStore = new MockStore(storage)
    const sessionId = firstStore.bootstrapGuest(QR_BAN_1).session.id
    firstStore.createOrder(sessionId, { note: null, items: [availableLine()] }, 'persist')

    const restoredStore = new MockStore(storage)
    expect(restoredStore.getGuestOrders(sessionId).orders).toHaveLength(1)
    restoredStore.reset()
    expect(restoredStore.snapshot().sessions.some((session) => session.tableId === 'tbl-01')).toBe(false)
  })

  it('loại đơn CANCELLED khỏi tổng phiên', () => {
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const order = store.createOrder(sessionId, { note: null, items: [availableLine(2)] }, 'cancel')
    store.updateOrderStatus(order.id, 'CANCELLED')

    expect(store.getGuestOrders(sessionId).session.totalVnd).toBe(0)
  })

  it('polling since trả cả đơn vừa đổi trạng thái, không chỉ đơn mới tạo', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T10:00:00.000Z'))
    const store = new MockStore()
    const sessionId = store.bootstrapGuest(QR_BAN_1).session.id
    const order = store.createOrder(sessionId, { note: null, items: [availableLine()] }, 'poll')
    const cursor = store.getStaffOrders().serverTime

    vi.setSystemTime(new Date('2026-08-02T10:00:01.000Z'))
    store.updateOrderStatus(order.id, 'PREPARING')

    expect(store.getStaffOrders(undefined, cursor).orders).toEqual([
      expect.objectContaining({ id: order.id, status: 'PREPARING' }),
    ])
  })
})
