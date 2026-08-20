# 10 — Cách kiểm tra

Điều kiện nghiệm thu nghiệp vụ ở [`../ai-docs/07-acceptance-criteria.md`](../ai-docs/07-acceptance-criteria.md). File này là **lệnh cụ thể phải gõ**.

## Chuẩn bị

```bash
cd "kimthanh-tableqr"
nvm use 22          # BAT BUOC — shell mac dinh dang o Node 16, pnpm khong chay duoc
pnpm install
```

---

## M0 — Khung workspace

```bash
pnpm install                       # resolve sach, khong loi peer
node -e "require('fs').readdirSync('ai-docs').length === 9 || process.exit(1)"
node -e "require('fs').readdirSync('ai-tasks').length === 13 || process.exit(1)"
```

Kiểm tay: `CLAUDE.md` trỏ đúng file; mọi link trong `ai-docs/00-index.md` và `ai-tasks/00-index.md` mở được.

## M1 — Package dùng chung

```bash
pnpm --filter @kimthanh-tableqr/contracts build
pnpm --filter @kimthanh-tableqr/contracts test
pnpm --filter @kimthanh-tableqr/mock build
pnpm --filter @kimthanh-tableqr/ui build
```

**Cổng M1 → M2 (bắt buộc, làm tay):** mở bảng 29 dòng ở cuối `ai-docs/04-api-contract.md`, đối chiếu dòng 1–28 với `packages/mock/src/handlers.ts`; dòng 29 (`GET /staff/stream`) phải để M7 đúng contract. Thiếu handler M1 nào thì làm nốt **trước khi** sang M2 — mọi màn hình sau đó xây trên nền này.

Kiểm fixture: ≥ 4 danh mục, ≥ 20 món, ≥ 8 bàn, có sẵn 1 phiên đang mở với 2 đơn.

## M2 — App khách

```bash
pnpm dev:guest      # http://localhost:5173/t/<qrToken cua ban 1, ghi o dau fixtures.ts>
```

Đi kịch bản **A1, A2, A3, A4** của `ai-docs/07`. Thêm:

- DevTools → iPhone SE (375×667): không tràn ngang; mọi nút chạm được bằng ngón cái
- Network **Slow 4G** + CPU **4× slowdown**: menu hiện < 3s
- Bật Lighthouse trên production build (`pnpm --filter tableqr-guest build && pnpm --filter tableqr-guest preview`) → FCP < 1.8s, LCP < 2.5s, **CLS < 0.1**
- Bấm Gửi đơn hai lần thật nhanh → **chỉ tạo một đơn**

## M3 — App bếp

```bash
pnpm dev:staff      # http://localhost:5174
```

Đi kịch bản **A5, A6**. Thêm:

- Dùng nút dev "Giả lập đơn mới" → đơn hiện trong ≤ 3s (1 chu kỳ polling), có highlight + chuông
- Đơn sắp xếp **cũ nhất trước**
- Đơn `NEW` để quá 10 phút → đồng hồ chuyển đỏ
- Huỷ một đơn → tổng bill của phiên **giảm đúng bằng** giá trị đơn đó
- Tablet ngang 1024px đọc được từ 80cm; điện thoại 375px vẫn dùng được
- Đóng tab 5 phút rồi mở lại: vẫn đăng nhập

## M4 — App admin

```bash
pnpm dev:admin      # http://localhost:5175
```

Đi kịch bản **A7, A8**. Thêm:

- `/tables/print` → **Print Preview thật** (Cmd+P): đúng 12 ô mỗi trang A4, không dính chữ khi cắt
- Quét mã QR trong modal bằng **camera điện thoại thật** → ra đúng URL guest
- Sửa tên bàn → mở lại modal QR → `qrToken` **không đổi**
- Đổi giá một món đang nằm trong phiên mở → mở lại chi tiết phiên ở app bếp → **tổng bill không đổi**

## M5 — Cổng trước khi làm backend

```bash
pnpm lint && pnpm test && pnpm build
```

Cả ba phải sạch, không warning. Thêm:

