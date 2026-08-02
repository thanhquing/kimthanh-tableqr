import {
  calcLineTotal,
  calcOrderTotal,
  calcSessionTotal,
  canTransitionOrderStatus,
  type AdminCategoriesResponse,
  type AdminItemsResponse,
  type AdminTableDto,
  type AdminTablesResponse,
  type CloseSessionResponse,
  type CreateCategoryRequest,
  type CreateMenuItemRequest,
  type CreateOrderRequest,
  type CreateStaffCallRequest,
  type CreateTableRequest,
  type DiningTable,
  type GuestBootstrapResponse,
  type GuestOrdersResponse,
  type MenuCategory,
  type MenuItem,
  type Order,
  type OrderDto,
  type OrderItem,
  type OrderStatus,
  type PaySessionResponse,
  type Restaurant,
  type StaffCall,
  type StaffCallDto,
  type StaffCallsResponse,
  type StaffOrdersResponse,
  type StaffSessionDetailResponse,
  type StaffTablesResponse,
  type TableRefDto,
  type TableSession,
  type UpdateCategoryRequest,
  type UpdateMenuItemRequest,
  type UpdateRestaurantRequest,
  type UpdateTableRequest,
} from '@kimthanh-tableqr/contracts'
import {
  CATEGORIES,
  MENU_ITEMS,
  RESTAURANT,
  SEEDED_SESSION,
  TABLES,
} from './fixtures.js'
import { MockApiError, notFound, validationError } from './mock-error.js'

const STORE_KEY = 'kimthanh-tableqr:mock-store:v1'
const IDEMPOTENCY_WINDOW_MS = 60_000

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface StoreState {
  restaurant: Restaurant
  categories: MenuCategory[]
  items: MenuItem[]
  deletedItemIds: string[]
  tables: DiningTable[]
  sessions: TableSession[]
  orders: Order[]
  orderUpdatedAt: Record<string, string>
  orderItems: OrderItem[]
  calls: StaffCall[]
}

interface IdempotencyEntry {
  createdAtMs: number
  orderId: string
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function tableRef(table: DiningTable): TableRefDto {
  return { id: table.id, code: table.code, displayName: table.displayName }
}

function createInitialState(): StoreState {
  const now = Date.now()
  const session: TableSession = {
    id: SEEDED_SESSION.sessionId,
    tableId: SEEDED_SESSION.tableId,
    openedAt: new Date(now - 27 * 60_000).toISOString(),
    closedAt: null,
    status: 'OPEN',
    paidAt: null,
  }
  const orders: Order[] = []
  const orderUpdatedAt: Record<string, string> = {}
  const orderItems: OrderItem[] = []

  for (const seeded of SEEDED_SESSION.orders) {
    const orderId = `ord-seed-${seeded.sequenceNo}`
    const createdAt = new Date(now - seeded.minutesAgo * 60_000).toISOString()
    orders.push({
      id: orderId,
      sessionId: session.id,
      tableId: session.tableId,
      sequenceNo: seeded.sequenceNo,
      status: seeded.status,
      note: null,
      createdAt,
    })
    orderUpdatedAt[orderId] = createdAt
    seeded.items.forEach((seededItem, index) => {
      const menuItem = MENU_ITEMS.find((item) => item.id === seededItem.menuItemId)
      if (!menuItem) throw new Error(`Fixture thiếu món ${seededItem.menuItemId}`)
      orderItems.push({
        id: `order-item-seed-${seeded.sequenceNo}-${index + 1}`,
        orderId,
        menuItemId: menuItem.id,
        nameSnapshot: menuItem.name,
        unitPriceVndSnapshot: menuItem.priceVnd,
        quantity: seededItem.quantity,
        note: seededItem.note,
      })
    })
  }

  return {
    restaurant: clone(RESTAURANT),
    categories: clone(CATEGORIES),
    items: clone(MENU_ITEMS),
    deletedItemIds: [],
    tables: clone(TABLES),
    sessions: [session],
    orders,
    orderUpdatedAt,
    orderItems,
    calls: [],
  }
}

export class MockStore {
  private state: StoreState
  private readonly idempotency = new Map<string, IdempotencyEntry>()

  constructor(private readonly storage?: StorageLike) {
    this.state = this.load()
  }

