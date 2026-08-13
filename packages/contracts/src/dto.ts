/** DTO request/response. Phai khop 1:1 voi ai-docs/04-api-contract.md.
 *
 *  Doi shape o day => doi ai-docs/04 => doi packages/mock/handlers => (M6+) doi API,
 *  TRONG CUNG MOT LAN THAY DOI. Day la hop dong (quy tac vang #3).
 */

import type {
  DiningTable,
  IsoDateTime,
  MenuCategory,
  MenuItem,
  Restaurant,
} from './entities.js'
import type {
  OrderStatus,
  SessionStatus,
  StaffCallStatus,
  StaffCallType,
  StaffRole,
} from './enums.js'

export const API_BASE_PATH = '/api/v1'

/** Header khach: uuid do client sinh, luu sessionStorage. Khong phai dang nhap. */
export const GUEST_TOKEN_HEADER = 'X-Guest-Token'
/** Header chong double-submit khi gui don. */
export const REQUEST_ID_HEADER = 'X-Request-Id'

/* ------------------------------------------------------------------ chung */

/** Item da gui, kem thanh tien server tinh san. */
export interface OrderItemDto {
  id: string
  menuItemId: string
  nameSnapshot: string
  unitPriceVndSnapshot: number
  quantity: number
  note: string | null
  lineTotalVnd: number
}

/** Mot lan goi mon. */
export interface OrderDto {
  id: string
  sequenceNo: number
  status: OrderStatus
  createdAt: IsoDateTime
  note: string | null
  totalVnd: number
  items: OrderItemDto[]
}

/** Ban rut gon, dinh kem trong don o man hinh bep. */
export interface TableRefDto {
  id: string
  code: string
  displayName: string
}

/* ------------------------------------------------------- guest (khong login) */

/** GET /guest/tables/:qrToken
 *  Mot request duy nhat cho lan ve dau tien — moi round-trip tren 4G yeu la ~300ms.
 *  Side effect: mo TableSession neu ban dang EMPTY. */
export interface GuestBootstrapResponse {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'logoUrl'>
  table: TableRefDto
  session: { id: string; status: SessionStatus; openedAt: IsoDateTime }
  categories: Pick<MenuCategory, 'id' | 'name' | 'sortOrder'>[]
  items: MenuItem[]
}

/** GET /guest/sessions/:sessionId/orders */
export interface GuestOrdersResponse {
  session: { id: string; status: SessionStatus; totalVnd: number }
  orders: OrderDto[]
}

/** POST /guest/sessions/:sessionId/orders
 *  Client KHONG duoc gui gia len — server tu snapshot tu MenuItem hien tai,
 *  neu khong khach sua duoc gia bang DevTools. */
export interface CreateOrderRequest {
  note: string | null
  items: { menuItemId: string; quantity: number; note: string | null }[]
}

/** POST /guest/sessions/:sessionId/calls */
export interface CreateStaffCallRequest {
  type: StaffCallType
}

export interface StaffCallDto {
  id: string
  type: StaffCallType
  status: StaffCallStatus
  createdAt: IsoDateTime
}

/* -------------------------------------------------------------- staff */

export interface StaffLoginRequest {
  staffLoginCode: string
  pin: string
}

export interface AuthResponse {
  token: string
  role: StaffRole
  displayName: string
}

/** Don o man hinh bep — kem ban de khong phai join phia client. */
export interface StaffOrderDto extends OrderDto {
  table: TableRefDto
  sessionId: string
}

/** GET /staff/orders?status=&since=
 *  `serverTime` dung lam `since` cho lan poll ke tiep — khong dung dong ho may
 *  khach vi co the lech. */
export interface StaffOrdersResponse {
  serverTime: IsoDateTime
  orders: StaffOrderDto[]
}

/** PATCH /staff/orders/:orderId/status */
export interface UpdateOrderStatusRequest {
  status: OrderStatus
}

