/** Bang chuyen trang thai don. Nguon: ai-docs/03-domain-model.md
 *
 *    NEW ──▶ PREPARING ──▶ SERVED
 *     │           │
 *     └───────────┴──▶ CANCELLED
 *
 *  SERVED la trang thai cuoi, khong quay lui. Bam nham thi huy don roi de khach
 *  goi lai — don gian hon lam undo, va khop voi cach quan xu ly ngoai doi.
 *
 *  Server (M6) thuc thi bang nay, KHONG tin UI. UI dung no de an bot nut.
 */

import type { OrderStatus } from './enums.js'

const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
  NEW: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SERVED', 'CANCELLED'],
  SERVED: [],
  CANCELLED: [],
}

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to)
}

export function nextOrderStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED[from]
}

/** Trang thai ke tiep khi nhan vien bam nut chinh tren the don; null = het buoc. */
export function primaryNextStatus(from: OrderStatus): OrderStatus | null {
  if (from === 'NEW') return 'PREPARING'
  if (from === 'PREPARING') return 'SERVED'
  return null
}

/** Nhan tieng Viet cua nut chinh tren the don o man hinh bep. */
export function primaryActionLabel(from: OrderStatus): string | null {
  if (from === 'NEW') return 'Bắt đầu làm'
  if (from === 'PREPARING') return 'Đã phục vụ'
  return null
}

/** Don da ket thuc vong doi, khong con thao tac nao. */
export function isTerminalStatus(status: OrderStatus): boolean {
  return ALLOWED[status].length === 0
}