  reset(): void {
    this.state = createInitialState()
    this.idempotency.clear()
    this.storage?.removeItem(STORE_KEY)
    this.persist()
  }

  snapshot(): Readonly<StoreState> {
    return clone(this.state)
  }

  bootstrapGuest(qrToken: string): GuestBootstrapResponse {
    const table = this.state.tables.find((candidate) => candidate.qrToken === qrToken && candidate.isActive)
    if (!table) {
      throw new MockApiError(404, 'TABLE_NOT_FOUND', 'Mã QR không hợp lệ, vui lòng gọi nhân viên.')
    }

    let session = this.openSessionForTable(table.id)
    if (!session) {
      session = {
        id: createId('ses'),
        tableId: table.id,
        openedAt: nowIso(),
        closedAt: null,
        status: 'OPEN',
        paidAt: null,
      }
      this.state.sessions.push(session)
      this.persist()
    }

    const activeCategoryIds = new Set(
      this.state.categories.filter((category) => category.isActive).map((category) => category.id),
    )
    return clone({
      restaurant: {
        id: this.state.restaurant.id,
        name: this.state.restaurant.name,
        logoUrl: this.state.restaurant.logoUrl,
      },
      table: tableRef(table),
      session: { id: session.id, status: session.status, openedAt: session.openedAt },
      categories: this.state.categories
        .filter((category) => category.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ id, name, sortOrder }) => ({ id, name, sortOrder })),
      items: this.state.items
        .filter(
          (item) =>
            activeCategoryIds.has(item.categoryId) && !this.state.deletedItemIds.includes(item.id),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    })
  }

  getGuestOrders(sessionId: string): GuestOrdersResponse {
    const session = this.requireOpenSession(sessionId)
    return this.sessionOrdersResponse(session)
  }

  createOrder(sessionId: string, request: CreateOrderRequest, requestId: string): OrderDto {
    this.clearExpiredIdempotency()
    const cached = this.idempotency.get(requestId)
    if (cached) return this.orderDto(this.requireOrder(cached.orderId))

    const session = this.requireOpenSession(sessionId)
    if (request.items.length === 0) {
      throw new MockApiError(400, 'EMPTY_ORDER', 'Vui lòng chọn ít nhất một món.')
    }

    const menuItems = request.items.map((line, index) => {
      if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw validationError({ [`items.${index}.quantity`]: 'Số lượng phải là số nguyên từ 1.' })
      }
      const item = this.state.items.find(
        (candidate) =>
          candidate.id === line.menuItemId && !this.state.deletedItemIds.includes(candidate.id),
      )
      if (!item) throw validationError({ [`items.${index}.menuItemId`]: 'Món không tồn tại.' })
      return item
    })
    const unavailable = menuItems.filter((item) => !item.isAvailable)
    if (unavailable.length > 0) {
      const names = unavailable.map((item) => `“${item.name}”`).join(', ')
      throw new MockApiError(
        409,
        'ITEMS_UNAVAILABLE',
        `Món ${names} vừa hết. Vui lòng chọn món khác.`,
        { unavailableItemIds: unavailable.map((item) => item.id) },
      )
    }

