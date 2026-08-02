import { describe, expect, it } from 'vitest'
import {
  addToCart,
  calcCartItemCount,
  calcCartTotal,
  calcLineTotal,
  calcOrderTotal,
  calcSessionTotal,
  type CartLine,
} from './totals.js'

const line = (over: Partial<CartLine> = {}): CartLine => ({
  menuItemId: 'item-1',
  name: 'Cà phê sữa đá',
  unitPriceVnd: 25000,
  quantity: 1,
  note: null,
  ...over,
})

describe('calcLineTotal', () => {
  it('nhan don gia voi so luong', () => {
    expect(calcLineTotal(25000, 2)).toBe(50000)
    expect(calcLineTotal(45000, 3)).toBe(135000)
  })

  it('so luong 0 hoac am ra 0, khong ra so am', () => {
    expect(calcLineTotal(25000, 0)).toBe(0)
    expect(calcLineTotal(25000, -3)).toBe(0)
  })
})

describe('calcCartTotal', () => {
  it('gio rong la 0', () => {
    expect(calcCartTotal([])).toBe(0)
  })

  it('cong nhieu dong co so luong > 1', () => {
    const cart = [
      line({ unitPriceVnd: 25000, quantity: 2 }), // 50.000
      line({ menuItemId: 'item-2', unitPriceVnd: 45000, quantity: 3 }), // 135.000
    ]
    expect(calcCartTotal(cart)).toBe(185000)
  })

  it('dem so mon la cong so luong, khong phai dem so dong', () => {
    const cart = [line({ quantity: 2 }), line({ menuItemId: 'item-2', quantity: 3 })]
    expect(calcCartItemCount(cart)).toBe(5)
  })
})

describe('addToCart — quy tac gop mon', () => {
  it('cung mon cung ghi chu thi CONG SO LUONG', () => {
    const cart = addToCart([line({ quantity: 1, note: 'ít đá' })], line({ quantity: 2, note: 'ít đá' }))
    expect(cart).toHaveLength(1)
    expect(cart[0]?.quantity).toBe(3)
  })

  it('cung mon KHAC ghi chu thi TACH DONG — voi bep day la hai mon khac nhau', () => {
    const cart = addToCart([line({ note: 'ít đá' })], line({ note: 'không đá' }))
    expect(cart).toHaveLength(2)
  })

  it('ghi chu null va chuoi rong coi la mot', () => {
    const cart = addToCart([line({ note: null })], line({ note: '' }))
    expect(cart).toHaveLength(1)
    expect(cart[0]?.quantity).toBe(2)
  })

  it('mon khac nhau thi luon tach dong', () => {
    const cart = addToCart([line()], line({ menuItemId: 'item-2' }))
    expect(cart).toHaveLength(2)
  })

  it('khong sua mang goc (immutable)', () => {
    const original = [line()]
    addToCart(original, line({ menuItemId: 'item-9' }))
    expect(original).toHaveLength(1)
  })
})

describe('calcOrderTotal', () => {
  it('doc gia SNAPSHOT chu khong phai gia hien tai', () => {
    expect(
      calcOrderTotal([
        { unitPriceVndSnapshot: 25000, quantity: 2 },
        { unitPriceVndSnapshot: 45000, quantity: 1 },
      ]),
    ).toBe(95000)
  })
})

describe('calcSessionTotal', () => {
  const order = (status: 'NEW' | 'PREPARING' | 'SERVED' | 'CANCELLED', total: number) => ({
    status,
    items: [{ unitPriceVndSnapshot: total, quantity: 1 }],
  })

  it('cong don nhieu lan goi mon trong mot phien', () => {
    expect(calcSessionTotal([order('SERVED', 95000), order('NEW', 50000)])).toBe(145000)
  })

  it('LOAI don da huy — huy don phai lam tong giam dung bang gia tri don do', () => {
    const orders = [order('SERVED', 95000), order('CANCELLED', 50000), order('NEW', 30000)]
    expect(calcSessionTotal(orders)).toBe(125000)
  })

  it('phien chua goi gi la 0', () => {
    expect(calcSessionTotal([])).toBe(0)
  })

  it('huy het thi tong la 0', () => {
    expect(calcSessionTotal([order('CANCELLED', 95000), order('CANCELLED', 50000)])).toBe(0)
  })
})
