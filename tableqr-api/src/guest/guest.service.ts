import { HttpException, Injectable } from '@nestjs/common'
import { createHash, randomBytes } from 'node:crypto'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { GuestRateLimitService } from './guest-rate-limit.service'
import { calcOrderTotalFromContracts, calcSessionTotalFromContracts } from '../common/totals'
import { RealtimeService } from '../realtime/realtime.service'

type CreateOrderBody = { note?: unknown; items?: unknown }
type CreateCallBody = { type?: unknown }
function fail(status: number, code: string, message: string, details: unknown = null): never { throw new HttpException({ error: { code, message, details } }, status) }

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService, private readonly rateLimit: GuestRateLimitService, private readonly realtime: RealtimeService) {}

  async bootstrap(qrToken: string) {
    this.rateLimit.take(`qr:${qrToken}`, 20)
    const table = await this.prisma.diningTable.findFirst({ where: { qrToken, isActive: true } })
    if (!table) fail(404, 'TABLE_NOT_FOUND', 'Mã QR không hợp lệ, vui lòng gọi nhân viên.')
    const activeTable = table!
    let session = await this.prisma.tableSession.findFirst({ where: { restaurantId: activeTable.restaurantId, tableId: activeTable.id, status: 'OPEN' } })
    if (!session) {
      try { session = await this.prisma.tableSession.create({ data: { restaurantId: activeTable.restaurantId, tableId: activeTable.id } }) }
      catch (error: unknown) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
        session = await this.prisma.tableSession.findFirst({ where: { restaurantId: activeTable.restaurantId, tableId: activeTable.id, status: 'OPEN' } })
        if (!session) throw error
      }
    }
    // Mỗi lần quét QR tạo capability riêng. Hash nằm trong DB nên lần quét sau
    // không làm hết hiệu lực điện thoại khách đang gọi món cùng phiên.
    const guestAccessToken = this.newGuestAccessToken()
    await this.prisma.guestSessionAccess.create({ data: { sessionId: session!.id, tokenHash: this.hashGuestAccessToken(guestAccessToken) } })
    const [restaurant, categories, items] = await Promise.all([
      this.prisma.restaurant.findUniqueOrThrow({ where: { id: activeTable.restaurantId } }),
      this.prisma.menuCategory.findMany({ where: { restaurantId: activeTable.restaurantId, isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.menuItem.findMany({ where: { restaurantId: activeTable.restaurantId, deletedAt: null, category: { isActive: true } }, orderBy: { sortOrder: 'asc' } }),
    ])
    return {
      restaurant: { id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl },
      table: { id: activeTable.id, code: activeTable.code, displayName: activeTable.displayName },
      session: { id: session!.id, status: session!.status, openedAt: session!.openedAt },
      guestAccessToken,
      categories: categories.map(({ id, name, sortOrder }) => ({ id, name, sortOrder })),
      items: items.map(({ id, categoryId, name, description, priceVnd, imageUrl, isAvailable, sortOrder }) => ({ id, categoryId, name, description, priceVnd, imageUrl, isAvailable, sortOrder })),
    }
  }

  async orders(sessionId: string, guestAccessToken: string | undefined) {
    const session = await this.sessionWithAccess(sessionId, guestAccessToken, { orders: { include: { items: true }, orderBy: { sequenceNo: 'asc' } } })
    if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
    const openSession = session!
    const orders = await Promise.all(openSession.orders.map((order) => this.orderDto(order)))
    const totalVnd = await calcSessionTotalFromContracts(openSession.orders.map((order) => ({ status: order.status, items: order.items })))
    return { session: { id: openSession.id, status: openSession.status, totalVnd }, orders }
  }

  async createOrder(sessionId: string, guestAccessToken: string | undefined, requestId: string | undefined, body: CreateOrderBody) {
    if (!requestId) fail(400, 'VALIDATION_ERROR', 'Thiếu mã yêu cầu gửi đơn.', { fields: { requestId: 'Thiếu X-Request-Id.' } })
    const safeRequestId = requestId!
    if (!Array.isArray(body.items) || body.items.length === 0) fail(400, 'EMPTY_ORDER', 'Vui lòng chọn ít nhất một món.')
    const result = await this.prisma.$transaction(async (tx) => {
      await this.requireSessionAccess(tx, sessionId, guestAccessToken)
      const session = await tx.tableSession.findUnique({ where: { id: sessionId } })
      if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
      const restaurantId = session.restaurantId
      await tx.guestOrderRequest.deleteMany({ where: { restaurantId, createdAt: { lt: new Date(Date.now() - 60_000) } } })
      const existing = await tx.guestOrderRequest.findFirst({ where: { restaurantId, sessionId, requestId: safeRequestId } })
      if (existing) return { order: await this.orderDto(await tx.order.findUniqueOrThrow({ where: { id: existing.orderId }, include: { items: true } })), reused: true }
      this.rateLimit.take(`table:${session.tableId}`, 10)
      const lines = body.items as Array<{ menuItemId?: unknown; quantity?: unknown; note?: unknown }>
      if (lines.some((line) => typeof line.menuItemId !== 'string' || !Number.isInteger(line.quantity) || (line.quantity as number) < 1)) fail(400, 'VALIDATION_ERROR', 'Dữ liệu món không hợp lệ.', { fields: { items: 'Mỗi món cần mã và số lượng nguyên từ 1.' } })
      const menuItems = await tx.menuItem.findMany({ where: { restaurantId, id: { in: lines.map((line) => line.menuItemId as string) }, deletedAt: null } })
      const unavailable = menuItems.filter((item) => !item.isAvailable)
      if (menuItems.length !== lines.length || unavailable.length) fail(409, 'ITEMS_UNAVAILABLE', 'Có món vừa hết. Vui lòng chọn món khác.', { unavailableItemIds: unavailable.map((item) => item.id) })
      const max = await tx.order.aggregate({ where: { restaurantId, sessionId }, _max: { sequenceNo: true } })
      const order = await tx.order.create({ data: { restaurantId, sessionId, tableId: session.tableId, sequenceNo: (max._max.sequenceNo ?? 0) + 1, note: typeof body.note === 'string' ? body.note : null, items: { create: lines.map((line) => { const item = menuItems.find((candidate) => candidate.id === line.menuItemId)!; return { restaurantId, menuItemId: item.id, nameSnapshot: item.name, unitPriceVndSnapshot: item.priceVnd, quantity: line.quantity as number, note: typeof line.note === 'string' ? line.note : null } }) } }, include: { items: true } })
      await tx.guestOrderRequest.create({ data: { restaurantId, sessionId, requestId: safeRequestId, orderId: order.id } })
      return { order: await this.orderDto(order), reused: false }
    })
    if (!result.reused) await this.realtime.publishOrderCreated(result.order.id)
    return result
  }

  async createCall(sessionId: string, guestAccessToken: string | undefined, body: CreateCallBody) {
    if (body.type !== 'CALL_STAFF' && body.type !== 'REQUEST_BILL') fail(400, 'VALIDATION_ERROR', 'Loại yêu cầu không hợp lệ.', { fields: { type: 'Chọn gọi nhân viên hoặc xin tính tiền.' } })
    await this.requireSessionAccess(this.prisma, sessionId, guestAccessToken)
    const session = await this.prisma.tableSession.findUnique({ where: { id: sessionId } })
    if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
    const callType = body.type as 'CALL_STAFF' | 'REQUEST_BILL'
    const existing = await this.prisma.staffCall.findFirst({ where: { restaurantId: session.restaurantId, sessionId, type: callType, status: 'PENDING' } })
    const call = existing ?? await this.prisma.staffCall.create({ data: { restaurantId: session.restaurantId, sessionId, tableId: session.tableId, type: callType } })
    if (!existing) await this.realtime.publishCallCreated(call.id)
    return { call: { id: call.id, type: call.type, status: call.status, createdAt: call.createdAt }, reused: Boolean(existing) }
  }

  private async orderDto(order: { id: string; sequenceNo: number; status: string; createdAt: Date; note: string | null; items: Array<{ id: string; menuItemId: string; nameSnapshot: string; unitPriceVndSnapshot: number; quantity: number; note: string | null }> }) {
    const items = order.items.map(({ id, menuItemId, nameSnapshot, unitPriceVndSnapshot, quantity, note }) => ({ id, menuItemId, nameSnapshot, unitPriceVndSnapshot, quantity, note, lineTotalVnd: unitPriceVndSnapshot * quantity }))
    return { id: order.id, sequenceNo: order.sequenceNo, status: order.status, createdAt: order.createdAt, note: order.note, totalVnd: await calcOrderTotalFromContracts(order.items), items }
  }

  private newGuestAccessToken(): string { return randomBytes(32).toString('base64url') }
  private hashGuestAccessToken(token: string): string { return createHash('sha256').update(token).digest('hex') }
  private hashGuestAccessTokenOrNull(token: string | undefined): string { if (!token?.trim()) fail(401, 'GUEST_ACCESS_INVALID', 'Phiên quét mã không hợp lệ. Vui lòng quét lại mã QR.'); return this.hashGuestAccessToken(token) }
  private async requireSessionAccess(client: Pick<PrismaService, 'guestSessionAccess'> | Prisma.TransactionClient, sessionId: string, token: string | undefined) {
    const access = await client.guestSessionAccess.findFirst({ where: { sessionId, tokenHash: this.hashGuestAccessTokenOrNull(token) }, select: { id: true } })
    if (!access) fail(401, 'GUEST_ACCESS_INVALID', 'Phiên quét mã không hợp lệ. Vui lòng quét lại mã QR.')
  }
  private async sessionWithAccess(sessionId: string, token: string | undefined, include: { orders: { include: { items: true }; orderBy: { sequenceNo: 'asc' } } }) {
    await this.requireSessionAccess(this.prisma, sessionId, token)
    return this.prisma.tableSession.findUnique({ where: { id: sessionId }, include })
  }
}
