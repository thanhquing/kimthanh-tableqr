import { HttpException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import { calcOrderTotalFromContracts, calcSessionTotalFromContracts } from '../common/totals'

const fail = (status: number, code: string, message: string): never => { throw new HttpException({ error: { code, message, details: null } }, status) }
const validStatuses = ['NEW', 'PREPARING', 'SERVED', 'CANCELLED'] as const
const allowed: Record<string, readonly string[]> = { NEW: ['PREPARING', 'CANCELLED'], PREPARING: ['SERVED', 'CANCELLED'], SERVED: [], CANCELLED: [] }

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}
  async orders(status?: string, since?: string) {
    const sinceAt = since ? new Date(since) : undefined
    const orders = await this.prisma.order.findMany({ where: { ...(validStatuses.includes(status as never) ? { status: status as never } : {}), ...(sinceAt && !Number.isNaN(sinceAt.valueOf()) ? { createdAt: { gte: sinceAt } } : { session: { status: 'OPEN' } }) }, include: { table: true, items: true }, orderBy: { createdAt: 'asc' }, take: 100 })
    return { serverTime: new Date(), orders: await Promise.all(orders.map((order) => this.orderDto(order, true))) }
  }
  async updateOrder(id: string, status: unknown) {
    if (!validStatuses.includes(status as never)) fail(400, 'VALIDATION_ERROR', 'Trạng thái đơn không hợp lệ.')
    const order = await this.prisma.order.findUnique({ where: { id }, include: { table: true, items: true } })
    if (!order) fail(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn.')
    if (!allowed[order!.status].includes(status as string)) fail(409, 'INVALID_TRANSITION', 'Không thể chuyển trạng thái đơn theo hướng này.')
    return this.orderDto(await this.prisma.order.update({ where: { id }, data: { status: status as never }, include: { table: true, items: true } }), true)
  }
  async tables() {
    const [tables, sessions] = await Promise.all([
      this.prisma.diningTable.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.tableSession.findMany({ where: { status: 'OPEN' } }),
    ])
    const orders = await this.prisma.order.findMany({ where: { sessionId: { in: sessions.map((session) => session.id) }, status: { not: 'CANCELLED' } }, include: { items: true } })
    return { tables: await Promise.all(tables.map(async (table) => { const session = sessions.find((candidate) => candidate.tableId === table.id); const sessionOrders = session ? orders.filter((order) => order.sessionId === session.id) : []; return { id: table.id, code: table.code, displayName: table.displayName, status: session ? 'OCCUPIED' : 'EMPTY', sortOrder: table.sortOrder, session: session ? { id: session.id, openedAt: session.openedAt, totalVnd: await calcSessionTotalFromContracts(sessionOrders.map((order) => ({ status: order.status, items: order.items }))), orderCount: sessionOrders.length, paidAt: session.paidAt } : null } })) }
  }
  async session(id: string) { const session = await this.prisma.tableSession.findUnique({ where: { id }, include: { table: true, orders: { include: { items: true }, orderBy: { sequenceNo: 'asc' } } } }); if (!session) fail(404, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên bàn.'); const orders = await Promise.all(session!.orders.map((order) => this.orderDto(order))); return { table: session!.table, session: { id: session!.id, status: session!.status, totalVnd: await calcSessionTotalFromContracts(session!.orders.map((order) => ({ status: order.status, items: order.items }))), paidAt: session!.paidAt }, orders } }
  async pay(id: string) { const session = await this.prisma.tableSession.findUnique({ where: { id } }); if (!session) fail(404, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên bàn.'); const paidAt = session!.paidAt ?? new Date(); return this.prisma.tableSession.update({ where: { id }, data: { paidAt }, select: { id: true, paidAt: true } }) }
  async close(id: string) { const session = await this.prisma.tableSession.findUnique({ where: { id } }); if (!session) fail(404, 'SESSION_NOT_FOUND', 'Không tìm thấy phiên bàn.'); const closedAt = session!.closedAt ?? new Date(); return this.prisma.tableSession.update({ where: { id }, data: { status: 'CLOSED', closedAt }, select: { id: true, status: true, closedAt: true } }) }
  async calls(status?: string) { const calls = await this.prisma.staffCall.findMany({ where: { ...(status === 'PENDING' || status === 'DONE' ? { status } : {}), session: { status: 'OPEN' } }, include: { table: true }, orderBy: { createdAt: 'desc' } }); return { calls: calls.map((call) => ({ id: call.id, type: call.type, status: call.status, createdAt: call.createdAt, table: { code: call.table.code, displayName: call.table.displayName } })) } }
  async updateCall(id: string, status: unknown) { if (status !== 'DONE') fail(400, 'VALIDATION_ERROR', 'Chỉ có thể đánh dấu yêu cầu đã xử lý.'); const call = await this.prisma.staffCall.findUnique({ where: { id } }); if (!call) fail(404, 'CALL_NOT_FOUND', 'Không tìm thấy yêu cầu.'); return this.prisma.staffCall.update({ where: { id }, data: { status: 'DONE' }, select: { id: true, type: true, status: true, createdAt: true } }) }
  private async orderDto(order: { id: string; sessionId: string; sequenceNo: number; status: string; createdAt: Date; note: string | null; items: Array<{ nameSnapshot: string; quantity: number; note: string | null; unitPriceVndSnapshot: number }>; table?: { id: string; code: string; displayName: string } }, withTable = false) { const items = order.items.map((item) => ({ ...item, lineTotalVnd: item.unitPriceVndSnapshot * item.quantity })); return { id: order.id, sequenceNo: order.sequenceNo, status: order.status, createdAt: order.createdAt, note: order.note, totalVnd: await calcOrderTotalFromContracts(order.items), ...(withTable && order.table ? { table: order.table, sessionId: order.sessionId } : {}), items } }
}
