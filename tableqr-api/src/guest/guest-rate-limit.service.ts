import { HttpException, Injectable } from '@nestjs/common'

@Injectable()
export class GuestRateLimitService {
  private readonly requests = new Map<string, number[]>()

  take(key: string, limit: number): void {
    const now = Date.now()
    const recent = (this.requests.get(key) ?? []).filter((time) => time > now - 60_000)
    if (recent.length >= limit) {
      throw new HttpException({ error: { code: 'RATE_LIMITED', message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', details: null } }, 429)
    }
    recent.push(now)
    this.requests.set(key, recent)
  }
}