    const sequenceNo =
      this.state.orders.filter((order) => order.sessionId === session.id).reduce((max, order) => Math.max(max, order.sequenceNo), 0) + 1
    const order: Order = {
      id: createId('ord'),
      sessionId: session.id,
      tableId: session.tableId,
      sequenceNo,
      status: 'NEW',
      note: request.note,
      createdAt: nowIso(),
    }
    const items = request.items.map((line, index): OrderItem => ({
      id: createId('order-item'),
      orderId: order.id,
      menuItemId: menuItems[index]!.id,
      nameSnapshot: menuItems[index]!.name,
      unitPriceVndSnapshot: menuItems[index]!.priceVnd,
      quantity: line.quantity,
      note: line.note,
    }))
    this.state.orders.push(order)
    this.state.orderUpdatedAt[order.id] = order.createdAt
    this.state.orderItems.push(...items)
    this.idempotency.set(requestId, { createdAtMs: Date.now(), orderId: order.id })
    this.persist()
    return this.orderDto(order)
  }

  createCall(sessionId: string, request: CreateStaffCallRequest): { status: 200 | 201; call: StaffCallDto } {
    const session = this.requireOpenSession(sessionId)
    const existing = this.state.calls.find(
      (call) => call.sessionId === session.id && call.type === request.type && call.status === 'PENDING',
    )
    if (existing) return { status: 200, call: this.callDto(existing) }

    const call: StaffCall = {
      id: createId('call'),
      sessionId: session.id,
      tableId: session.tableId,
      type: request.type,
      status: 'PENDING',
      createdAt: nowIso(),
    }
    this.state.calls.push(call)
    this.persist()
    return { status: 201, call: this.callDto(call) }
  }

  getStaffOrders(status?: OrderStatus, since?: string): StaffOrdersResponse {
    const openSessionIds = new Set(
      this.state.sessions.filter((session) => session.status === 'OPEN').map((session) => session.id),
    )
    const sinceMs = since ? Date.parse(since) : null
    if (since && Number.isNaN(sinceMs)) throw validationError({ since: 'Phải là thời gian ISO 8601.' })
    const orders = this.state.orders
      .filter((order) => openSessionIds.has(order.sessionId))
      .filter((order) => !status || order.status === status)
      .filter(
        (order) =>
          sinceMs === null || Date.parse(this.state.orderUpdatedAt[order.id] ?? order.createdAt) > sinceMs,
      )
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .map((order) => {
        const table = this.requireTable(order.tableId)
        return { ...this.orderDto(order), table: tableRef(table), sessionId: order.sessionId }
      })
    return { serverTime: nowIso(), orders }
  }

  updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = this.requireOrder(orderId)
    if (!canTransitionOrderStatus(order.status, status)) {
      throw new MockApiError(409, 'INVALID_TRANSITION', 'Không thể chuyển đơn sang trạng thái này.')
    }
    order.status = status
    this.state.orderUpdatedAt[order.id] = nowIso()
    this.persist()
    const table = this.requireTable(order.tableId)
    return { ...this.orderDto(order), table: tableRef(table), sessionId: order.sessionId }
  }

  getStaffTables(): StaffTablesResponse {
    const tables = this.state.tables
      .filter((table) => table.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((table) => {
        const session = this.openSessionForTable(table.id)
        if (!session) {
          return { id: table.id, code: table.code, displayName: table.displayName, status: 'EMPTY' as const, sortOrder: table.sortOrder, session: null }
        }
        const orders = this.ordersForSession(session.id)
        return {
          id: table.id,
          code: table.code,
          displayName: table.displayName,
          status: 'OCCUPIED' as const,
          sortOrder: table.sortOrder,
          session: {
            id: session.id,
            openedAt: session.openedAt,
            totalVnd: this.sessionTotal(session.id),
            orderCount: orders.length,
            paidAt: session.paidAt,
            pendingCallCount: this.state.calls.filter(
              (call) => call.sessionId === session.id && call.status === 'PENDING',
            ).length,
          },
        }
      })
    return clone({ tables })
  }

  getStaffSession(sessionId: string): StaffSessionDetailResponse {
    const session = this.requireSession(sessionId)
    const table = this.requireTable(session.tableId)
    return clone({
      session: { ...session, totalVnd: this.sessionTotal(session.id) },
      table: tableRef(table),
      orders: this.ordersForSession(session.id).map((order) => this.orderDto(order)),
    })
  }

  paySession(sessionId: string): PaySessionResponse {
    const session = this.requireOpenSession(sessionId)
    session.paidAt ??= nowIso()
    this.persist()
    return { id: session.id, paidAt: session.paidAt }
  }

  closeSession(sessionId: string): CloseSessionResponse {
    const session = this.requireOpenSession(sessionId)
    session.status = 'CLOSED'
    session.closedAt = nowIso()
    this.persist()
    return { id: session.id, status: session.status, closedAt: session.closedAt }
  }

  getStaffCalls(status?: StaffCall['status']): StaffCallsResponse {
    const calls = this.state.calls
      .filter((call) => !status || call.status === status)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
      .map((call) => ({ ...this.callDto(call), table: tableRef(this.requireTable(call.tableId)) }))
    return clone({ calls })
  }

  updateStaffCall(callId: string, status: StaffCall['status']): StaffCallDto {
    const call = this.state.calls.find((candidate) => candidate.id === callId)
    if (!call) throw notFound('callId', 'Yêu cầu không tồn tại.')
    call.status = status
    this.persist()
    return this.callDto(call)
  }

  getCategories(): AdminCategoriesResponse {
    return clone({ categories: [...this.state.categories].sort((a, b) => a.sortOrder - b.sortOrder) })
  }

  createCategory(request: CreateCategoryRequest): MenuCategory {
    const category: MenuCategory = { id: createId('cat'), ...request, isActive: true }
    this.state.categories.push(category)
    this.persist()
    return clone(category)
  }

  updateCategory(id: string, request: UpdateCategoryRequest): MenuCategory {
    const category = this.state.categories.find((candidate) => candidate.id === id)
    if (!category) throw notFound('categoryId', 'Danh mục không tồn tại.')
    Object.assign(category, request)
    this.persist()
    return clone(category)
  }

  deleteCategory(id: string): void {
    if (!this.state.categories.some((category) => category.id === id)) throw notFound('categoryId', 'Danh mục không tồn tại.')
    const hasItems = this.state.items.some(
      (item) => item.categoryId === id && !this.state.deletedItemIds.includes(item.id),
    )
    if (hasItems) throw new MockApiError(409, 'CONFLICT', 'Không thể xoá danh mục còn món.')
    this.state.categories = this.state.categories.filter((category) => category.id !== id)
    this.persist()
  }

  getItems(categoryId?: string): AdminItemsResponse {
    const items = this.state.items
      .filter((item) => !this.state.deletedItemIds.includes(item.id))
      .filter((item) => !categoryId || item.categoryId === categoryId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    return clone({ items })
  }

  createItem(request: CreateMenuItemRequest): MenuItem {
    this.requireCategory(request.categoryId)
    const item: MenuItem = { id: createId('item'), ...request, isAvailable: true }
    this.state.items.push(item)
    this.persist()
    return clone(item)
  }

  updateItem(id: string, request: UpdateMenuItemRequest): MenuItem {
    const item = this.requireActiveItem(id)
    if (request.categoryId) this.requireCategory(request.categoryId)
    Object.assign(item, request)
    this.persist()
    return clone(item)
  }

  deleteItem(id: string): void {
    this.requireActiveItem(id)
    this.state.deletedItemIds.push(id)
    this.persist()
  }

  getAdminTables(guestBaseUrl: string): AdminTablesResponse {
    const tables: AdminTableDto[] = [...this.state.tables]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((table) => ({ ...table, status: this.openSessionForTable(table.id) ? 'OCCUPIED' : 'EMPTY', qrUrl: `${guestBaseUrl.replace(/\/$/, '')}/t/${table.qrToken}` }))
    return clone({ tables })
  }

  createTable(request: CreateTableRequest, guestBaseUrl: string): AdminTableDto {
    this.assertUniqueTableCode(request.code)
    const table: DiningTable = {
      id: createId('tbl'),
      ...request,
      qrToken: `qr-${crypto.randomUUID().replaceAll('-', '')}`,
      status: 'EMPTY',
      isActive: true,
    }
    this.state.tables.push(table)
    this.persist()
    return { ...clone(table), qrUrl: `${guestBaseUrl.replace(/\/$/, '')}/t/${table.qrToken}` }
  }

  updateTable(id: string, request: UpdateTableRequest, guestBaseUrl: string): AdminTableDto {
    const table = this.requireTable(id)
    if (request.code && request.code !== table.code) this.assertUniqueTableCode(request.code)
    Object.assign(table, request)
    this.persist()
    return { ...clone(table), status: this.openSessionForTable(id) ? 'OCCUPIED' : 'EMPTY', qrUrl: `${guestBaseUrl.replace(/\/$/, '')}/t/${table.qrToken}` }
  }

  deleteTable(id: string): void {
    this.requireTable(id)
    if (this.openSessionForTable(id)) throw new MockApiError(409, 'CONFLICT', 'Không thể xoá bàn đang có khách.')
    this.state.tables = this.state.tables.filter((table) => table.id !== id)
    this.persist()
  }

  getRestaurant(): Restaurant {
    return clone(this.state.restaurant)
  }

  updateRestaurant(request: UpdateRestaurantRequest): Restaurant {
    Object.assign(this.state.restaurant, request)
    this.persist()
    return clone(this.state.restaurant)
  }

  private load(): StoreState {
    const raw = this.storage?.getItem(STORE_KEY)
    if (!raw) return createInitialState()
    try {
      const restored = JSON.parse(raw) as StoreState
      restored.orderUpdatedAt ??= Object.fromEntries(
        restored.orders.map((order) => [order.id, order.createdAt]),
      )
      return restored
    } catch {
      this.storage?.removeItem(STORE_KEY)
      return createInitialState()
    }
  }

  private persist(): void {
    this.storage?.setItem(STORE_KEY, JSON.stringify(this.state))
  }

  private openSessionForTable(tableId: string): TableSession | undefined {
    const open = this.state.sessions.filter(
      (session) => session.tableId === tableId && session.status === 'OPEN',
    )
    if (open.length > 1) throw new MockApiError(409, 'CONFLICT', 'Bàn đang có nhiều hơn một phiên mở.')
    return open[0]
  }

  private requireSession(id: string): TableSession {
    const session = this.state.sessions.find((candidate) => candidate.id === id)
    if (!session) throw notFound('sessionId', 'Phiên bàn không tồn tại.')
    return session
  }

  private requireOpenSession(id: string): TableSession {
    const session = this.state.sessions.find((candidate) => candidate.id === id)
    if (!session || session.status !== 'OPEN') {
      throw new MockApiError(409, 'SESSION_CLOSED', 'Bàn đã được nhân viên reset. Vui lòng quét lại mã QR.')
    }
    return session
  }

  private requireOrder(id: string): Order {
    const order = this.state.orders.find((candidate) => candidate.id === id)
    if (!order) throw notFound('orderId', 'Đơn không tồn tại.')
    return order
  }

  private requireTable(id: string): DiningTable {
    const table = this.state.tables.find((candidate) => candidate.id === id)
    if (!table) throw notFound('tableId', 'Bàn không tồn tại.')
    return table
  }

  private requireCategory(id: string): MenuCategory {
    const category = this.state.categories.find((candidate) => candidate.id === id)
    if (!category) throw notFound('categoryId', 'Danh mục không tồn tại.')
    return category
  }

  private requireActiveItem(id: string): MenuItem {
    const item = this.state.items.find(
      (candidate) => candidate.id === id && !this.state.deletedItemIds.includes(candidate.id),
    )
    if (!item) throw notFound('itemId', 'Món không tồn tại.')
    return item
  }

  private assertUniqueTableCode(code: string): void {
    if (this.state.tables.some((table) => table.code.toLocaleUpperCase('vi') === code.toLocaleUpperCase('vi'))) {
      throw validationError({ code: 'Mã bàn đã tồn tại.' })
    }
  }

  private orderDto(order: Order): OrderDto {
    const items = this.state.orderItems.filter((item) => item.orderId === order.id)
    return clone({
      id: order.id,
      sequenceNo: order.sequenceNo,
      status: order.status,
      createdAt: order.createdAt,
      note: order.note,
      totalVnd: calcOrderTotal(items),
      items: items.map((item) => ({ ...item, lineTotalVnd: calcLineTotal(item.unitPriceVndSnapshot, item.quantity) })),
    })
  }

  private ordersForSession(sessionId: string): Order[] {
    return this.state.orders
      .filter((order) => order.sessionId === sessionId)
      .sort((a, b) => a.sequenceNo - b.sequenceNo)
  }

  private sessionTotal(sessionId: string): number {
    return calcSessionTotal(
      this.ordersForSession(sessionId).map((order) => ({
        status: order.status,
        items: this.state.orderItems.filter((item) => item.orderId === order.id),
      })),
    )
  }

  private sessionOrdersResponse(session: TableSession): GuestOrdersResponse {
    return clone({
      session: { id: session.id, status: session.status, totalVnd: this.sessionTotal(session.id) },
      orders: this.ordersForSession(session.id).map((order) => this.orderDto(order)),
    })
  }

  private callDto(call: StaffCall): StaffCallDto {
    return clone({ id: call.id, type: call.type, status: call.status, createdAt: call.createdAt })
  }

  private clearExpiredIdempotency(): void {
    const oldest = Date.now() - IDEMPOTENCY_WINDOW_MS
    for (const [key, entry] of this.idempotency) {
      if (entry.createdAtMs < oldest) this.idempotency.delete(key)
    }
  }
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export const mockStore = new MockStore(browserStorage())

export function resetStore(): void {
  mockStore.reset()
}
