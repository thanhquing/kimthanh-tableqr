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

  async publishOrderCreated(orderId: string): Promise<void> {
    const { restaurantId, dto } = await this.order(orderId)
    this.events.next({ restaurantId, event: { type: 'order.created', data: dto } })
  }

  async publishOrderStatusChanged(orderId: string): Promise<void> {
    const { restaurantId, dto } = await this.order(orderId)
    this.events.next({ restaurantId, event: { type: 'order.status_changed', data: dto } })
  }

  async publishCallCreated(callId: string): Promise<void> {
    const call = await this.prisma.staffCall.findUniqueOrThrow({ where: { id: callId }, include: { table: true } })
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

  private async order(orderId: string): Promise<{ restaurantId: string; dto: StaffOrderDto }> {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { table: true, items: true } })
    const items = order.items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      nameSnapshot: item.nameSnapshot,
      unitPriceVndSnapshot: item.unitPriceVndSnapshot,
      quantity: item.quantity,
      note: item.note,
      lineTotalVnd: item.unitPriceVndSnapshot * item.quantity,
    }))
    return { restaurantId: order.restaurantId, dto: {
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
