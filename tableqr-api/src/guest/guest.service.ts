import { HttpException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import { GuestRateLimitService } from './guest-rate-limit.service'

type CreateOrderBody = { note?: unknown; items?: unknown }
type CreateCallBody = { type?: unknown }
function fail(status: number, code: string, message: string, details: unknown = null): never { throw new HttpException({ error: { code, message, details } }, status) }

@Injectable()
export class GuestService {
  constructor(private readonly prisma: PrismaService, private readonly rateLimit: GuestRateLimitService) {}

  async bootstrap(qrToken: string) {
    this.rateLimit.take(`qr:${qrToken}`, 20)
    const table = await this.prisma.diningTable.findFirst({ where: { qrToken, isActive: true } })
    if (!table) fail(404, 'TABLE_NOT_FOUND', 'Mã QR không hợp lệ, vui lòng gọi nhân viên.')
    const activeTable = table!
    let session = await this.prisma.tableSession.findFirst({ where: { tableId: activeTable.id, status: 'OPEN' } })
    if (!session) {
      try { session = await this.prisma.tableSession.create({ data: { tableId: activeTable.id } }) }
      catch (error: unknown) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
        session = await this.prisma.tableSession.findFirst({ where: { tableId: activeTable.id, status: 'OPEN' } })
        if (!session) throw error
      }
    }
    const [restaurant, categories, items] = await Promise.all([
      this.prisma.restaurant.findFirstOrThrow(),
      this.prisma.menuCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.menuItem.findMany({ where: { deletedAt: null, category: { isActive: true } }, orderBy: { sortOrder: 'asc' } }),
    ])
    return {
      restaurant: { id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl },
      table: { id: activeTable.id, code: activeTable.code, displayName: activeTable.displayName },
      session: { id: session!.id, status: session!.status, openedAt: session!.openedAt },
      categories: categories.map(({ id, name, sortOrder }) => ({ id, name, sortOrder })),
      items: items.map(({ id, categoryId, name, description, priceVnd, imageUrl, isAvailable, sortOrder }) => ({ id, categoryId, name, description, priceVnd, imageUrl, isAvailable, sortOrder })),
    }
  }

  async orders(sessionId: string) {
    const session = await this.prisma.tableSession.findUnique({ where: { id: sessionId }, include: { orders: { include: { items: true }, orderBy: { sequenceNo: 'asc' } } } })
    if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
    const openSession = session!
    const orders = openSession.orders.map((order) => this.orderDto(order))
    return { session: { id: openSession.id, status: openSession.status, totalVnd: orders.filter((order) => order.status !== 'CANCELLED').reduce((sum, order) => sum + order.totalVnd, 0) }, orders }
  }

  async createOrder(sessionId: string, requestId: string | undefined, body: CreateOrderBody) {
    if (!requestId) fail(400, 'VALIDATION_ERROR', 'Thiếu mã yêu cầu gửi đơn.', { fields: { requestId: 'Thiếu X-Request-Id.' } })
    const safeRequestId = requestId!
    if (!Array.isArray(body.items) || body.items.length === 0) fail(400, 'EMPTY_ORDER', 'Vui lòng chọn ít nhất một món.')
    return this.prisma.$transaction(async (tx) => {
      await tx.guestOrderRequest.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 60_000) } } })
      const existing = await tx.guestOrderRequest.findUnique({ where: { sessionId_requestId: { sessionId, requestId: safeRequestId } } })
      if (existing) return { order: this.orderDto(await tx.order.findUniqueOrThrow({ where: { id: existing.orderId }, include: { items: true } })), reused: true }
      const session = await tx.tableSession.findUnique({ where: { id: sessionId } })
      if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
      this.rateLimit.take(`table:${session.tableId}`, 10)
      const lines = body.items as Array<{ menuItemId?: unknown; quantity?: unknown; note?: unknown }>
      if (lines.some((line) => typeof line.menuItemId !== 'string' || !Number.isInteger(line.quantity) || (line.quantity as number) < 1)) fail(400, 'VALIDATION_ERROR', 'Dữ liệu món không hợp lệ.', { fields: { items: 'Mỗi món cần mã và số lượng nguyên từ 1.' } })
      const menuItems = await tx.menuItem.findMany({ where: { id: { in: lines.map((line) => line.menuItemId as string) }, deletedAt: null } })
      const unavailable = menuItems.filter((item) => !item.isAvailable)
      if (menuItems.length !== lines.length || unavailable.length) fail(409, 'ITEMS_UNAVAILABLE', 'Có món vừa hết. Vui lòng chọn món khác.', { unavailableItemIds: unavailable.map((item) => item.id) })
      const max = await tx.order.aggregate({ where: { sessionId }, _max: { sequenceNo: true } })
      const order = await tx.order.create({ data: { sessionId, tableId: session.tableId, sequenceNo: (max._max.sequenceNo ?? 0) + 1, note: typeof body.note === 'string' ? body.note : null, items: { create: lines.map((line) => { const item = menuItems.find((candidate) => candidate.id === line.menuItemId)!; return { menuItemId: item.id, nameSnapshot: item.name, unitPriceVndSnapshot: item.priceVnd, quantity: line.quantity as number, note: typeof line.note === 'string' ? line.note : null } }) } }, include: { items: true } })
      await tx.guestOrderRequest.create({ data: { sessionId, requestId: safeRequestId, orderId: order.id } })
      return { order: this.orderDto(order), reused: false }
    })
  }

  async createCall(sessionId: string, body: CreateCallBody) {
    if (body.type !== 'CALL_STAFF' && body.type !== 'REQUEST_BILL') fail(400, 'VALIDATION_ERROR', 'Loại yêu cầu không hợp lệ.', { fields: { type: 'Chọn gọi nhân viên hoặc xin tính tiền.' } })
    const session = await this.prisma.tableSession.findUnique({ where: { id: sessionId } })
    if (!session || session.status !== 'OPEN') fail(409, 'SESSION_CLOSED', 'Phiên bàn đã kết thúc.')
    const callType = body.type as 'CALL_STAFF' | 'REQUEST_BILL'
    const existing = await this.prisma.staffCall.findFirst({ where: { sessionId, type: callType, status: 'PENDING' } })
    const call = existing ?? await this.prisma.staffCall.create({ data: { sessionId, tableId: session!.tableId, type: callType } })
    return { call: { id: call.id, type: call.type, status: call.status, createdAt: call.createdAt }, reused: Boolean(existing) }
  }

  private orderDto(order: { id: string; sequenceNo: number; status: string; createdAt: Date; note: string | null; items: Array<{ id: string; menuItemId: string; nameSnapshot: string; unitPriceVndSnapshot: number; quantity: number; note: string | null }> }) {
    const items = order.items.map(({ id, menuItemId, nameSnapshot, unitPriceVndSnapshot, quantity, note }) => ({ id, menuItemId, nameSnapshot, unitPriceVndSnapshot, quantity, note, lineTotalVnd: unitPriceVndSnapshot * quantity }))
    return { id: order.id, sequenceNo: order.sequenceNo, status: order.status, createdAt: order.createdAt, note: order.note, totalVnd: items.reduce((sum, item) => sum + item.lineTotalVnd, 0), items }
  }
}