- Bundle initial `tableqr-guest` **< 150 KB gzip** — kiểm bằng lệnh dưới
- Đi hết checklist mục **C** và **D** của `ai-docs/07`
- Grep tìm sót: `grep -rn "console.log\|toLocaleString\|: any" --include=*.ts --include=*.tsx tableqr-* packages/*/src`

```bash
pnpm --filter tableqr-guest build
gzip -c tableqr-guest/dist/assets/index-*.js | wc -c    # phai < 153600
```

**Chỉ khi tất cả đạt mới mở khoá `BE-*`.**

## M6 — Backend

```bash
cd tableqr-api && docker compose up -d db api
curl -fsS localhost:3000/api/v1/readyz
cd ..
pnpm --filter tableqr-api lint
pnpm --filter tableqr-api typecheck
bash tableqr-api/scripts/verify-flow-01-guest-order.sh
```

Mọi script `verify-flow-*.sh` phải pass. Đối chiếu lại bảng 29 endpoint — lần này với API thật.

## M7 — Thiết bị thật

1. `VITE_USE_MOCK=false`, trỏ `VITE_API_BASE_URL` vào API.
2. Xác nhận MSW **không** có trong production bundle: `grep -rl "msw" tableqr-guest/dist/` → không ra gì.
3. In mã QR ra giấy, dán lên bàn thật.
4. Điện thoại (mạng **4G**, không phải wifi) quét → gọi 2 món → gửi.
5. Tablet mở màn bếp: đơn hiện **< 2s, không refresh**.
6. Bếp bấm "Bắt đầu làm" → điện thoại khách thấy badge đổi "Đang làm" trong ≤ 10s.
7. Reset bàn → điện thoại khách thao tác tiếp → hiện "Phiên đã kết thúc".

## M8–M11 — SaaS đa quán, lifecycle và billing

```bash
cd tableqr-api && docker compose -f docker-compose.yml -f docker-compose.local.yml up -d api
docker compose run --rm migrate      # bat buoc sau moi migration moi
cd ..
bash tableqr-api/scripts/verify-tenant-isolation.sh
bash tableqr-api/scripts/verify-tenant-query-plans.sh
bash tableqr-api/scripts/verify-sse-ticket.sh
bash tableqr-api/scripts/verify-owner-registration.sh
bash tableqr-api/scripts/verify-entitlement-matrix.sh
bash tableqr-api/scripts/verify-billing-operations.sh
bash tableqr-api/scripts/verify-billing-backup-restore.sh
bash tableqr-api/scripts/load-test-tenants.sh
bash tableqr-api/scripts/verify-flow-01-guest-order.sh
```

`verify-entitlement-matrix.sh` tự đăng ký một quán riêng rồi ép `Subscription` qua đủ 5 trạng thái, nên không làm bẩn fixture Kim Thành/Hương Quê. Nó kiểm luôn: mọi controller có route ghi đều khai báo `@BillingAction`, copy `RESTAURANT_INACTIVE` đúng cho guest/staff/owner, đọc không bị chặn ở bất kỳ trạng thái nào, audit dunning không ghi trùng, và `SUSPENDED` không tự mở lại khi có tiền vào.

`verify-billing-operations.sh` chạy chuỗi vận hành `SA-12`: huỷ/bật lại gia hạn, webhook sandbox, replay sự kiện đã xử lý và sự kiện dở dang, đối soát thủ công (sai số tiền / đúng số tiền / trùng mã giao dịch), tạm ngưng và mở lại — kiểm audit sau từng bước. `verify-billing-backup-restore.sh` dump rồi restore sang database diễn tập và so cả checksum sáu bảng billing. `load-test-tenants.sh` chạy nhiều quán đồng thời, fail khi có 5xx hoặc dữ liệu chéo tenant; 429 được đếm riêng vì là chặn có chủ đích.

Endpoint `public/owner-registration` giới hạn 3 lần/giờ: `verify-entitlement-matrix.sh`, `verify-billing-operations.sh`, `verify-owner-registration.sh` và `load-test-tenants.sh` mỗi lần chạy dùng một lượt, nên restart container API để reset bộ đếm khi chạy cả nhóm.
