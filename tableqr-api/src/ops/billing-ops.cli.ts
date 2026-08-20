/**
 * CLI hỗ trợ vận hành billing (`SA-12`).
 *
 * Chạy bằng kết nối DB của người vận hành, KHÔNG chạy trong tiến trình API đang
 * phục vụ — role `tableqr_app` bị RLS chặn mọi truy vấn chéo quán:
 *
 *   docker compose run --rm --no-deps \
 *     -e DATABASE_URL=postgresql://tableqr:tableqr@db:5432/tableqr?schema=public \
 *     api node dist/ops/billing-ops.cli.js attention
 *
 * Runbook đầy đủ: ai-docs/11-billing-operations.md
 */
import { NestFactory } from '@nestjs/core'
import { HttpException } from '@nestjs/common'
import { AppModule } from '../app.module'
import { BillingOpsService } from '../billing/billing-ops.service'

type Args = Record<string, string | true>

const USAGE = `Lệnh vận hành billing:

  attention                                     Quán cần chú ý, tiền chờ vào, webhook xử lý dở
  find      --query <email|slug|mã NV|uuid>     Tìm quán
  status    --restaurant <query>                Hồ sơ billing một quán
  reconcile --payment-code <mã> --amount <vnd> --reference <mã GD ngân hàng> --operator <tên> [--note <ghi chú>]
                                                Ghi nhận tiền đã vào khi webhook không tới
  replay    --provider <tên> --event-id <id>    Chạy lại webhook đã lưu
  suspend   --restaurant <query> --operator <tên> --reason <lý do>
  unsuspend --restaurant <query> --operator <tên> --reason <lý do>

Thêm --json để in JSON cho script.`

function parseArgs(argv: string[]): { command: string; args: Args } {
  const [command = '', ...rest] = argv
  const args: Args = {}
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = rest[index + 1]
    if (next && !next.startsWith('--')) { args[key] = next; index += 1 } else args[key] = true
  }
  return { command, args }
}

