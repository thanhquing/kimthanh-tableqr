import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { AuthenticatedUser } from './auth.types'

type RequestWithUser = Request & { user?: AuthenticatedUser }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    const queryToken = typeof request.query.access_token === 'string' ? request.query.access_token : undefined
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? queryToken
    if (!token) throw new UnauthorizedException('Thiếu token đăng nhập.')
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string
        role: 'staff' | 'owner'
        displayName: string
      }>(token)
      request.user = { id: payload.sub, role: payload.role, displayName: payload.displayName }
      return true
    } catch {
      throw new UnauthorizedException('Token đăng nhập không hợp lệ.')
    }
  }
}
