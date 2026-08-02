import { HttpResponse, delay } from 'msw'
import { MockApiError } from './mock-error.js'
import type { StorageLike } from './store.js'

const CHAOS_KEY = 'kimthanh-tableqr:mock-chaos:v1'

export interface ChaosConfig {
  minDelayMs: number
  maxDelayMs: number
  errorRate: number
  offline: boolean
  forceSessionClosed: boolean
  forceItemsUnavailable: boolean
}

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  minDelayMs: 150,
  maxDelayMs: 800,
  errorRate: 0,
  offline: false,
  forceSessionClosed: false,
  forceItemsUnavailable: false,
}

function browserStorage(): StorageLike | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage
}

export class ChaosController {
  private config: ChaosConfig

  constructor(private readonly storage: StorageLike | undefined = browserStorage()) {
    this.config = this.load()
  }

  get(): ChaosConfig {
    return { ...this.config }
  }

  set(patch: Partial<ChaosConfig>): ChaosConfig {
    const next = { ...this.config, ...patch }
    next.minDelayMs = Math.max(0, Math.round(next.minDelayMs))
    next.maxDelayMs = Math.max(next.minDelayMs, Math.round(next.maxDelayMs))
    next.errorRate = Math.min(1, Math.max(0, next.errorRate))
    this.config = next
    this.storage?.setItem(CHAOS_KEY, JSON.stringify(next))
    return this.get()
  }

  reset(): ChaosConfig {
    this.config = { ...DEFAULT_CHAOS_CONFIG }
    this.storage?.removeItem(CHAOS_KEY)
    return this.get()
  }

  async beforeRequest(request: Request): Promise<Response | undefined> {
    const config = this.config
    const waitMs =
      config.minDelayMs + Math.floor(Math.random() * (config.maxDelayMs - config.minDelayMs + 1))
    if (waitMs > 0) await delay(waitMs)
    if (config.offline) return HttpResponse.error()
    if (Math.random() < config.errorRate) {
      throw new MockApiError(500, 'INTERNAL_ERROR', 'Máy chủ đang bận. Vui lòng thử lại.')
    }

    const url = new URL(request.url)
    const isGuestSession = url.pathname.includes('/guest/sessions/')
    if (config.forceSessionClosed && isGuestSession) {
      throw new MockApiError(409, 'SESSION_CLOSED', 'Bàn đã được nhân viên reset. Vui lòng quét lại mã QR.')
    }
    if (
      config.forceItemsUnavailable &&
      request.method === 'POST' &&
      /\/guest\/sessions\/[^/]+\/orders$/.test(url.pathname)
    ) {
      let unavailableItemIds: string[] = []
      try {
        const body = await request.clone().json() as { items?: Array<{ menuItemId?: unknown }> }
        unavailableItemIds = (body.items ?? [])
          .map((item) => item.menuItemId)
          .filter((id): id is string => typeof id === 'string')
      } catch {
        // Handler chính sẽ trả VALIDATION_ERROR nếu body hỏng khi toggle này tắt.
      }
      throw new MockApiError(
        409,
        'ITEMS_UNAVAILABLE',
        'Một món trong đơn vừa hết. Vui lòng chọn món khác.',
        { unavailableItemIds },
      )
    }
    return undefined
  }

  private load(): ChaosConfig {
    const raw = this.storage?.getItem(CHAOS_KEY)
    if (!raw) return { ...DEFAULT_CHAOS_CONFIG }
    try {
      return { ...DEFAULT_CHAOS_CONFIG, ...(JSON.parse(raw) as Partial<ChaosConfig>) }
    } catch {
      this.storage?.removeItem(CHAOS_KEY)
      return { ...DEFAULT_CHAOS_CONFIG }
    }
  }
}

export const chaos = new ChaosController()
