import { describe, expect, it } from 'vitest'
import { canWriteBusiness, nextSubscriptionState } from './billing.js'

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
