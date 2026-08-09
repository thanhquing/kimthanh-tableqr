import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import type { AuthenticatedUser } from './auth.types'
import { ROLE_METADATA_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Array<'staff' | 'owner'>>(ROLE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles) return true
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>()
    if (request.user && roles.includes(request.user.role)) return true
    throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này.')
  }
}
