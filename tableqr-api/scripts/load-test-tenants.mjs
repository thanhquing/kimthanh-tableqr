// Test tai nhieu tenant (`SA-12`): do do tre va chung minh khong ro ri du lieu
// cheo quán khi nhieu khach cua nhieu quán goi mon cung luc.
//
// Chay qua wrapper: bash tableqr-api/scripts/load-test-tenants.sh
// Hoac truc tiep:
//   node tableqr-api/scripts/load-test-tenants.mjs \
//     --base http://localhost:3000/api/v1 --users 30 --iterations 5 \
//     --tenants '[{"name":"Quán A","qrTokens":["..."],"write":true}]'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 1) {
  const token = process.argv[index]
  if (!token.startsWith('--')) continue
  const next = process.argv[index + 1]
  args.set(token.slice(2), next && !next.startsWith('--') ? (index += 1, next) : 'true')
}

const base = (args.get('base') ?? 'http://localhost:3000/api/v1').replace(/\/$/, '')
// Mac dinh giu tong request duoi tran throttle toan cuc 100 req/phut moi IP.
const users = Number(args.get('users') ?? 20)
const iterations = Number(args.get('iterations') ?? 2)
const tenants = JSON.parse(args.get('tenants') ?? '[]')
// Ngan sach do tre: doc menu la duong nong nhat, bi poll lien tuc.
const p95Budget = { bootstrap: Number(args.get('budget-bootstrap') ?? 400), order: Number(args.get('budget-order') ?? 800), orders: Number(args.get('budget-orders') ?? 400) }

if (!tenants.length) { console.error('Thiếu --tenants.'); process.exit(1) }

const samples = { bootstrap: [], order: [], orders: [] }
const failures = []
// 429 la chan co chu dich, khong phai loi he thong — dem rieng de doc dung ket qua.
let throttled = 0

async function timed(op, run) {
  const startedAt = performance.now()
  try {
    return await run()
  } finally {
    samples[op].push(performance.now() - startedAt)
  }
}

async function json(response, context) {
  const body = await response.text()
  if (!response.ok) throw Object.assign(new Error(`${context}: HTTP ${response.status} ${body.slice(0, 160)}`), { status: response.status })
  return JSON.parse(body)
}

/** Bo item id cua tung quán — moi phan hoi phai nam gon trong bo cua chinh no. */
async function tenantFingerprint(tenant) {
  const bootstrap = await json(await fetch(`${base}/guest/tables/${tenant.qrTokens[0]}`), `bootstrap ${tenant.name}`)
  return { ...tenant, itemIds: new Set(bootstrap.items.map((item) => item.id)), restaurantName: bootstrap.restaurant.name }
}

async function virtualUser(tenant, index) {
  // Mot khach = mot ban that: don ca chuc dien thoai vao cung mot ma QR se cham
  // rate limit theo ban, do la hanh vi dung chu khong phai loi tai.
  const qrToken = tenant.qrTokens[index % tenant.qrTokens.length]
  for (let round = 0; round < iterations; round += 1) {
    try {
      const bootstrap = await timed('bootstrap', async () => json(await fetch(`${base}/guest/tables/${qrToken}`), `bootstrap ${tenant.name}`))
      if (bootstrap.restaurant.name !== tenant.restaurantName) {
        failures.push(`Rò rỉ tenant: ${tenant.name} nhận dữ liệu của ${bootstrap.restaurant.name}`)
        return
      }
      const foreign = bootstrap.items.filter((item) => !tenant.itemIds.has(item.id))
      if (foreign.length) { failures.push(`Rò rỉ món sang ${tenant.name}: ${foreign.slice(0, 3).map((item) => item.id).join(', ')}`); return }

      const headers = { 'X-Guest-Access': bootstrap.guestAccessToken }
      if (tenant.write) {
        await timed('order', async () => json(await fetch(`${base}/guest/sessions/${bootstrap.session.id}/orders`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json', 'X-Request-Id': `load-${index}-${round}-${Math.random().toString(36).slice(2)}` },
          body: JSON.stringify({ items: [{ menuItemId: bootstrap.items[round % bootstrap.items.length].id, quantity: 1 }] }),
        }), `order ${tenant.name}`))
      }

      const orders = await timed('orders', async () => json(await fetch(`${base}/guest/sessions/${bootstrap.session.id}/orders`, { headers }), `orders ${tenant.name}`))
      const leaked = orders.orders.flatMap((order) => order.items).filter((item) => !tenant.itemIds.has(item.menuItemId))
      if (leaked.length) failures.push(`Đơn của ${tenant.name} chứa món lạ: ${leaked.slice(0, 3).map((item) => item.menuItemId).join(', ')}`)
    } catch (error) {
      if (error?.status === 429) { throttled += 1; continue }
      failures.push(error instanceof Error ? error.message : String(error))
      return
    }
  }
}

function percentile(values, ratio) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.min(sorted.length - 1, Math.ceil(ratio * sorted.length) - 1)]
}

const prepared = await Promise.all(tenants.map(tenantFingerprint))
console.log(`Tải ${users} khách × ${iterations} vòng trên ${prepared.length} quán: ${prepared.map((tenant) => `${tenant.restaurantName}${tenant.write ? ' (ghi)' : ''}`).join(', ')}`)

const startedAt = performance.now()
await Promise.all(Array.from({ length: users }, (_, index) => virtualUser(prepared[index % prepared.length], index)))
const elapsedMs = performance.now() - startedAt

const rows = Object.entries(samples).filter(([, values]) => values.length)
console.log(`\nTổng ${rows.reduce((sum, [, values]) => sum + values.length, 0)} request trong ${(elapsedMs / 1000).toFixed(1)}s${throttled ? ` · ${throttled} request bị chặn 429` : ''}\n`)
console.log('thao tác        n     p50      p95      max      ngân sách p95')
let overBudget = false
for (const [op, values] of rows) {
  const p95 = percentile(values, 0.95)
  const over = p95 > p95Budget[op]
  overBudget ||= over
  console.log(`${op.padEnd(14)} ${String(values.length).padEnd(5)} ${percentile(values, 0.5).toFixed(0).padStart(5)}ms ${p95.toFixed(0).padStart(6)}ms ${Math.max(...values).toFixed(0).padStart(6)}ms ${String(p95Budget[op]).padStart(9)}ms ${over ? '✗ vượt' : '✓'}`)
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} lỗi/rò rỉ:`)
  for (const failure of [...new Set(failures)].slice(0, 10)) console.error(`  ${failure}`)
  process.exit(1)
}
if (throttled) console.log(`\n! ${throttled} request chạm trần throttle 100 req/phút mỗi IP. Đó là chặn có chủ đích, không phải lỗi — nhưng xem ai-tasks/04-open-questions.md Q13 về rủi ro khi cả quán chung một IP.`)
console.log(`\n✓ Không có lỗi và không có dữ liệu chéo quán.${overBudget ? ' Nhưng độ trễ vượt ngân sách.' : ''}`)
process.exit(overBudget ? 1 : 0)
