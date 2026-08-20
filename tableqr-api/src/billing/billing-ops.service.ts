import { HttpException, Injectable } from '@nestjs/common'
import { GRACE_DAYS } from '@kimthanh-tableqr/contracts'
import { PrismaService } from '../prisma.service'
import { EntitlementService } from './entitlement.service'
import { manualPaymentEvent, PaymentService, type ManualReconciliationInput, type PaymentOutcome } from './payment.service'

/**
 * Việc hỗ trợ vận hành billing (`SA-12`). KHÔNG có controller: chỉ ops CLI gọi,
 * và CLI chỉ chạy được bằng kết nối DB của người vận hành. Mọi can thiệp đều
 * ghi `subscription_event` kèm `actor` + `note` để đối soát về sau.
 *
 * Các lệnh đọc chéo quán (`attention`, `find`) không đặt tenant context nên chỉ
 * trả dữ liệu khi kết nối không phải role `tableqr_app` của API đang phục vụ.
 */
@Injectable()
export class BillingOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
    private readonly entitlement: EntitlementService,
  ) {}

  /** Tên role đang dùng — CLI in ra để người vận hành biết mình nối bằng gì. */
  async connectionRole(): Promise<string> {
    const [row] = await this.prisma.$queryRaw<Array<{ role: string }>>`SELECT current_user AS role`
    return row?.role ?? 'unknown'
  }

  /** Tìm quán theo id, slug công khai, mã đăng nhập nhân viên hoặc email owner. */
  async findRestaurant(query: string): Promise<{ id: string; name: string; publicSlug: string } | null> {
    const byOwner = await this.prisma.authUser.findFirst({
      where: { email: query, role: 'OWNER' },
      select: { restaurant: { select: { id: true, name: true, publicSlug: true } } },
    })
    if (byOwner) return byOwner.restaurant
    return this.prisma.restaurant.findFirst({
      where: { OR: [{ publicSlug: query }, { staffLoginCode: query }, ...(/^[0-9a-f-]{36}$/i.test(query) ? [{ id: query }] : [])] },
      select: { id: true, name: true, publicSlug: true },
    })
  }

  /** Bảng theo dõi: quán đang cần hỗ trợ, tiền chờ vào hoặc webhook xử lý dở. */
  async attention(now = new Date()) {
    const stalePaymentBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const [subscriptions, stalePayments, unprocessedWebhooks] = await Promise.all([
      this.prisma.subscription.findMany({
        where: { status: { in: ['GRACE', 'PAST_DUE', 'SUSPENDED'] } },
        select: { restaurantId: true, status: true, graceEndsAt: true, cancelAtPeriodEnd: true, restaurant: { select: { name: true } } },
        orderBy: { graceEndsAt: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { status: 'PENDING', createdAt: { lt: stalePaymentBefore } },
        select: { paymentCode: true, provider: true, amountVnd: true, createdAt: true, restaurant: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      this.prisma.paymentWebhookEvent.findMany({
        where: { processedAt: null },
        select: { provider: true, providerEventId: true, receivedAt: true, restaurant: { select: { id: true, name: true } } },
        orderBy: { receivedAt: 'asc' },
        take: 50,
      }),
    ])
    return { subscriptions, stalePayments, unprocessedWebhooks }
  }

  /** Hồ sơ một quán: đủ để trả lời "tiền vào chưa, vì sao vẫn đóng". */
  async snapshot(restaurantId: string) {
    await this.entitlement.status(restaurantId)
    return this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({
        where: { restaurantId },
        include: {
          plan: { select: { code: true, name: true } },
          cycles: {
            select: { sequenceNo: true, status: true, amountVnd: true, periodStartsAt: true, periodEndsAt: true, paidAt: true, payments: { select: { paymentCode: true, provider: true, status: true, amountVnd: true, paidAt: true } } },
            orderBy: { sequenceNo: 'desc' },
            take: 6,
          },
          events: { select: { type: true, dunningDay: true, occurredAt: true, actor: true, note: true }, orderBy: { occurredAt: 'desc' }, take: 15 },
        },
      })
      const webhooks = await tx.paymentWebhookEvent.findMany({
        where: { restaurantId },
        select: { provider: true, providerEventId: true, receivedAt: true, processedAt: true },
        orderBy: { receivedAt: 'desc' },
        take: 10,
      })
      return { subscription, webhooks }
    })
  }

  /**
   * Tiền đã vào tài khoản nhưng webhook không tới. Đi đúng đường settle của
   * webhook: sai số tiền hoặc trùng tham chiếu đều không đổi state.
   */
  async reconcile(input: ManualReconciliationInput): Promise<PaymentOutcome> {
    const outcome = await this.payments.processWebhook(manualPaymentEvent(input))
    if (outcome.settled) {
      await this.recordOpsEvent(input.paymentCode, 'MANUAL_RECONCILED', input.operator, `ref=${input.reference}${input.note ? ` · ${input.note}` : ''}`)
    }
    return outcome
  }

  /**
   * Chạy lại một webhook đã lưu. Sự kiện đã xử lý xong là no-op; sự kiện dở
   * dang (`processed_at` rỗng) được settle nốt.
   */
  async replay(provider: string, providerEventId: string): Promise<PaymentOutcome> {
    const stored = await this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_providerEventId: { provider, providerEventId } },
      select: { payload: true },
    })
    if (!stored) throw new HttpException({ error: { code: 'NOT_FOUND', message: `Không tìm thấy webhook ${provider}/${providerEventId}.`, details: null } }, 404)
    return this.payments.processWebhook(this.payments.replayableEvent(provider, stored.payload as Record<string, unknown>))
  }

  /** Tạm ngưng theo yêu cầu hỗ trợ. Thanh toán sau đó không tự mở lại. */
  async suspend(restaurantId: string, operator: string, reason: string): Promise<{ status: string }> {
    await this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { restaurantId }, select: { id: true } })
      await tx.subscription.update({ where: { id: subscription.id }, data: { status: 'SUSPENDED' } })
      await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: 'SUSPENDED' } })
      await tx.subscriptionEvent.create({ data: { restaurantId, subscriptionId: subscription.id, type: 'SUSPENDED', occurredAt: new Date(), actor: operator, note: reason } })
    })
    return { status: 'SUSPENDED' }
  }

  /**
   * Mở lại quán bị tạm ngưng. Trả về grace 7 ngày để chủ quán kịp thanh toán;
   * nếu đã có kỳ trả trước phủ hiện tại thì `EntitlementService` nâng lên
   * `ACTIVE` ngay trong lần tính trạng thái kế tiếp.
   */
  async unsuspend(restaurantId: string, operator: string, reason: string): Promise<{ status: string }> {
    await this.prisma.withTenant(restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { restaurantId }, select: { id: true, status: true } })
      if (subscription.status !== 'SUSPENDED') throw new HttpException({ error: { code: 'CONFLICT', message: 'Quán không ở trạng thái tạm ngưng.', details: null } }, 409)
      const graceEndsAt = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000)
      await tx.subscription.update({ where: { id: subscription.id }, data: { status: 'GRACE', graceEndsAt } })
      await tx.restaurant.update({ where: { id: restaurantId }, data: { billingStatus: 'GRACE' } })
      await tx.subscriptionEvent.create({ data: { restaurantId, subscriptionId: subscription.id, type: 'UNSUSPENDED', occurredAt: new Date(), actor: operator, note: reason } })
    })
    return { status: await this.entitlement.status(restaurantId) }
  }

  private async recordOpsEvent(paymentCode: string, type: 'MANUAL_RECONCILED', actor: string, note: string): Promise<void> {
    const payment = await this.prisma.withPaymentCode(paymentCode, (tx) =>
      tx.payment.findUnique({ where: { paymentCode }, select: { restaurantId: true } }),
    )
    if (!payment) return
    await this.prisma.withTenant(payment.restaurantId, async (tx) => {
      const subscription = await tx.subscription.findUniqueOrThrow({ where: { restaurantId: payment.restaurantId }, select: { id: true } })
      await tx.subscriptionEvent.create({ data: { restaurantId: payment.restaurantId, subscriptionId: subscription.id, type, occurredAt: new Date(), actor, note } })
    })
  }
}