/** GET /staff/tables
 *  CANH BAO chi phi: `totalVnd` + `orderCount` cho MOI ban la mot GROUP BY duy
 *  nhat o M6, khong duoc dung nested include (N+1). Xem ai-docs/04 §Truong re o
 *  mock nhung dat o SQL. */
export interface StaffTableDto {
  id: string
  code: string
  displayName: string
  status: 'EMPTY' | 'OCCUPIED'
  sortOrder: number
  session: {
    id: string
    openedAt: IsoDateTime
    totalVnd: number
    orderCount: number
    paidAt: IsoDateTime | null
    pendingCallCount: number
  } | null
}

export interface StaffTablesResponse {
  tables: StaffTableDto[]
}

/** GET /staff/sessions/:sessionId */
export interface StaffSessionDetailResponse {
  session: {
    id: string
    status: SessionStatus
    openedAt: IsoDateTime
    closedAt: IsoDateTime | null
    paidAt: IsoDateTime | null
    totalVnd: number
  }
  table: TableRefDto
  orders: OrderDto[]
}

/** POST /staff/sessions/:sessionId/pay */
export interface PaySessionResponse {
  id: string
  paidAt: IsoDateTime
}

/** POST /staff/sessions/:sessionId/close — "Reset ban".
 *  Dat status=CLOSED + closedAt. KHONG xoa don. */
export interface CloseSessionResponse {
  id: string
  status: SessionStatus
  closedAt: IsoDateTime
}

/** GET /staff/calls?status=PENDING */
export interface StaffCallWithTableDto extends StaffCallDto {
  table: TableRefDto
}

export interface StaffCallsResponse {
  calls: StaffCallWithTableDto[]
}

export interface UpdateStaffCallRequest {
  status: StaffCallStatus
}

/* -------------------------------------------------------------- admin */

export interface AdminLoginRequest {
  email: string
  password: string
}

export interface AdminCategoriesResponse {
  categories: MenuCategory[]
}

export interface CreateCategoryRequest {
  name: string
  sortOrder: number
}

export type UpdateCategoryRequest = Partial<Pick<MenuCategory, 'name' | 'sortOrder' | 'isActive'>>

export interface AdminItemsResponse {
  items: MenuItem[]
}

/** POST /admin/uploads/images — multipart/form-data, field `file`. */
export interface UploadImageResponse {
  imageUrl: string
}

export interface CreateMenuItemRequest {
  categoryId: string
  name: string
  description: string | null
  priceVnd: number
  imageUrl: string | null
  sortOrder: number
}

export type UpdateMenuItemRequest = Partial<CreateMenuItemRequest & { isAvailable: boolean }>

/** Ban o man admin — kem qrUrl dung san tu VITE_GUEST_BASE_URL. */
export interface AdminTableDto extends DiningTable {
  qrUrl: string
}

export interface AdminTablesResponse {
  tables: AdminTableDto[]
}

export interface CreateTableRequest {
  code: string
  displayName: string
  sortOrder: number
}

/** KHONG co qrToken — ma da in va dan len ban roi, doi la hong ma. */
export type UpdateTableRequest = Partial<
  Pick<DiningTable, 'code' | 'displayName' | 'sortOrder' | 'isActive'>
>

export type UpdateRestaurantRequest = Partial<Pick<Restaurant, 'name' | 'logoUrl' | 'address'>>

/* ------------------------------------------------------- SSE (chi tu M7) */

export type StaffStreamEvent =
  | { type: 'order.created'; data: StaffOrderDto }
  | { type: 'order.status_changed'; data: StaffOrderDto }
  | { type: 'call.created'; data: StaffCallWithTableDto }
  | { type: 'session.closed'; data: { sessionId: string; tableId: string } }

/* Re-export de app chi can import tu mot cho. */
export type { Order, OrderItem, TableSession, StaffCall } from './entities.js'
