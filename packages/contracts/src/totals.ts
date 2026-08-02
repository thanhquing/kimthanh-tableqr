/** Moi phep cong tien cua he thong nam trong file nay.
 *
 *  Ly do: FE va BE khong duoc phep cong ra hai con so khac nhau (quy tac vang #9).
 *  API o M6 import chinh nhung ham nay, khong viet lai.
 *
 *  Nguon: ai-docs/03-domain-model.md §Gia tri dan xuat
 */

import type { OrderStatus } from './enums.js'

/** Mot dong trong gio hang cua khach (chua gui di). */
export interface CartLine {
  menuItemId: string
  name: string
  unitPriceVnd: number
  quantity: number
  note: string | null
}

/** Du lieu toi thieu de tinh tien mot item da gui. */
export interface PricedItem {
  unitPriceVndSnapshot: number
  quantity: number
}

/** Du lieu toi thieu de tinh tien mot don da gui. */
export interface PricedOrder {
  status: OrderStatus
  items: readonly PricedItem[]
}

/** Thanh tien mot dong: don gia x so luong. */
export function calcLineTotal(unitPriceVnd: number, quantity: number): number {
  return Math.round(unitPriceVnd) * Math.max(0, Math.trunc(quantity))
}

/** Tong tien gio hang cua khach. */
export function calcCartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + calcLineTotal(l.unitPriceVnd, l.quantity), 0)
}

/** Tong so mon trong gio (cong so luong, khong phai dem so dong). */
export function calcCartItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + Math.max(0, Math.trunc(l.quantity)), 0)
}

/** Tong tien mot don da gui — doc gia SNAPSHOT, khong bao gio doc gia MenuItem hien tai. */
export function calcOrderTotal(items: readonly PricedItem[]): number {
  return items.reduce((sum, i) => sum + calcLineTotal(i.unitPriceVndSnapshot, i.quantity), 0)
}

/**
 * Tong bill ca phien.
 *
 * LOAI don `CANCELLED` — huy don phai lam tong tien giam dung bang gia tri don do.
 * Day la loi de mac nhat khi cong tay o component.
 */
export function calcSessionTotal(orders: readonly PricedOrder[]): number {
  return orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + calcOrderTotal(o.items), 0)
}

/**
 * Gop mot mon vao gio.
 *
 * Quy tac (ai-tasks/05 GU-05): cung `menuItemId` VA cung `note` -> cong so luong;
 * khac `note` -> tach thanh dong rieng. Vi "pho khong hanh" va "pho" la hai mon
 * khac nhau doi voi bep.
 */
export function addToCart(lines: readonly CartLine[], incoming: CartLine): CartLine[] {
  const key = (l: CartLine) => `${l.menuItemId}::${(l.note ?? '').trim()}`
  const target = key(incoming)
  const idx = lines.findIndex((l) => key(l) === target)

  if (idx === -1) return [...lines, { ...incoming, quantity: Math.max(1, incoming.quantity) }]

  return lines.map((l, i) =>
    i === idx ? { ...l, quantity: l.quantity + Math.max(1, incoming.quantity) } : l,
  )
}
