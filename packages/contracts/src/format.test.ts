import { describe, expect, it } from 'vitest'
import {
  formatRelativeTime,
  formatTime,
  formatVnd,
  matchesSearch,
  minutesSince,
  removeVietnameseTones,
} from './format.js'

describe('formatVnd', () => {
  it('nhom nghin bang dau cham, ky hieu dong phia sau', () => {
    expect(formatVnd(45000)).toBe('45.000 ₫')
    expect(formatVnd(25000)).toBe('25.000 ₫')
  })

  it('xu ly 0 dong', () => {
    expect(formatVnd(0)).toBe('0 ₫')
  })

  it('khong nhom voi so duoi 1000', () => {
    expect(formatVnd(5000)).toBe('5.000 ₫')
    expect(formatVnd(999)).toBe('999 ₫')
  })

  it('xu ly so lon — bill lau ca ban', () => {
    expect(formatVnd(350000)).toBe('350.000 ₫')
    expect(formatVnd(1250000)).toBe('1.250.000 ₫')
    expect(formatVnd(12345678)).toBe('12.345.678 ₫')
  })

  it('lam tron ve so nguyen dong', () => {
    expect(formatVnd(45000.4)).toBe('45.000 ₫')
    expect(formatVnd(45000.6)).toBe('45.001 ₫')
  })

  it('khong vo khi nhan gia tri khong hop le', () => {
    expect(formatVnd(Number.NaN)).toBe('0 ₫')
    expect(formatVnd(Number.POSITIVE_INFINITY)).toBe('0 ₫')
  })
})

describe('removeVietnameseTones', () => {
  it('bo dau de khach go khong dau van tim ra mon', () => {
    expect(removeVietnameseTones('Cà phê sữa đá')).toBe('ca phe sua da')
    expect(removeVietnameseTones('Bún bò Huế')).toBe('bun bo hue')
    expect(removeVietnameseTones('Gỏi cuốn')).toBe('goi cuon')
  })

  it('xu ly d gach ngang — khong co dang to hop nen phai thay tay', () => {
    expect(removeVietnameseTones('Đậu')).toBe('dau')
    expect(removeVietnameseTones('bánh đúc')).toBe('banh duc')
  })

  it('giu nguyen chuoi khong dau', () => {
    expect(removeVietnameseTones('Pepsi')).toBe('pepsi')
  })
})

describe('matchesSearch', () => {
  it('go khong dau van ra mon co dau', () => {
    expect(matchesSearch('Cà phê sữa đá', 'ca phe')).toBe(true)
    expect(matchesSearch('Bún bò Huế', 'bun bo')).toBe(true)
  })

  it('khong phan biet hoa thuong', () => {
    expect(matchesSearch('Phở bò', 'PHO')).toBe(true)
  })

  it('tra ve tat ca khi o tim kiem rong', () => {
    expect(matchesSearch('Phở bò', '')).toBe(true)
    expect(matchesSearch('Phở bò', '   ')).toBe(true)
  })

  it('khong khop thi tra false', () => {
    expect(matchesSearch('Phở bò', 'pizza')).toBe(false)
  })
})

describe('formatTime', () => {
  it('dinh dang 24h co so 0 dem dau', () => {
    const d = new Date(2026, 7, 1, 9, 5)
    expect(formatTime(d.toISOString())).toBe('09:05')
  })

  it('khong vo khi chuoi sai', () => {
    expect(formatTime('khong-phai-ngay')).toBe('--:--')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-08-01T10:00:00.000Z')

  it('duoi 1 phut la "vua xong"', () => {
    expect(formatRelativeTime('2026-08-01T09:59:30.000Z', now)).toBe('vừa xong')
  })

  it('tinh theo phut', () => {
    expect(formatRelativeTime('2026-08-01T09:57:00.000Z', now)).toBe('3 phút trước')
  })

  it('tinh theo gio', () => {
    expect(formatRelativeTime('2026-08-01T08:00:00.000Z', now)).toBe('2 giờ trước')
  })

  it('thoi gian tuong lai (dong ho lech) khong ra so am', () => {
    expect(formatRelativeTime('2026-08-01T10:05:00.000Z', now)).toBe('vừa xong')
  })
})

describe('minutesSince', () => {
  const now = new Date('2026-08-01T10:00:00.000Z')

  it('dem phut de man bep to do don qua 10 phut', () => {
    expect(minutesSince('2026-08-01T09:49:00.000Z', now)).toBe(11)
    expect(minutesSince('2026-08-01T09:55:00.000Z', now)).toBe(5)
  })

  it('khong tra so am', () => {
    expect(minutesSince('2026-08-01T10:30:00.000Z', now)).toBe(0)
  })
})
