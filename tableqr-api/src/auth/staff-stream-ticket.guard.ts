import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { AuthenticatedUser } from './auth.types'

type RequestWithUser = Request & { user?: AuthenticatedUser }

/** EventSource không gửi Authorization header; chỉ SSE được chấp nhận ticket query ngắn hạn. */
@Injectable()
export class StaffStreamTicketGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const ticket = typeof request.query.stream_ticket === 'string' ? request.query.stream_ticket : undefined
    if (!ticket) throw new UnauthorizedException('Thiếu stream ticket.')
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string
        role: 'staff' | 'owner'
        displayName: string
        restaurantId: string
        tokenUse?: string
      }>(ticket)
      if (payload.tokenUse !== 'staff_stream' || !payload.restaurantId) throw new Error('Sai ticket.')
      request.user = { id: payload.sub, role: payload.role, displayName: payload.displayName, restaurantId: payload.restaurantId }
      return true
    } catch {
      throw new UnauthorizedException('Stream ticket không hợp lệ hoặc đã hết hạn.')
    }
  }
}
