/** Entity. Nguon: ai-docs/03-domain-model.md
 *
 *  Tien LUON la so nguyen VND. Thoi gian LUON la chuoi ISO 8601 UTC.
 */

import type {
  OrderStatus,
  SessionStatus,
  StaffCallStatus,
  StaffCallType,
  TableStatus,
} from './enums.js'

/** Chuoi ISO 8601 UTC, vi du "2026-08-01T10:15:30.000Z". */
export type IsoDateTime = string

export interface Restaurant {
  id: string
  name: string
  logoUrl: string | null
  address: string | null
}

export interface DiningTable {
  id: string
  /** Ma ngan duy nhat de nhan vien goi ten: "B01". */
  code: string
  /** Hien cho nguoi doc: "Ban 1". */
  displayName: string
  /** Token ngau nhien >= 16 ky tu, nam trong URL cua ma QR.
   *  Khong dung `code` vi nhu vay doan duoc ban khac. */
  qrToken: string
  status: TableStatus
  isActive: boolean
  sortOrder: number
}

export interface MenuCategory {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItem {
  id: string
  categoryId: string
  name: string
  description: string | null
  /** So nguyen dong. 45000 nghia la 45.000 đ. */
  priceVnd: number
  imageUrl: string | null
  /** false = "Het mon". */
  isAvailable: boolean
  sortOrder: number
}

export interface TableSession {
  id: string
  tableId: string
  openedAt: IsoDateTime
  closedAt: IsoDateTime | null
  status: SessionStatus
  paidAt: IsoDateTime | null
}

export interface Order {
  id: string
  sessionId: string
  /** Lap lai tu session de man hinh bep khong phai join. */
  tableId: string
  /** Lan goi thu may TRONG PHIEN NAY, bat dau tu 1. */
  sequenceNo: number
  status: OrderStatus
  note: string | null
  createdAt: IsoDateTime
}

export interface OrderItem {
  id: string
  orderId: string
  menuItemId: string
  /** Ten mon TAI THOI DIEM gui don. */
  nameSnapshot: string
  /** Gia TAI THOI DIEM gui don. Chu quan doi gia khong lam doi bill da gui. */
  unitPriceVndSnapshot: number
  quantity: number
  note: string | null
}

export interface StaffCall {
  id: string
  sessionId: string
  tableId: string
  type: StaffCallType
  status: StaffCallStatus
  createdAt: IsoDateTime
}