function requireArg(args: Args, name: string): string {
  const value = args[name]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Thiếu tham số --${name}.`)
  return value.trim()
}

const OUTCOME_COPY: Record<string, string> = {
  settled: 'Đã ghi nhận tiền và kích hoạt kỳ tương ứng.',
  duplicate: 'Sự kiện đã xử lý trước đó — không thay đổi gì (đúng như mong đợi).',
  unknown_payment: 'Không tìm thấy mã thanh toán. Kiểm tra lại nội dung chuyển khoản.',
  not_incoming: 'Giao dịch không phải tiền vào — bỏ qua.',
  amount_mismatch: 'Số tiền không khớp kỳ thanh toán. Cần đối chiếu tay trước khi ghi nhận.',
  already_finalized: 'Thanh toán đã chốt trước đó — không ghi thêm lần nào.',
}

async function main(): Promise<number> {
  const { command, args } = parseArgs(process.argv.slice(2))
  const json = args.json === true
  if (!command || command === 'help' || args.help === true) { process.stdout.write(`${USAGE}\n`); return 0 }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: json ? false : ['error', 'warn'] })
  const print = (payload: unknown, text: string) => process.stdout.write(json ? `${JSON.stringify(payload)}\n` : `${text}\n`)

  try {
    const ops = app.get(BillingOpsService)
    const role = await ops.connectionRole()
    if (role === 'tableqr_app') {
      throw new Error('Đang nối bằng role runtime `tableqr_app`; RLS sẽ giấu hết dữ liệu. Chạy lại với DATABASE_URL của người vận hành.')
    }

    const resolveRestaurant = async (query: string) => {
      const found = await ops.findRestaurant(query)
      if (!found) throw new Error(`Không tìm thấy quán khớp "${query}".`)
      return found
    }

    switch (command) {
      case 'attention': {
        const report = await ops.attention()
        print(report, [
          `Quán cần chú ý (${report.subscriptions.length}):`,
          ...report.subscriptions.map((row) => `  ${row.status.padEnd(9)} ${row.restaurant.name} · hết gia hạn ${row.graceEndsAt?.toISOString() ?? '—'}${row.cancelAtPeriodEnd ? ' · đã yêu cầu ngừng gia hạn' : ''}`),
          `Thanh toán chờ quá 24 giờ (${report.stalePayments.length}):`,
          ...report.stalePayments.map((row) => `  ${row.paymentCode} · ${row.provider} · ${row.amountVnd} · ${row.restaurant.name} · tạo ${row.createdAt.toISOString()}`),
          `Webhook chưa xử lý xong (${report.unprocessedWebhooks.length}):`,
          ...report.unprocessedWebhooks.map((row) => `  ${row.provider}/${row.providerEventId} · ${row.restaurant.name} · nhận ${row.receivedAt.toISOString()}`),
        ].join('\n'))
        return 0
      }
      case 'find': {
        const found = await resolveRestaurant(requireArg(args, 'query'))
        print(found, `${found.id}  ${found.name}  (${found.publicSlug})`)
        return 0
      }
      case 'status': {
        const restaurant = await resolveRestaurant(requireArg(args, 'restaurant'))
        const snapshot = await ops.snapshot(restaurant.id)
        const { subscription, webhooks } = snapshot
        print({ restaurant, ...snapshot }, [
          `${restaurant.name} (${restaurant.id})`,
          `  Gói ${subscription.plan.code} · trạng thái ${subscription.status}${subscription.cancelAtPeriodEnd ? ' · đã yêu cầu ngừng gia hạn' : ''}`,
          `  Dùng thử đến ${subscription.trialEndsAt.toISOString()} · kỳ đến ${subscription.currentPeriodEndsAt?.toISOString() ?? '—'} · gia hạn đến ${subscription.graceEndsAt?.toISOString() ?? '—'}`,
          `  Kỳ gần nhất (${subscription.cycles.length}):`,
          ...subscription.cycles.map((cycle) => `    #${cycle.sequenceNo} ${cycle.status} ${cycle.amountVnd} ${cycle.periodStartsAt.toISOString()} → ${cycle.periodEndsAt.toISOString()}${cycle.payments.map((payment) => `\n      ${payment.paymentCode} ${payment.provider} ${payment.status}`).join('')}`),
          `  Webhook gần nhất (${webhooks.length}):`,
          ...webhooks.map((event) => `    ${event.provider}/${event.providerEventId} nhận ${event.receivedAt.toISOString()} ${event.processedAt ? 'đã xử lý' : 'CHƯA XỬ LÝ'}`),
          `  Audit (${subscription.events.length}):`,
          ...subscription.events.map((event) => `    ${event.occurredAt.toISOString()} ${event.type}${event.dunningDay ? ` ngày ${event.dunningDay}` : ''}${event.actor ? ` · ${event.actor}` : ''}${event.note ? ` · ${event.note}` : ''}`),
        ].join('\n'))
        return 0
      }
      case 'reconcile': {
        const amount = Number(requireArg(args, 'amount'))
        if (!Number.isInteger(amount) || amount < 1) throw new Error('--amount phải là số nguyên VND dương.')
        const outcome = await ops.reconcile({
          paymentCode: requireArg(args, 'payment-code'),
          amountVnd: amount,
          reference: requireArg(args, 'reference'),
          operator: requireArg(args, 'operator'),
          note: typeof args.note === 'string' ? args.note : null,
        })
        print(outcome, `${outcome.settled ? '✓' : '•'} ${OUTCOME_COPY[outcome.reason] ?? outcome.reason}`)
        return 0
      }
      case 'replay': {
        const outcome = await ops.replay(requireArg(args, 'provider'), requireArg(args, 'event-id'))
        print(outcome, `${outcome.settled ? '✓' : '•'} ${OUTCOME_COPY[outcome.reason] ?? outcome.reason}`)
        return 0
      }
      case 'suspend':
      case 'unsuspend': {
        const restaurant = await resolveRestaurant(requireArg(args, 'restaurant'))
        const operator = requireArg(args, 'operator')
        const reason = requireArg(args, 'reason')
        const result = command === 'suspend'
          ? await ops.suspend(restaurant.id, operator, reason)
          : await ops.unsuspend(restaurant.id, operator, reason)
        print({ restaurant, ...result }, `✓ ${restaurant.name}: trạng thái hiện tại ${result.status}`)
        return 0
      }
      default:
        process.stderr.write(`Lệnh không hợp lệ: ${command}\n\n${USAGE}\n`)
        return 1
    }
  } finally {
    await app.close()
  }
}

/** Lỗi nghiệp vụ ném ra dạng `ApiErrorBody`; đọc đúng chuỗi tiếng Việt bên trong. */
function describe(error: unknown): string {
  if (error instanceof HttpException) {
    const body = error.getResponse() as { error?: { message?: string } }
    return body?.error?.message ?? error.message
  }
  return error instanceof Error ? error.message : String(error)
}

main()
  .then((code) => { process.exitCode = code })
  .catch((error: unknown) => {
    process.stderr.write(`✗ ${describe(error)}\n`)
    process.exitCode = 1
  })
