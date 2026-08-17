import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import type { BillingAction, BillingAudience } from '@kimthanh-tableqr/contracts'
import type { AuthenticatedUser } from '../auth/auth.types'
import { hashGuestAccessToken } from '../guest/guest-access'
import { PrismaService } from '../prisma.service'
import { BILLING_ACTION_KEY, type BillingRouteAction } from './billing-action.decorator'
import { EntitlementService } from './entitlement.service'

type RequestWithUser = Request & { user?: AuthenticatedUser }

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const AUDIENCE: Record<BillingAction, BillingAudience> = {
  'guest-write': 'guest',
  'staff-write': 'staff',
  'admin-business-write': 'owner',
  'admin-account-write': 'owner',
}

/**
 * Guard toàn cục, mặc định TỪ CHỐI: route ghi nào quên khai báo `@BillingAction`
 * sẽ hỏng ngay lần gọi đầu thay vì âm thầm bỏ qua entitlement. Đọc không bao giờ
 * bị chặn — chủ quán quá hạn vẫn phải xem được dữ liệu và hoá đơn của mình.
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlement: EntitlementService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true
    const request = context.switchToHttp().getRequest<RequestWithUser>()
    if (READ_METHODS.has(request.method)) return true

    const action = this.reflector.getAllAndOverride<BillingRouteAction | undefined>(BILLING_ACTION_KEY, [context.getHandler(), context.getClass()])
    if (!action) throw new InternalServerErrorException(`Route ${request.method} ${request.path} chưa khai báo @BillingAction.`)
    if (action === 'exempt') return true

    const restaurantId = action === 'guest-write' ? await this.guestRestaurantId(request) : await this.userRestaurantId(request)
    // Không xác định được quán nghĩa là request thiếu/sai xác thực: để tầng auth
    // trả đúng 401/404 thay vì đoán thành lỗi thanh toán.
    if (!restaurantId) return true

    await this.entitlement.assert(restaurantId, action, AUDIENCE[action])
    return true
  }

  private async userRestaurantId(request: RequestWithUser): Promise<string | null> {
    if (request.user?.restaurantId) return request.user.restaurantId
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return null
    try {
      const payload = await this.jwt.verifyAsync<{ restaurantId?: string; tokenUse?: string }>(token)
      return payload.tokenUse === 'staff_stream' ? null : payload.restaurantId ?? null
    } catch {
      return null
    }
  }

  private async guestRestaurantId(request: RequestWithUser): Promise<string | null> {
    const sessionId = request.params?.sessionId
    const token = request.headers['x-guest-access']
    if (typeof sessionId !== 'string' || !sessionId || typeof token !== 'string' || !token.trim()) return null
    // RLS chỉ trả phiên khi capability khớp, nên guard không tự nới quyền đọc.
    const session = await this.prisma.withGuestSessionAccess(sessionId, hashGuestAccessToken(token), (tx) =>
      tx.tableSession.findUnique({ where: { id: sessionId }, select: { restaurantId: true } }),
    )
    return session?.restaurantId ?? null
  }
}
