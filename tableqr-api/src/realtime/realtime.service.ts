import { Injectable, type MessageEvent } from '@nestjs/common'
import type { StaffCallWithTableDto, StaffOrderDto, StaffStreamEvent } from '@kimthanh-tableqr/contracts'
import { Subject, type Observable, filter, map } from 'rxjs'
import { calcOrderTotalFromContracts } from '../common/totals'
import { PrismaService } from '../prisma.service'

@Injectable()
export class RealtimeService {
  private readonly events = new Subject<{ restaurantId: string; event: StaffStreamEvent }>()

  constructor(private readonly prisma: PrismaService) {}

  stream(restaurantId: string): Observable<MessageEvent> {
    return this.events.pipe(filter((entry) => entry.restaurantId === restaurantId), map((entry) => ({ type: entry.event.type, data: entry.event.data })))
  }

  async publishOrderCreated(restaurantId: string, orderId: string): Promise<void> {
    const { dto } = await this.order(restaurantId, orderId)
    this.events.next({ restaurantId, event: { type: 'order.created', data: dto } })
  }

  async publishOrderStatusChanged(restaurantId: string, orderId: string): Promise<void> {
    const { dto } = await this.order(restaurantId, orderId)
    this.events.next({ restaurantId, event: { type: 'order.status_changed', data: dto } })
  }

  async publishCallCreated(restaurantId: string, callId: string): Promise<void> {
    const call = await this.prisma.withTenant(restaurantId, (tx) => tx.staffCall.findUniqueOrThrow({ where: { id: callId }, include: { table: true } }))
    const data: StaffCallWithTableDto = {
      id: call.id,
      type: call.type,
      status: call.status,
      createdAt: call.createdAt.toISOString(),
      table: { id: call.table.id, code: call.table.code, displayName: call.table.displayName },
    }
    this.events.next({ restaurantId: call.restaurantId, event: { type: 'call.created', data } })
  }

  publishSessionClosed(restaurantId: string, sessionId: string, tableId: string): void {
    this.events.next({ restaurantId, event: { type: 'session.closed', data: { sessionId, tableId } } })
  }

  private async order(restaurantId: string, orderId: string): Promise<{ dto: StaffOrderDto }> {
    const order = await this.prisma.withTenant(restaurantId, (tx) => tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { table: true, items: true } }))
    const items = order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      nameSnapshot: item.nameSnapshot,
      unitPriceVndSnapshot: item.unitPriceVndSnapshot,
      quantity: item.quantity,
      note: item.note,
      lineTotalVnd: item.unitPriceVndSnapshot * item.quantity,
    }))
    return { dto: {
      id: order.id,
      sessionId: order.sessionId,
      sequenceNo: order.sequenceNo,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      note: order.note,
      totalVnd: await calcOrderTotalFromContracts(order.items),
      table: { id: order.table.id, code: order.table.code, displayName: order.table.displayName },
      items,
    } }
  }
}
