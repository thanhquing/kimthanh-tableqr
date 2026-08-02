import { describe, expect, it } from 'vitest'
import {
  canTransitionOrderStatus,
  isTerminalStatus,
  primaryActionLabel,
  primaryNextStatus,
} from './transitions.js'

describe('canTransitionOrderStatus', () => {
  it('cho phep luong xuoi', () => {
    expect(canTransitionOrderStatus('NEW', 'PREPARING')).toBe(true)
    expect(canTransitionOrderStatus('PREPARING', 'SERVED')).toBe(true)
  })

  it('cho phep huy tu NEW va PREPARING', () => {
    expect(canTransitionOrderStatus('NEW', 'CANCELLED')).toBe(true)
    expect(canTransitionOrderStatus('PREPARING', 'CANCELLED')).toBe(true)
  })

  it('CHAN quay lui — SERVED la trang thai cuoi', () => {
    expect(canTransitionOrderStatus('SERVED', 'PREPARING')).toBe(false)
    expect(canTransitionOrderStatus('SERVED', 'NEW')).toBe(false)
    expect(canTransitionOrderStatus('PREPARING', 'NEW')).toBe(false)
  })

  it('CHAN nhay coc NEW -> SERVED', () => {
    expect(canTransitionOrderStatus('NEW', 'SERVED')).toBe(false)
  })

  it('don da huy khong lam gi duoc nua', () => {
    expect(canTransitionOrderStatus('CANCELLED', 'NEW')).toBe(false)
    expect(canTransitionOrderStatus('CANCELLED', 'PREPARING')).toBe(false)
  })

  it('khong tu chuyen vao chinh no', () => {
    expect(canTransitionOrderStatus('NEW', 'NEW')).toBe(false)
    expect(canTransitionOrderStatus('SERVED', 'SERVED')).toBe(false)
  })
})

describe('primaryNextStatus / primaryActionLabel', () => {
  it('nut chinh tren the don o man hinh bep', () => {
    expect(primaryNextStatus('NEW')).toBe('PREPARING')
    expect(primaryActionLabel('NEW')).toBe('Bắt đầu làm')
    expect(primaryNextStatus('PREPARING')).toBe('SERVED')
    expect(primaryActionLabel('PREPARING')).toBe('Đã phục vụ')
  })

  it('trang thai cuoi thi khong con nut', () => {
    expect(primaryNextStatus('SERVED')).toBeNull()
    expect(primaryActionLabel('SERVED')).toBeNull()
    expect(primaryNextStatus('CANCELLED')).toBeNull()
  })
})

describe('isTerminalStatus', () => {
  it('SERVED va CANCELLED la trang thai cuoi', () => {
    expect(isTerminalStatus('SERVED')).toBe(true)
    expect(isTerminalStatus('CANCELLED')).toBe(true)
    expect(isTerminalStatus('NEW')).toBe(false)
    expect(isTerminalStatus('PREPARING')).toBe(false)
  })
})
