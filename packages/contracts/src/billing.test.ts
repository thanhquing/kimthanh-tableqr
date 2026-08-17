import { describe, expect, it } from 'vitest'
import {
  allowsBillingAction,
  canWriteBusiness,
  dueDunningDays,
  graceStartedAt,
  graceWarningMessage,
  nextSubscriptionState,
  reactivatesOnPayment,
  restaurantInactiveMessage,
  SUBSCRIPTION_STATUS,
  type BillingAction,
} from './billing.js'

describe('billing entitlement', () => {
  it('cho phep quán trial, active va grace ghi nghiep vu', () => {
    expect(canWriteBusiness('TRIAL')).toBe(true)
    expect(canWriteBusiness('ACTIVE')).toBe(true)
    expect(canWriteBusiness('GRACE')).toBe(true)
  })
  it('chan quán qua han va tam ngung ghi nghiep vu', () => {
    expect(canWriteBusiness('PAST_DUE')).toBe(false)
    expect(canWriteBusiness('SUSPENDED')).toBe(false)
  })
  it('chuyen trial qua grace 7 ngay, roi past due', () => {
    const trialEndsAt = new Date('2026-10-10T00:00:00.000Z')
    const grace = nextSubscriptionState({ status: 'TRIAL', trialEndsAt, currentPeriodEndsAt: null, graceEndsAt: null }, trialEndsAt)
    expect(grace).toEqual({ status: 'GRACE', graceEndsAt: new Date('2026-10-17T00:00:00.000Z') })
    expect(nextSubscriptionState({ status: 'GRACE', trialEndsAt, currentPeriodEndsAt: null, graceEndsAt: grace.graceEndsAt }, new Date('2026-10-17T00:00:00.000Z')).status).toBe('PAST_DUE')
  })
  it('giu suspended bat bien va active truoc han', () => {
    const now = new Date('2026-10-01T00:00:00.000Z')
    expect(nextSubscriptionState({ status: 'SUSPENDED', trialEndsAt: now, currentPeriodEndsAt: null, graceEndsAt: null }, now).status).toBe('SUSPENDED')
    expect(nextSubscriptionState({ status: 'ACTIVE', trialEndsAt: now, currentPeriodEndsAt: new Date('2026-10-02T00:00:00.000Z'), graceEndsAt: null }, now).status).toBe('ACTIVE')
  })
})

describe('matrix quyen theo hanh dong', () => {
  const actions: BillingAction[] = ['guest-write', 'staff-write', 'admin-business-write', 'admin-account-write']

  it('trial, active va grace cho phep moi hanh dong ghi', () => {
    for (const status of ['TRIAL', 'ACTIVE', 'GRACE'] as const) {
      for (const action of actions) expect(allowsBillingAction(status, action)).toBe(true)
    }
  })

  it('past due va suspended chi con duong thanh toan/cap nhat tai khoan', () => {
    for (const status of ['PAST_DUE', 'SUSPENDED'] as const) {
      expect(allowsBillingAction(status, 'guest-write')).toBe(false)
      expect(allowsBillingAction(status, 'staff-write')).toBe(false)
      expect(allowsBillingAction(status, 'admin-business-write')).toBe(false)
      expect(allowsBillingAction(status, 'admin-account-write')).toBe(true)
    }
  })

  it('moi trang thai deu co quyet dinh, khong roi trang thai nao', () => {
    for (const status of SUBSCRIPTION_STATUS) {
      for (const action of actions) expect(typeof allowsBillingAction(status, action)).toBe('boolean')
    }
  })

  it('thanh toan khong tu mo lai quán bi tam ngung', () => {
    expect(reactivatesOnPayment('PAST_DUE')).toBe(true)
    expect(reactivatesOnPayment('GRACE')).toBe(true)
    expect(reactivatesOnPayment('SUSPENDED')).toBe(false)
  })
})

describe('copy khi quán ngung hoat dong', () => {
  it('moi doi tuong nhan mot copy rieng', () => {
    expect(restaurantInactiveMessage('guest', 'PAST_DUE')).toBe('Quán đang tạm ngưng nhận đơn. Vui lòng gọi nhân viên hỗ trợ.')
    expect(restaurantInactiveMessage('staff', 'PAST_DUE')).toBe('Quán đã hết thời gian gia hạn. Vui lòng báo chủ quán thanh toán để tiếp tục nhận đơn.')
    expect(restaurantInactiveMessage('owner', 'PAST_DUE')).toBe('Dịch vụ đang tạm ngưng. Hãy thanh toán để tiếp tục quản lý quán.')
  })

  it('owner cua quán bi tam ngung duoc chi sang ho tro', () => {
    expect(restaurantInactiveMessage('owner', 'SUSPENDED')).toBe('Tài khoản quán đang tạm ngưng. Vui lòng liên hệ hỗ trợ.')
    expect(restaurantInactiveMessage('guest', 'SUSPENDED')).toBe(restaurantInactiveMessage('guest', 'PAST_DUE'))
  })

  it('banner grace noi ro han cuoi', () => {
    expect(graceWarningMessage('2026-10-17T00:00:00.000Z')).toContain('17/10/2026')
  })
})

describe('lich dunning trong grace', () => {
  const graceEndsAt = new Date('2026-10-17T00:00:00.000Z')

  it('grace bat dau dung 7 ngay truoc han cuoi', () => {
    expect(graceStartedAt(graceEndsAt)).toEqual(new Date('2026-10-10T00:00:00.000Z'))
  })

  it('nhac dung ngay 1, 3 va 7', () => {
    expect(dueDunningDays(graceEndsAt, new Date('2026-10-10T12:00:00.000Z'))).toEqual([])
    expect(dueDunningDays(graceEndsAt, new Date('2026-10-11T00:00:00.000Z'))).toEqual([1])
    expect(dueDunningDays(graceEndsAt, new Date('2026-10-13T05:00:00.000Z'))).toEqual([1, 3])
    expect(dueDunningDays(graceEndsAt, new Date('2026-10-17T00:00:00.000Z'))).toEqual([1, 3, 7])
  })
})
