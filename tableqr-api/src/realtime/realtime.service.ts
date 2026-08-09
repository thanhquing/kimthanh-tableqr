import { Injectable, type MessageEvent } from '@nestjs/common'
import type { StaffCallWithTableDto, StaffOrderDto, StaffStreamEvent } from '@kimthanh-tableqr/contracts'
import { Subject, type Observable, map } from 'rxjs'
import { calcOrderTotalFromContracts } from '../common/totals'
import { PrismaService } from '../prisma.service'

@Injectable()
export class RealtimeService {
  private readonly events = new Subject<StaffStreamEvent>()

  constructor(private readonly prisma: PrismaService) {}

  stream(): Observable<MessageEvent> {
    return this.events.pipe(map((event) => ({ type: event.type, data: event.data })))
  }

  async publishOrderCreated(orderId: string): Promise<void> {
    this.events.next({ type: 'order.created', data: await this.order(orderId) })
  }

  async publishOrderStatusChanged(orderId: string): Promise<void> {
    this.events.next({ type: 'order.status_changed', data: await this.order(orderId) })
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
    this.events.next({ type: 'call.created', data })
  }

  publishSessionClosed(sessionId: string, tableId: string): void {
    this.events.next({ type: 'session.closed', data: { sessionId, tableId } })
  }

  private async order(orderId: string): Promise<StaffOrderDto> {
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
    return {
      id: order.id,
      sessionId: order.sessionId,
      sequenceNo: order.sequenceNo,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      note: order.note,
      totalVnd: await calcOrderTotalFromContracts(order.items),
      table: { id: order.table.id, code: order.table.code, displayName: order.table.displayName },
      items,
    }
  }
}
